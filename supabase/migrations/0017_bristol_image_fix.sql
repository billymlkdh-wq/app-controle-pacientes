-- A questão da Escala de Bristol voltou a apontar para uma imagem no Storage
-- que serve a foto errada. A migration 0009 não pegou porque filtrava por
-- order_num, que mudou. Aqui o filtro é só pelo texto da pergunta.
UPDATE questionnaire_questions
SET image_url = '/bristol-scale.png'
WHERE question_text ILIKE '%fezes%';
