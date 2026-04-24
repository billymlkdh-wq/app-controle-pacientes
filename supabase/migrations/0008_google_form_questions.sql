-- =========================================================
-- MIGRATION 0008 — Questionário baseado no Google Form
--   "Programa de Aceleração de Resultados Rafael Bolson"
-- Adiciona: subtitle, image_url, tipo 'section' no enum
-- Substitui as 7 perguntas placeholder pelas 22 reais
-- =========================================================

-- 1. Novas colunas
ALTER TABLE questionnaire_questions
  ADD COLUMN IF NOT EXISTS subtitle TEXT;

ALTER TABLE questionnaire_questions
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Adicionar 'section' ao enum de tipos
ALTER TABLE questionnaire_questions
  DROP CONSTRAINT IF EXISTS questionnaire_questions_question_type_check;

ALTER TABLE questionnaire_questions
  ADD CONSTRAINT questionnaire_questions_question_type_check
  CHECK (question_type IN ('text', 'number', 'scale', 'choice', 'multiple_choice', 'section'));

-- 3. Limpar respostas e perguntas antigas
DELETE FROM questionnaire_responses;
DELETE FROM questionnaire_questions;

-- 4. Inserir perguntas do Google Form
-- options para scale: {"min":N,"max":N,"minLabel":"...","maxLabel":"..."}
-- options para choice/multiple_choice: ["opção 1","opção 2",...]
-- image_url: https://lh3.googleusercontent.com/d/{GOOGLE_DRIVE_FILE_ID}

INSERT INTO questionnaire_questions
  (order_num, question_text, subtitle, question_type, options, is_numeric_chart, allow_media, image_url)
VALUES

-- ── SEÇÃO 1: Alimentação e saúde intestinal ──────────────────────────────
(1,
 'Alimentação e saúde intestinal',
 NULL, 'section', NULL, FALSE, FALSE, NULL),

(2,
 'Que nota você daria para seu consumo de água?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"péssimo","maxLabel":"excelente"}',
 TRUE, FALSE, NULL),

(3,
 'Com que frequência você consumiu frutas na porção recomendada?',
 '1 = até 20% das vezes (raramente) · 2 = ocasionalmente (20–40%) · 3 = às vezes (40–60%) · 4 = a maior parte dos dias (60–80%) · 5 = mais de 90% dos dias',
 'scale',
 '{"min":1,"max":5,"minLabel":"raramente","maxLabel":"sempre"}',
 TRUE, FALSE, NULL),

(4,
 'Com que frequência você consumiu vegetais na porção recomendada?',
 '1 = até 20% das vezes (raramente) · 2 = ocasionalmente (20–40%) · 3 = às vezes (40–60%) · 4 = a maior parte dos dias (60–80%) · 5 = mais de 90% dos dias',
 'scale',
 '{"min":1,"max":5,"minLabel":"raramente","maxLabel":"sempre"}',
 TRUE, FALSE, NULL),

(5,
 'Qual tipo das suas fezes na média dos últimos 7 dias?',
 'Imagem retirada do site Webdiet.',
 'choice',
 '["Tipo 1 (bastante constipado)","Tipo 2 (constipado)","Tipo 3 (próximo do ideal)","Tipo 4 (ideal)","Tipo 5 (próximo do ideal)","Tipo 6 (intestino solto)","Tipo 7 (bastante solto)"]',
 FALSE, FALSE,
 'https://lh3.googleusercontent.com/d/1QJkJF86LxfDl3JhNK8xvK80G5-Fpik7sJQXsVPUMrPsp_Bo'),

(6,
 'Que nota você daria para seu consumo de bebidas alcoólicas?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"muito ruim","maxLabel":"excelente"}',
 TRUE, FALSE, NULL),

(7,
 'Com que frequência você está usando a balança de cozinha para controle de porções?',
 '1 = até 20% das vezes (raramente) · 2 = ocasionalmente (20–40%) · 3 = às vezes (40–60%) · 4 = a maior parte dos dias (60–80%) · 5 = mais de 90% dos dias',
 'scale',
 '{"min":1,"max":5,"minLabel":"raramente","maxLabel":"sempre"}',
 TRUE, FALSE, NULL),

(8,
 'Quantas vezes você saiu da dieta?',
 'Selecione o número de vezes que saiu da dieta (usou redução de danos, comeu algo improvisado no imprevisto, saiu por decisão própria, etc).',
 'choice',
 '["Nenhuma.","Uma a duas vezes.","Três a quatro vezes.","Mais de quatro vezes."]',
 FALSE, FALSE, NULL),

(9,
 'De 0 a 10, que nota você daria para sua alimentação durante a semana?',
 'De segunda a sexta-feira.',
 'scale',
 '{"min":0,"max":10,"minLabel":"não fiz nada","maxLabel":"fiz 100%"}',
 TRUE, FALSE, NULL),

(10,
 'De 0 a 10, que nota você daria para sua alimentação no final de semana?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"não fiz nada","maxLabel":"fiz 100%"}',
 TRUE, FALSE, NULL),

(11,
 'De 0 a 10, como está sua saciedade ao longo dos dias?',
 'Considere saciedade = ausência de fome entre as refeições.',
 'scale',
 '{"min":0,"max":10,"minLabel":"muita fome","maxLabel":"totalmente saciada(o)"}',
 TRUE, FALSE, NULL),

-- ── SEÇÃO 2: Hábitos e estilo de vida ───────────────────────────────────
(12,
 'Hábitos e estilo de vida',
 NULL, 'section', NULL, FALSE, FALSE, NULL),

(13,
 'Qual foi a frequência de treino na semana passada?',
 'Coloque apenas o número da quantidade de dias que treinou.',
 'choice',
 '["1 dia","2 dias","3 dias","4 dias","5 dias","6 dias","7 dias"]',
 FALSE, FALSE, NULL),

(14,
 'Qual foi sua percepção de esforço nos treinos?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"treinei leve","maxLabel":"treinei muito pesado"}',
 TRUE, FALSE, NULL),

(15,
 'Você conseguiu evoluir nos treinos?',
 'Aumentou carga e/ou número de repetições e/ou número de séries e/ou aumentou intensidade dos treinos cardiovasculares.',
 'choice',
 '["Sim.","Não."]',
 FALSE, FALSE, NULL),

(16,
 'Como está a qualidade e quantidade de sono?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"menos de 6h e dormindo mal","maxLabel":"pelo menos 7h e dormindo bem"}',
 TRUE, FALSE, NULL),

(17,
 'De 0 a 10, como está seu nível de ansiedade e/ou estresse?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"muito baixo","maxLabel":"muito alto"}',
 TRUE, FALSE, NULL),

-- ── SEÇÃO 3: Avaliação física ────────────────────────────────────────────
(18,
 'Avaliação física',
 NULL, 'section', NULL, FALSE, FALSE, NULL),

(19,
 'Peso atual:',
 'Se der quebrado, separe por pontos. Ex.: 72.5',
 'number', NULL,
 TRUE, FALSE,
 'https://lh3.googleusercontent.com/d/1crFy7vESwuTRYxkCH54OFGZFj9AffMAV4Rwl3gWg7ked_Pk'),

(20,
 'Circunferência de abdômen atual (colocar a fita métrica sob o umbigo e deixar a fita o mais linear possível por volta do tronco):',
 'Enviar a cada 30 dias! Colocar apenas o número em centímetros, use ponto se der quebrado.',
 'number', NULL,
 TRUE, FALSE, NULL),

(21,
 'Fotos atuais de frente, lado e costas — enviar via WhatsApp junto ao aviso de conclusão. Enviar a cada 30 dias!',
 'O envio é opcional, mas é interessante para termos mais um parâmetro avaliativo além do peso.',
 'choice',
 '["Vou enviar.","Não me sinto confortável."]',
 FALSE, TRUE,
 'https://lh3.googleusercontent.com/d/1Jzd0U2DnAmjEu0ztGDeYEVnn5hsqurL3vdkVCbvJ0ciYKSY'),

-- ── SEÇÃO 4: Mindset ─────────────────────────────────────────────────────
(22,
 'Mindset',
 NULL, 'section', NULL, FALSE, FALSE, NULL),

(23,
 'Quanto está sua motivação para a próxima semana?',
 NULL, 'scale',
 '{"min":0,"max":10,"minLabel":"muito baixa","maxLabel":"muito alta"}',
 TRUE, FALSE, NULL),

(24,
 'O quanto você está satisfeita(o) com seus progressos até aqui?',
 'Obs.: processo não é peso ou fotos, mas sim o seu progresso dentro dos processos do acompanhamento (sono, frequência de treino, frequência da dieta etc).',
 'scale',
 '{"min":0,"max":10,"minLabel":"nada satisfeita(o)","maxLabel":"muito satisfeita(o)"}',
 TRUE, FALSE, NULL),

(25,
 'Após preencher o formulário, o que você acredita que pode melhorar sobre sua rotina, alimentação e hábitos?',
 NULL, 'text', NULL, FALSE, FALSE, NULL),

(26,
 'Escreva com suas palavras um feedback sobre seus resultados e sua satisfação com o acompanhamento nutricional!',
 NULL, 'text', NULL, FALSE, FALSE, NULL);
