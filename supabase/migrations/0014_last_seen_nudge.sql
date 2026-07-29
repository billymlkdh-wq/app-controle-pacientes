-- Rastreio de último acesso ao app + controle de nudge de inatividade
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_nudge_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_patients_last_seen ON patients (last_seen_at);
