-- =========================================================
-- MIGRATION 0004 — Contratos de plano + parcelas (installments)
-- - Tabela plan_contracts (1 contrato = 1 "venda" de plano)
-- - Extensão de payments: contract_id + installment_num
-- - Generator helper: gerar parcelas a partir de um contrato
-- =========================================================

-- ---------- 1. TABELA plan_contracts ----------
CREATE TABLE IF NOT EXISTS plan_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('avulso','mensal','trimestral','semestral','anual')),
  total_value DECIMAL(10,2) NOT NULL,
  installments_count INT NOT NULL CHECK (installments_count BETWEEN 1 AND 36),
  start_date DATE NOT NULL,   -- vencimento da 1ª parcela
  end_date DATE NOT NULL,     -- vencimento da última parcela
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','cancelado')),
  notes TEXT,
  renewed_from_id UUID REFERENCES plan_contracts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_contracts_patient ON plan_contracts(patient_id);
CREATE INDEX IF NOT EXISTS idx_plan_contracts_status ON plan_contracts(status);

ALTER TABLE plan_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_contracts_admin_all" ON plan_contracts;
CREATE POLICY "plan_contracts_admin_all" ON plan_contracts FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ---------- 2. PAYMENTS: contract_id + installment_num ----------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES plan_contracts(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_num INT;
-- Permite 'date' ser nula quando a parcela ainda está pendente (data de pagamento efetivo)
ALTER TABLE payments ALTER COLUMN date DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);

-- ---------- 3. TRIGGER updated_at em plan_contracts ----------
CREATE OR REPLACE FUNCTION touch_plan_contracts_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_contracts_touch ON plan_contracts;
CREATE TRIGGER trg_plan_contracts_touch
  BEFORE UPDATE ON plan_contracts
  FOR EACH ROW EXECUTE FUNCTION touch_plan_contracts_updated_at();
