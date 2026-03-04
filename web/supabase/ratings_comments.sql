-- ============================================================
-- Ratings & Comments migration for Jipange na Kura
-- Run once in Supabase → SQL Editor
-- ============================================================

-- 1. Add ward column to current_leaders (if not already present)
ALTER TABLE current_leaders ADD COLUMN IF NOT EXISTS ward text;

-- 2. Denormalised stats columns (kept up to date by triggers below)
ALTER TABLE current_leaders ADD COLUMN IF NOT EXISTS avg_rating   numeric(3,2);
ALTER TABLE current_leaders ADD COLUMN IF NOT EXISTS rating_count int DEFAULT 0;
ALTER TABLE current_leaders ADD COLUMN IF NOT EXISTS comment_count int DEFAULT 0;

-- ── leader_ratings ───────────────────────────────────────────
-- One vote per anonymous session per leader (upsert on conflict)
CREATE TABLE IF NOT EXISTS leader_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id   uuid NOT NULL REFERENCES current_leaders(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (leader_id, session_id)
);

ALTER TABLE leader_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ratings"
  ON leader_ratings FOR SELECT USING (true);
CREATE POLICY "Anon insert ratings"
  ON leader_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update ratings"
  ON leader_ratings FOR UPDATE USING (true);

-- ── leader_comments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leader_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id     uuid NOT NULL REFERENCES current_leaders(id) ON DELETE CASCADE,
  session_id    text NOT NULL,
  display_name  text,
  body          text NOT NULL,
  rating        smallint CHECK (rating BETWEEN 1 AND 5),
  flagged       boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE leader_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read comments"
  ON leader_comments FOR SELECT USING (NOT flagged);
CREATE POLICY "Anon insert comments"
  ON leader_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon flag comments"
  ON leader_comments FOR UPDATE USING (true);

-- ── Trigger: keep avg_rating + rating_count up to date ───────
CREATE OR REPLACE FUNCTION update_leader_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE current_leaders SET
    avg_rating   = (SELECT AVG(rating)::numeric(3,2)
                    FROM leader_ratings WHERE leader_id = NEW.leader_id),
    rating_count = (SELECT COUNT(*)
                    FROM leader_ratings WHERE leader_id = NEW.leader_id)
  WHERE id = NEW.leader_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_rating_change ON leader_ratings;
CREATE TRIGGER on_rating_change
  AFTER INSERT OR UPDATE ON leader_ratings
  FOR EACH ROW EXECUTE FUNCTION update_leader_rating_stats();

-- ── Trigger: keep comment_count up to date ───────────────────
CREATE OR REPLACE FUNCTION update_leader_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE current_leaders SET
    comment_count = (SELECT COUNT(*)
                     FROM leader_comments
                     WHERE leader_id = NEW.leader_id AND NOT flagged)
  WHERE id = NEW.leader_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_change ON leader_comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT ON leader_comments
  FOR EACH ROW EXECUTE FUNCTION update_leader_comment_count();
