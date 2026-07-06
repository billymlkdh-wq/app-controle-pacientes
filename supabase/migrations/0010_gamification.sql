-- ── Gamification: pontos, streaks, conquistas, metas, comunidade ─────────────

-- Pontos acumulados por ação
CREATE TABLE IF NOT EXISTS patient_points (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  amount     integer     NOT NULL,
  reason     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_points_patient_idx ON patient_points(patient_id);

-- Streak de questionários respondidos
CREATE TABLE IF NOT EXISTS patient_streaks (
  patient_id      uuid        PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  current_streak  integer     NOT NULL DEFAULT 0,
  longest_streak  integer     NOT NULL DEFAULT 0,
  last_completed_at timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Conquistas (badges)
CREATE TABLE IF NOT EXISTS patient_achievements (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  achievement_key text     NOT NULL,
  earned_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, achievement_key)
);
CREATE INDEX IF NOT EXISTS patient_achievements_patient_idx ON patient_achievements(patient_id);

-- Metas individuais definidas pelo nutricionista
CREATE TABLE IF NOT EXISTS patient_goals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  description   text,
  target_value  numeric,
  current_value numeric     DEFAULT 0,
  unit          text,
  goal_type     text        NOT NULL DEFAULT 'numeric', -- numeric | habit | binary
  deadline      date,
  status        text        NOT NULL DEFAULT 'active',  -- active | completed | cancelled
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_goals_patient_idx ON patient_goals(patient_id);

-- Comunidade: posts dos pacientes
CREATE TABLE IF NOT EXISTS community_posts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  content      text        NOT NULL,
  is_anonymous boolean     NOT NULL DEFAULT false,
  is_visible   boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_posts_created_idx ON community_posts(created_at DESC);

-- Reações nos posts (1 por paciente por post)
CREATE TABLE IF NOT EXISTS community_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  patient_id uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reaction   text        NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, patient_id)
);
CREATE INDEX IF NOT EXISTS community_reactions_post_idx ON community_reactions(post_id);

-- RLS: pacientes veem só seus próprios pontos/metas/conquistas; posts visíveis para todos os pacientes
ALTER TABLE patient_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_streaks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_goals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions  ENABLE ROW LEVEL SECURITY;

-- Pontos: paciente lê os próprios, admin lê tudo
CREATE POLICY "patient_points_read" ON patient_points FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "patient_points_insert_admin" ON patient_points FOR INSERT WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Streaks
CREATE POLICY "patient_streaks_read" ON patient_streaks FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "patient_streaks_all_admin" ON patient_streaks FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Conquistas
CREATE POLICY "patient_achievements_read" ON patient_achievements FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "patient_achievements_insert_admin" ON patient_achievements FOR INSERT WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Metas: paciente lê as suas, admin gerencia tudo
CREATE POLICY "patient_goals_read" ON patient_goals FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "patient_goals_admin" ON patient_goals FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Comunidade: pacientes veem posts visíveis, admin vê tudo
CREATE POLICY "community_posts_read" ON community_posts FOR SELECT USING (
  is_visible = true
  OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
CREATE POLICY "community_posts_insert" ON community_posts FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
);
CREATE POLICY "community_posts_update_admin" ON community_posts FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- Reações
CREATE POLICY "community_reactions_read" ON community_reactions FOR SELECT USING (true);
CREATE POLICY "community_reactions_insert" ON community_reactions FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
);
CREATE POLICY "community_reactions_delete" ON community_reactions FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM patients WHERE id = patient_id)
);
