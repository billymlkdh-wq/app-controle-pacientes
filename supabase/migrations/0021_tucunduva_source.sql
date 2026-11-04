-- Adiciona TUCUNDUVA como fonte válida de alimentos no catálogo.
-- Dados: Tabela de Composição de Alimentos — Sonia Tucunduva Philippi, 2ª ed., 2002.
-- 1565 alimentos inseridos via REST (não via SQL — arquivo grande).
ALTER TABLE food_catalog DROP CONSTRAINT IF EXISTS food_catalog_source_check;
ALTER TABLE food_catalog
  ADD CONSTRAINT food_catalog_source_check
  CHECK (source IN ('TACO','TBCA','TUCUNDUVA','CUSTOM'));
