-- Migration 024: Account-synced progress for signed-in page tutorials.

CREATE TABLE IF NOT EXISTS user_tour_progress (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tour_id TEXT NOT NULL,
  tour_version INTEGER NOT NULL CHECK (tour_version > 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'skipped')),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tour_id)
);

ALTER TABLE user_tour_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tour progress"
ON user_tour_progress FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tour progress"
ON user_tour_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tour progress"
ON user_tour_progress FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON user_tour_progress TO authenticated;
