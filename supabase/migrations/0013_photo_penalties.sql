-- Photo proof for habit logs
ALTER TABLE patient_habit_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE patient_habit_logs ADD COLUMN IF NOT EXISTS photo_required BOOLEAN NOT NULL DEFAULT true;

-- Daily penalty tracking (prevents double-penalizing)
CREATE TABLE IF NOT EXISTS patient_penalty_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  penalty_date date       NOT NULL,
  task_type   text        NOT NULL,  -- 'water','steps','cardio','workout','questionnaire'
  xp_lost     integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, penalty_date, task_type)
);
ALTER TABLE patient_penalty_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "penalty_admin_all" ON patient_penalty_log FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
