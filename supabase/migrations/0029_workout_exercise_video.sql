-- =========================================================
-- MIGRATION 0029 — Vídeo de execução por exercício
-- Link do YouTube que o paciente abre no app para ver a execução.
-- =========================================================

ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS video_url TEXT;
