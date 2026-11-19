-- =========================================================
-- MIGRATION 0028 — Cálculo energético no plano alimentar
-- Guarda os parâmetros e o resultado do cálculo (Harris-Benedict ou
-- Mifflin-St Jeor × fator atividade) usado para definir a meta kcal.
-- Também guarda a altura do paciente, que não existia no cadastro.
-- =========================================================

ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS energy_calc JSONB;
ALTER TABLE patients   ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
