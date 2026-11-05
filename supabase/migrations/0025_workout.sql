-- Treino do paciente:
-- plano → dias (Treino A/B/C) → exercícios → séries (aquecimento/preparatória/válida + reps)
-- Logs do paciente: carga + reps feitas por série por dia.
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wp_patient ON workout_plans(patient_id, active);

CREATE TABLE IF NOT EXISTS workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wd_plan ON workout_days(plan_id, order_num);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  rest_seconds INTEGER,
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_we_day ON workout_exercises(day_id, order_num);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_type TEXT NOT NULL CHECK (set_type IN ('aquecimento','preparatoria','valida')),
  reps TEXT NOT NULL,                 -- "10", "8-12", "até falha"
  target_load_kg NUMERIC(6,2),
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_exercise ON workout_sets(exercise_id, order_num);

CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES workout_sets(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  performed_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date,
  load_kg NUMERIC(6,2),
  reps_done INTEGER,
  notes TEXT,
  UNIQUE (set_id, patient_id, performed_date)
);
CREATE INDEX IF NOT EXISTS idx_wl_patient ON workout_logs(patient_id, performed_date DESC);
CREATE INDEX IF NOT EXISTS idx_wl_set_date ON workout_logs(set_id, performed_date DESC);

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Admin all + paciente own ativo
CREATE POLICY "wp_admin_all" ON workout_plans FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "wp_patient_read" ON workout_plans FOR SELECT TO authenticated
  USING (active = TRUE AND patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "wd_admin_all" ON workout_days FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "wd_patient_read" ON workout_days FOR SELECT TO authenticated
  USING (plan_id IN (SELECT id FROM workout_plans WHERE active = TRUE
         AND patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())));

CREATE POLICY "we_admin_all" ON workout_exercises FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "we_patient_read" ON workout_exercises FOR SELECT TO authenticated
  USING (day_id IN (SELECT d.id FROM workout_days d JOIN workout_plans p ON p.id = d.plan_id
         WHERE p.active = TRUE AND p.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())));

CREATE POLICY "ws_admin_all" ON workout_sets FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "ws_patient_read" ON workout_sets FOR SELECT TO authenticated
  USING (exercise_id IN (SELECT e.id FROM workout_exercises e JOIN workout_days d ON d.id = e.day_id
         JOIN workout_plans p ON p.id = d.plan_id
         WHERE p.active = TRUE AND p.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())));

CREATE POLICY "wl_admin_all" ON workout_logs FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "wl_patient_own" ON workout_logs FOR ALL TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION touch_workout_plan() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_wp_touch BEFORE UPDATE ON workout_plans
  FOR EACH ROW EXECUTE FUNCTION touch_workout_plan();
