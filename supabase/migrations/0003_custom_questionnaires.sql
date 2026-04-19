-- =========================================================
-- MIGRATION 0003 — Planos estendidos + Questionários customizados
-- - Novos planos (trimestral, semestral, anual)
-- - Data inicial do ciclo quinzenal por paciente
-- - Perguntas multiple_choice + anexos de mídia
-- - Trigger de schedule respeita questionnaire_start_date
-- - Bucket Storage questionnaire-media + RLS
-- =========================================================

-- ---------- 1. PLAN TYPES ----------
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_plan_type_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_plan_type_check
  CHECK (plan_type IN ('avulso', 'mensal', 'trimestral', 'semestral', 'anual'));

-- ---------- 2. QUESTIONNAIRE START DATE ----------
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS questionnaire_start_date DATE;

-- ---------- 3. QUESTION TYPES + MEDIA FLAG ----------
ALTER TABLE questionnaire_questions DROP CONSTRAINT IF EXISTS questionnaire_questions_question_type_check;
ALTER TABLE questionnaire_questions
  ADD CONSTRAINT questionnaire_questions_question_type_check
  CHECK (question_type IN ('text', 'number', 'scale', 'choice', 'multiple_choice'));

ALTER TABLE questionnaire_questions
  ADD COLUMN IF NOT EXISTS allow_media BOOLEAN DEFAULT FALSE;

-- ---------- 4. MEDIA URLS ON RESPONSES ----------
ALTER TABLE questionnaire_responses
  ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Também permitimos que resposta armazene array de múltiplas opções escolhidas
ALTER TABLE questionnaire_responses
  ADD COLUMN IF NOT EXISTS response_options JSONB;

-- ---------- 5. UPDATE TRIGGER: use questionnaire_start_date ----------
CREATE OR REPLACE FUNCTION create_initial_schedule() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO questionnaire_schedule (patient_id, due_date, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.questionnaire_start_date, CURRENT_DATE) + INTERVAL '15 days',
    'pending'
  )
  ON CONFLICT (patient_id, due_date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular o schedule inicial quando questionnaire_start_date
-- for setada/alterada e ainda não houver schedule pendente para o paciente
CREATE OR REPLACE FUNCTION sync_schedule_on_start_date_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.questionnaire_start_date IS DISTINCT FROM OLD.questionnaire_start_date
     AND NEW.questionnaire_start_date IS NOT NULL THEN
    -- Remove schedules pendentes ainda não notificados/respondidos
    DELETE FROM questionnaire_schedule
      WHERE patient_id = NEW.id
        AND status = 'pending'
        AND completed_at IS NULL
        AND reminder_d2_sent = FALSE
        AND reminder_d1_sent = FALSE;
    -- Cria o novo schedule inicial baseado no start_date
    INSERT INTO questionnaire_schedule (patient_id, due_date, status)
    VALUES (NEW.id, NEW.questionnaire_start_date + INTERVAL '15 days', 'pending')
    ON CONFLICT (patient_id, due_date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_start_date_sync ON patients;
CREATE TRIGGER trg_patient_start_date_sync
  AFTER UPDATE OF questionnaire_start_date ON patients
  FOR EACH ROW EXECUTE FUNCTION sync_schedule_on_start_date_change();

-- ---------- 6. STORAGE BUCKET questionnaire-media ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'questionnaire-media',
  'questionnaire-media',
  FALSE,
  26214400, -- 25 MB
  ARRAY[
    'image/jpeg','image/png','image/webp','image/gif','image/heic',
    'video/mp4','video/quicktime','video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Paciente pode fazer upload em seu próprio "folder" (path = patient_id/<file>)
DROP POLICY IF EXISTS "questionnaire_media_patient_insert" ON storage.objects;
CREATE POLICY "questionnaire_media_patient_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'questionnaire-media'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM patients WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "questionnaire_media_patient_select" ON storage.objects;
CREATE POLICY "questionnaire_media_patient_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'questionnaire-media'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM patients WHERE user_id = auth.uid()
      )
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );

DROP POLICY IF EXISTS "questionnaire_media_admin_all" ON storage.objects;
CREATE POLICY "questionnaire_media_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'questionnaire-media' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK (bucket_id = 'questionnaire-media' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
