-- =========================================================
-- MIGRATION 0018 — Plano Alimentar / Prescrição de Dieta
--
-- Modelo inspirado em WebDiet: 2 métodos (por alimentos com
-- cálculo macro, e qualitativo com texto livre).
--
-- Tabelas:
--   food_catalog       — base de alimentos (TACO + TBCA merged)
--   meal_plans         — header do plano por paciente
--   meal_plan_meals    — refeições do plano (café, almoço, …)
--   meal_plan_items    — alimentos dentro de uma refeição
-- =========================================================

-- Extensão de busca por trigram (precisa existir antes do índice GIN)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── food_catalog ────────────────────────────────────────────
CREATE TABLE food_catalog (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL CHECK (source IN ('TACO','TBCA','CUSTOM')),
  external_id   TEXT,                 -- id original (ex: "BRC0001C" na TBCA)
  description   TEXT NOT NULL,        -- "Abacate, polpa, in natura"
  category      TEXT,                 -- "Frutas e derivados"
  scientific_name TEXT,
  -- Composição por 100 g (base de cálculo padrão)
  energy_kcal   NUMERIC(8,2),
  protein_g     NUMERIC(8,3),
  lipid_g       NUMERIC(8,3),
  carb_g        NUMERIC(8,3),
  fiber_g       NUMERIC(8,3),
  sodium_mg     NUMERIC(8,2),
  -- Métodos de medida caseira (array de objetos JSON):
  -- [{"label": "fatia média", "grams": 25}, {"label": "colher sopa", "grams": 15}]
  household_measures JSONB DEFAULT '[]'::jsonb,
  -- Quando TRUE, é só inventário (sem valores nutricionais ainda)
  needs_nutrition_scrape BOOLEAN DEFAULT FALSE,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source, external_id)
);

CREATE INDEX idx_food_catalog_desc_trgm ON food_catalog USING gin (description gin_trgm_ops);
CREATE INDEX idx_food_catalog_source ON food_catalog(source) WHERE active;

ALTER TABLE food_catalog ENABLE ROW LEVEL SECURITY;

-- Admin tem acesso total
CREATE POLICY "food_catalog_admin_all" ON food_catalog FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Qualquer usuário autenticado pode LER (necessário pro editor)
CREATE POLICY "food_catalog_read_all" ON food_catalog FOR SELECT
  TO authenticated
  USING (active = TRUE);


-- ── meal_plans ──────────────────────────────────────────────
CREATE TABLE meal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                     -- "Cardápio semanal de novembro"
  method      TEXT NOT NULL CHECK (method IN ('por_alimentos','qualitativo')),
  -- Para método qualitativo: texto livre do cardápio inteiro
  qualitative_text TEXT,
  -- Metas calóricas/macro (opcional, pra comparar prescrito vs target)
  target_kcal    NUMERIC(8,1),
  target_protein_g NUMERIC(8,1),
  target_lipid_g   NUMERIC(8,1),
  target_carb_g    NUMERIC(8,1),
  notes       TEXT,
  active      BOOLEAN DEFAULT TRUE,   -- FALSE = arquivado
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_meal_plans_patient ON meal_plans(patient_id, active);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plans_admin_all" ON meal_plans FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
-- Paciente vê planos ATIVOS dele
CREATE POLICY "meal_plans_patient_read" ON meal_plans FOR SELECT
  TO authenticated
  USING (
    active = TRUE
    AND patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );


-- ── meal_plan_meals ─────────────────────────────────────────
CREATE TABLE meal_plan_meals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- "Café da manhã", "Almoço"
  time_hhmm   TEXT,                    -- "07:30"
  order_num   INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_meal_plan_meals_plan ON meal_plan_meals(plan_id, order_num);

ALTER TABLE meal_plan_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plan_meals_admin_all" ON meal_plan_meals FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "meal_plan_meals_patient_read" ON meal_plan_meals FOR SELECT
  TO authenticated
  USING (plan_id IN (
    SELECT id FROM meal_plans WHERE active = TRUE
    AND patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  ));


-- ── meal_plan_items ─────────────────────────────────────────
CREATE TABLE meal_plan_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id       UUID NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  food_id       BIGINT REFERENCES food_catalog(id),  -- null se item de texto livre
  -- Fallback quando o alimento não está no catálogo
  custom_description TEXT,
  quantity_g    NUMERIC(8,2) NOT NULL,              -- peso em gramas
  household_measure TEXT,                            -- "1 colher de sopa"
  -- Snapshot dos nutrientes no momento da prescrição (evita recalcular quando a base muda)
  energy_kcal   NUMERIC(8,2),
  protein_g     NUMERIC(8,3),
  lipid_g       NUMERIC(8,3),
  carb_g        NUMERIC(8,3),
  fiber_g       NUMERIC(8,3),
  order_num     INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (food_id IS NOT NULL OR custom_description IS NOT NULL)
);
CREATE INDEX idx_meal_plan_items_meal ON meal_plan_items(meal_id, order_num);

ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_plan_items_admin_all" ON meal_plan_items FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "meal_plan_items_patient_read" ON meal_plan_items FOR SELECT
  TO authenticated
  USING (meal_id IN (
    SELECT m.id FROM meal_plan_meals m
    JOIN meal_plans p ON p.id = m.plan_id
    WHERE p.active = TRUE
    AND p.patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  ));


-- ── updated_at trigger no plan ──────────────────────────────
CREATE OR REPLACE FUNCTION touch_meal_plan() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meal_plans_touch BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION touch_meal_plan();

