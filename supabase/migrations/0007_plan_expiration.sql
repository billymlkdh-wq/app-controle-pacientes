-- =========================================================
-- MIGRATION 0007 — Expiração de plano + desativação automática do paciente
-- Regras:
--   • Admin recebe alerta quando um contrato ativo está a <= 30 dias do vencimento
--     (uma vez por contrato, controlado por expiration_alert_sent).
--   • Contratos ativos com end_date < hoje viram 'encerrado' e geram notif admin.
--   • Pacientes sem nenhum contrato ativo (mas com histórico) viram inativos;
--     reativam se um novo contrato ativo aparecer.
-- =========================================================

-- 1) Amplia CHECK de patients.plan_type pra bater com a UI de contratos
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_plan_type_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_plan_type_check
  CHECK (plan_type IN ('avulso','mensal','trimestral','semestral','anual'));

-- 2) Amplia CHECK de notifications.type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'questionnaire_due_soon','questionnaire_overdue','patient_questionnaire_late',
    'payment_overdue','appointment_reminder','system',
    'plan_expiring_soon','plan_expired'
  ));

-- 3) Flag pra evitar duplicar alerta de 30 dias no mesmo contrato
ALTER TABLE plan_contracts
  ADD COLUMN IF NOT EXISTS expiration_alert_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- 4) Função idempotente — chamar diariamente (edge function / cron / admin)
CREATE OR REPLACE FUNCTION public.check_plan_expirations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id UUID;
  rec RECORD;
  alerts_sent INT := 0;
  expired_count INT := 0;
  deactivated_count INT := 0;
  reactivated_count INT := 0;
BEGIN
  SELECT id INTO admin_id
    FROM auth.users
    WHERE (raw_user_meta_data->>'role') = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

  -- (a) Alertas de 30 dias antes (end_date entre hoje e hoje+30, ainda ativo, flag off)
  FOR rec IN
    SELECT c.id, c.patient_id, c.end_date, p.name
    FROM plan_contracts c
    JOIN patients p ON p.id = c.patient_id
    WHERE c.status = 'ativo'
      AND c.expiration_alert_sent = FALSE
      AND c.end_date >= CURRENT_DATE
      AND c.end_date - CURRENT_DATE <= 30
  LOOP
    IF admin_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id, type, title, message, channel,
        related_patient_id, related_entity_id
      ) VALUES (
        admin_id,
        'plan_expiring_soon',
        'Plano prestes a vencer: ' || rec.name,
        'O plano de ' || rec.name || ' vence em ' ||
          to_char(rec.end_date, 'DD/MM/YYYY') || ' (' ||
          (rec.end_date - CURRENT_DATE) || ' dia(s)).',
        'in_app',
        rec.patient_id,
        rec.id
      );
      alerts_sent := alerts_sent + 1;
    END IF;
    UPDATE plan_contracts SET expiration_alert_sent = TRUE WHERE id = rec.id;
  END LOOP;

  -- (b) Contratos vencidos → encerrado + notif
  FOR rec IN
    SELECT c.id, c.patient_id, c.end_date, p.name
    FROM plan_contracts c
    JOIN patients p ON p.id = c.patient_id
    WHERE c.status = 'ativo' AND c.end_date < CURRENT_DATE
  LOOP
    UPDATE plan_contracts SET status = 'encerrado' WHERE id = rec.id;
    expired_count := expired_count + 1;
    IF admin_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id, type, title, message, channel,
        related_patient_id, related_entity_id
      ) VALUES (
        admin_id,
        'plan_expired',
        'Plano encerrado: ' || rec.name,
        'O plano de ' || rec.name || ' venceu em ' ||
          to_char(rec.end_date, 'DD/MM/YYYY') || ' e foi encerrado automaticamente.',
        'in_app',
        rec.patient_id,
        rec.id
      );
    END IF;
  END LOOP;

  -- (c) Desativar pacientes sem contratos ativos (mas que já tiveram algum contrato)
  WITH to_deactivate AS (
    UPDATE patients p SET active = FALSE
     WHERE active = TRUE
       AND EXISTS (SELECT 1 FROM plan_contracts c WHERE c.patient_id = p.id)
       AND NOT EXISTS (SELECT 1 FROM plan_contracts c WHERE c.patient_id = p.id AND c.status = 'ativo')
    RETURNING p.id
  )
  SELECT COUNT(*) INTO deactivated_count FROM to_deactivate;

  -- (d) Reativar pacientes que ganharam contrato ativo depois
  WITH to_reactivate AS (
    UPDATE patients p SET active = TRUE
     WHERE active = FALSE
       AND EXISTS (SELECT 1 FROM plan_contracts c WHERE c.patient_id = p.id AND c.status = 'ativo')
    RETURNING p.id
  )
  SELECT COUNT(*) INTO reactivated_count FROM to_reactivate;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'alerts_sent', alerts_sent,
    'expired_count', expired_count,
    'deactivated_count', deactivated_count,
    'reactivated_count', reactivated_count
  );
END;
$$;

-- 5) Permissão mínima (RLS continua protegendo tabelas)
GRANT EXECUTE ON FUNCTION public.check_plan_expirations() TO authenticated, service_role;
