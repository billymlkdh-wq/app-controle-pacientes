-- Função de busca em food_catalog com unaccent + similarity.
-- Resolve: acento (cafe == café), digitação parcial ("coxa" acha "Coxa"), ranking.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION search_food(
  q text,
  only_with_nutrition boolean DEFAULT false,
  lim int DEFAULT 20
)
RETURNS SETOF food_catalog
LANGUAGE sql STABLE AS $$
  SELECT *
  FROM food_catalog
  WHERE active
    AND (NOT only_with_nutrition OR needs_nutrition_scrape = false)
    AND unaccent(description) ILIKE '%' || unaccent(q) || '%'
  ORDER BY
    CASE source
      WHEN 'TACO' THEN 1
      WHEN 'TUCUNDUVA' THEN 2
      WHEN 'TBCA' THEN 3
      ELSE 4
    END,
    similarity(unaccent(description), unaccent(q)) DESC,
    length(description),
    description
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION search_food(text, boolean, int) TO authenticated;
