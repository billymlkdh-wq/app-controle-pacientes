-- =========================================================
-- MIGRATION 0005 — Forma de pagamento do contrato
-- avista          → 1 parcela (valor total pago de uma vez)
-- pix_parcelado   → N parcelas via PIX
-- credito_parcelado → N parcelas no cartão de crédito
-- =========================================================

ALTER TABLE plan_contracts
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('avista', 'pix_parcelado', 'credito_parcelado'));

-- Opcional: default em contratos antigos
UPDATE plan_contracts SET payment_method = 'pix_parcelado' WHERE payment_method IS NULL;
