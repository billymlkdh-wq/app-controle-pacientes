-- Adiciona colunas estruturadas de medida caseira no item do plano.
-- Permite reconstruir o estado do editor (label + grams/unit + qty).
ALTER TABLE meal_plan_items
  ADD COLUMN IF NOT EXISTS measure_label TEXT,
  ADD COLUMN IF NOT EXISTS measure_grams NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS measure_qty NUMERIC(8, 3);
