-- =========================================================
-- MIGRATION 0027 — Anamnese (questionário secundário)
-- Admin libera individualmente por paciente (cria a linha com released_at);
-- paciente responde uma vez (preenche answers + completed_at).
-- Perguntas ficam no código (lib/anamnesis/questions.ts);
-- aqui guardamos as respostas em JSONB, chaveadas pelo id da pergunta.
-- =========================================================

CREATE TABLE IF NOT EXISTS patient_anamnesis (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  form_version  INTEGER NOT NULL DEFAULT 1,
  answers       JSONB NOT NULL DEFAULT '{}'::jsonb,
  released_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE patient_anamnesis ENABLE ROW LEVEL SECURITY;

-- App grava via service role; políticas explícitas para leitura com user key.
DROP POLICY IF EXISTS anamnesis_admin_all ON patient_anamnesis;
CREATE POLICY anamnesis_admin_all ON patient_anamnesis
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data ->> 'role') = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (u.raw_app_meta_data ->> 'role') = 'admin'
    )
  );

DROP POLICY IF EXISTS anamnesis_patient_select ON patient_anamnesis;
CREATE POLICY anamnesis_patient_select ON patient_anamnesis
  FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
