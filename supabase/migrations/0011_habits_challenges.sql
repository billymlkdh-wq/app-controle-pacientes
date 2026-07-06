-- Hábitos diários: metas por paciente
CREATE TABLE IF NOT EXISTS patient_habit_goals (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid        REFERENCES patients(id) ON DELETE CASCADE,  -- NULL = default global
  habit_type  text        NOT NULL,  -- 'water' | 'steps' | 'cardio' | 'workout'
  daily_goal  numeric     NOT NULL DEFAULT 0,
  unit        text        NOT NULL DEFAULT '',
  xp_reward   integer     NOT NULL DEFAULT 5,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, habit_type)
);
CREATE INDEX IF NOT EXISTS habit_goals_patient ON patient_habit_goals(patient_id);

-- Hábitos diários: registros
CREATE TABLE IF NOT EXISTS patient_habit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  habit_type   text        NOT NULL,
  value        numeric     NOT NULL DEFAULT 0,
  logged_date  date        NOT NULL DEFAULT CURRENT_DATE,
  note         text,
  auto_posted  boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habit_logs_patient_date ON patient_habit_logs(patient_id, logged_date);

-- Desafios criados pelo admin
CREATE TABLE IF NOT EXISTS patient_challenges (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text,
  challenge_type  text        NOT NULL DEFAULT 'steps',  -- 'steps' | 'water' | 'workout' | 'custom'
  target_value    numeric,
  unit            text,
  start_date      date        NOT NULL,
  end_date        date        NOT NULL,
  xp_reward       integer     NOT NULL DEFAULT 100,
  prize           text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Participantes dos desafios
CREATE TABLE IF NOT EXISTS patient_challenge_participants (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    uuid        NOT NULL REFERENCES patient_challenges(id) ON DELETE CASCADE,
  patient_id      uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  current_value   numeric     NOT NULL DEFAULT 0,
  completed_at    timestamptz,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, patient_id)
);
CREATE INDEX IF NOT EXISTS challenge_participants_challenge ON patient_challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS challenge_participants_patient   ON patient_challenge_participants(patient_id);

-- community_posts: adicionar post_type e source_id
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'manual';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS source_id uuid;

-- RLS
ALTER TABLE patient_habit_goals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_habit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_challenges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_goals_read" ON patient_habit_goals FOR SELECT USING (true);
CREATE POLICY "habit_goals_admin" ON patient_habit_goals FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "habit_logs_read" ON patient_habit_logs FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "habit_logs_insert" ON patient_habit_logs FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
);

CREATE POLICY "challenges_read"  ON patient_challenges FOR SELECT USING (true);
CREATE POLICY "challenges_admin" ON patient_challenges FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "challenge_participants_read"   ON patient_challenge_participants FOR SELECT USING (true);
CREATE POLICY "challenge_participants_manage" ON patient_challenge_participants FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Defaults globais de metas de hábitos
INSERT INTO patient_habit_goals (patient_id, habit_type, daily_goal, unit, xp_reward)
VALUES
  (NULL, 'water',   3,     'L',      10),
  (NULL, 'steps',   10000, 'passos', 8),
  (NULL, 'cardio',  1,     'sessão', 15),
  (NULL, 'workout', 1,     'treino', 20)
ON CONFLICT DO NOTHING;
