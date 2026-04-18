-- =========================================================
-- Migration 0002 — Rastreamento de message_id da Meta
-- Fix I2 (Vera Verificação): webhook precisa atualizar a
-- notificação correta via whatsapp_message_id em vez de heurística.
-- =========================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_whatsapp_message_id
  ON notifications(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Fix S3 (sugestão Vera): índice para filtro do webhook por status
CREATE INDEX IF NOT EXISTS idx_notifications_whatsapp_status
  ON notifications(whatsapp_status)
  WHERE whatsapp_status IS NOT NULL;
