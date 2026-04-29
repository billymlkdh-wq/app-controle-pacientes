-- Atualiza image_url da questão Escala de Bristol para usar SVG local
-- em vez do link do Google Drive que estava servindo foto incorreta
UPDATE questionnaire_questions
SET image_url = '/bristol-scale.svg'
WHERE order_num = 5
  AND question_text ILIKE '%fezes%';
