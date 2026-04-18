-- =========================================================
-- PACIENTES APP — SCHEMA INICIAL
-- 8 tabelas com RLS, FKs CASCADE, índices, seed e triggers.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PATIENTS
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  whatsapp_phone TEXT,
  birth_date DATE,
  sex TEXT CHECK (sex IN ('M', 'F', 'outro')),
  objective TEXT,
  health_history TEXT,
  plan_type TEXT DEFAULT 'avulso' CHECK (plan_type IN ('avulso', 'mensal')),
  plan_value DECIMAL(10,2),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_admin_all" ON patients FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "patients_self_select" ON patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "patients_self_update" ON patients FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  next_appointment TIMESTAMPTZ,
  notes TEXT,
  meal_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_admin_all" ON appointments FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "appointments_patient_select" ON appointments FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- 3. PROGRESS_RECORDS
CREATE TABLE progress_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg DECIMAL(5,2),
  waist_cm DECIMAL(5,2),
  hip_cm DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE progress_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_admin_all" ON progress_records FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "progress_patient_select" ON progress_records FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- 4. PAYMENTS (paciente NÃO acessa)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  due_date DATE,
  amount DECIMAL(10,2) NOT NULL,
  method TEXT CHECK (method IN ('pix', 'cartao', 'dinheiro', 'transferencia', 'boleto')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'atrasado')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_admin_all" ON payments FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 5. QUESTIONNAIRE_QUESTIONS
CREATE TABLE questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_num INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'text' CHECK (question_type IN ('text', 'number', 'scale', 'choice')),
  options JSONB,
  is_numeric_chart BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_authenticated_read" ON questionnaire_questions FOR SELECT
  USING (auth.role() = 'authenticated' AND active = TRUE);
CREATE POLICY "questions_admin_manage" ON questionnaire_questions FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 6. QUESTIONNAIRE_RESPONSES
CREATE TABLE questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questionnaire_questions(id) ON DELETE RESTRICT,
  schedule_id UUID,
  response_text TEXT,
  response_number DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "responses_admin_all" ON questionnaire_responses FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "responses_patient_select" ON questionnaire_responses FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
CREATE POLICY "responses_patient_insert" ON questionnaire_responses FOR INSERT
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- 7. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'questionnaire_due_soon','questionnaire_overdue','patient_questionnaire_late',
    'payment_overdue','appointment_reminder','system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','whatsapp','both')),
  related_patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  related_entity_id UUID,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_status TEXT CHECK (whatsapp_status IN ('pending','sent','failed','delivered','read')),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_self_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_self_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_admin_all" ON notifications FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 8. QUESTIONNAIRE_SCHEDULE
CREATE TABLE questionnaire_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue','skipped')),
  reminder_d2_sent BOOLEAN DEFAULT FALSE,
  reminder_d1_sent BOOLEAN DEFAULT FALSE,
  reminder_d3_sent BOOLEAN DEFAULT FALSE,
  reminder_d7_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (patient_id, due_date)
);
ALTER TABLE questionnaire_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_admin_all" ON questionnaire_schedule FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "schedule_patient_select" ON questionnaire_schedule FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
CREATE POLICY "schedule_patient_update" ON questionnaire_schedule FOR UPDATE
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

ALTER TABLE questionnaire_responses
  ADD CONSTRAINT fk_responses_schedule
  FOREIGN KEY (schedule_id) REFERENCES questionnaire_schedule(id) ON DELETE SET NULL;

-- ÍNDICES
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_active ON patients(active) WHERE active = TRUE;
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(date DESC);
CREATE INDEX idx_progress_patient ON progress_records(patient_id);
CREATE INDEX idx_progress_date ON progress_records(patient_id, date DESC);
CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date) WHERE status IN ('pendente','atrasado');
CREATE INDEX idx_responses_patient ON questionnaire_responses(patient_id);
CREATE INDEX idx_responses_question ON questionnaire_responses(question_id);
CREATE INDEX idx_responses_created ON questionnaire_responses(created_at DESC);
CREATE INDEX idx_responses_schedule ON questionnaire_responses(schedule_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;
CREATE INDEX idx_schedule_patient ON questionnaire_schedule(patient_id);
CREATE INDEX idx_schedule_due ON questionnaire_schedule(due_date) WHERE status = 'pending';
CREATE INDEX idx_schedule_overdue ON questionnaire_schedule(status, due_date)
  WHERE status IN ('pending','overdue');

-- TRIGGERS
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION create_next_questionnaire_schedule() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.status := 'completed';
    INSERT INTO questionnaire_schedule (patient_id, due_date, status)
    VALUES (NEW.patient_id, NEW.due_date + INTERVAL '15 days', 'pending')
    ON CONFLICT (patient_id, due_date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_next AFTER UPDATE ON questionnaire_schedule
  FOR EACH ROW EXECUTE FUNCTION create_next_questionnaire_schedule();

CREATE OR REPLACE FUNCTION create_initial_schedule() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO questionnaire_schedule (patient_id, due_date, status)
  VALUES (NEW.id, CURRENT_DATE + INTERVAL '15 days', 'pending');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patient_first_schedule AFTER INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION create_initial_schedule();

CREATE OR REPLACE FUNCTION mark_overdue_schedules() RETURNS void AS $$
BEGIN
  UPDATE questionnaire_schedule SET status = 'overdue'
    WHERE status = 'pending' AND due_date < CURRENT_DATE;
  UPDATE payments SET status = 'atrasado'
    WHERE status = 'pendente' AND due_date IS NOT NULL AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
-- SELECT cron.schedule('mark-overdue', '0 6 * * *', 'SELECT mark_overdue_schedules()');

-- SEED perguntas
INSERT INTO questionnaire_questions (order_num, question_text, question_type, is_numeric_chart) VALUES
  (1, 'Qual seu peso atual (kg)?', 'number', TRUE),
  (2, 'Como você avalia sua aderência ao plano alimentar esta quinzena? (1-10)', 'scale', TRUE),
  (3, 'Sentiu fome excessiva em algum momento?', 'text', FALSE),
  (4, 'Praticou atividade física conforme orientado?', 'choice', FALSE),
  (5, 'Como está seu nível de energia? (1-10)', 'scale', TRUE),
  (6, 'Teve dificuldades com algum alimento ou refeição?', 'text', FALSE),
  (7, 'Algo que gostaria de ajustar no plano?', 'text', FALSE);
