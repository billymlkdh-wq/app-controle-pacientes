-- Torna o envio de foto obrigatório em perguntas que aceitam mídia.
--
-- allow_media  = a pergunta aceita anexo
-- require_media = sem anexo, o questionário não pode ser enviado

ALTER TABLE questionnaire_questions
  ADD COLUMN IF NOT EXISTS require_media BOOLEAN NOT NULL DEFAULT FALSE;

-- Toda pergunta que hoje aceita mídia passa a exigir mídia.
-- Para voltar atrás em alguma, desmarque "Exigir foto" em /questionnaires/questions.
UPDATE questionnaire_questions
SET require_media = TRUE
WHERE allow_media = TRUE AND active = TRUE;

-- require_media só faz sentido junto de allow_media
ALTER TABLE questionnaire_questions
  DROP CONSTRAINT IF EXISTS questionnaire_questions_require_media_check;
ALTER TABLE questionnaire_questions
  ADD CONSTRAINT questionnaire_questions_require_media_check
  CHECK (NOT require_media OR allow_media);
