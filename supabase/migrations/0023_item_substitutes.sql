-- Substitutos POR ITEM do plano alimentar.
-- Permite: dentro de um item ("1 Porção de arroz"), listar opções equivalentes
-- que o paciente pode escolher no lugar ("ou 1 Porção de batata", "ou 1 xícara de macarrão").
CREATE TABLE IF NOT EXISTS meal_plan_item_substitutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES meal_plan_items(id) ON DELETE CASCADE,
  food_id BIGINT REFERENCES food_catalog(id),
  custom_description TEXT,
  quantity_g NUMERIC(8,2) NOT NULL,
  household_measure TEXT,
  measure_label TEXT,
  measure_grams NUMERIC(8,2),
  measure_qty NUMERIC(8,3),
  energy_kcal NUMERIC(8,2),
  protein_g NUMERIC(8,3),
  lipid_g NUMERIC(8,3),
  carb_g NUMERIC(8,3),
  fiber_g NUMERIC(8,3),
  order_num INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (food_id IS NOT NULL OR custom_description IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_mpi_subs_item ON meal_plan_item_substitutes(item_id, order_num);

ALTER TABLE meal_plan_item_substitutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpi_subs_admin_all" ON meal_plan_item_substitutes FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "mpi_subs_patient_read" ON meal_plan_item_substitutes FOR SELECT
  TO authenticated
  USING (item_id IN (
    SELECT i.id FROM meal_plan_items i
    JOIN meal_plan_meals mm ON mm.id = i.meal_id
    JOIN meal_plans mp ON mp.id = mm.plan_id
    WHERE mp.active = TRUE
    AND mp.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  ));
