-- Paciente marca refeição como feita + opcional foto.
-- Dispara XP (patient_points) + fica visível pro admin.
CREATE TABLE IF NOT EXISTS meal_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  photo_url TEXT,
  notes TEXT,
  xp_awarded INTEGER DEFAULT 0,
  UNIQUE (meal_id, patient_id, completed_at)
);
CREATE INDEX IF NOT EXISTS idx_meal_completions_patient ON meal_completions(patient_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_completions_meal ON meal_completions(meal_id);

ALTER TABLE meal_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_completions_admin_all" ON meal_completions FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "meal_completions_patient_own" ON meal_completions FOR ALL
  TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Bucket p/ fotos de refeição (privado, paciente upload+ler own + admin lê tudo)
INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "meal-photos patient upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'meal-photos'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM patients WHERE user_id = auth.uid())
  );
CREATE POLICY "meal-photos patient read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'meal-photos'
    AND (
      (storage.foldername(name))[1] IN (SELECT id::text FROM patients WHERE user_id = auth.uid())
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    )
  );
