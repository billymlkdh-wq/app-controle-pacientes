-- Check-up semanal do admin com cada paciente.
-- Admin marca como feito (um por paciente por semana ISO).
CREATE TABLE IF NOT EXISTS patient_checkups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note       TEXT
);

CREATE INDEX IF NOT EXISTS idx_patient_checkups_patient_date
  ON patient_checkups (patient_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_checkups_checked_at
  ON patient_checkups (checked_at DESC);

ALTER TABLE patient_checkups ENABLE ROW LEVEL SECURITY;

-- Só o admin lê/escreve (app usa service role). Deixamos política explícita
-- para evitar erro de "sem política" caso alguém consulte com user key.
DROP POLICY IF EXISTS checkups_admin_all ON patient_checkups;
CREATE POLICY checkups_admin_all ON patient_checkups
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
