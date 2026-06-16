-- Migration 014: Weekly office reports (Section A officer context + Section C narrative)
-- One row per zonal office per week-ending date. Holds the qualitative parts of the
-- weekly report (highlights/achievements, challenges, narrative summary). The
-- quantitative Section B / Section D are derived from `activities` at render time.

CREATE TABLE weekly_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zonal_office      zonal_office NOT NULL,
  week_ending       DATE NOT NULL,
  officer_name      TEXT,
  key_highlights    TEXT,   -- Section C: engagements & achievements
  challenges        TEXT,   -- Section C: challenges
  narrative_summary TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  updated_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zonal_office, week_ending)
);

CREATE INDEX idx_weekly_reports_zone_week ON weekly_reports(zonal_office, week_ending);

CREATE TRIGGER weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Officers see/manage their own zone; admins all; viewers read-only.
CREATE POLICY "Officers view own zone weekly reports"
ON weekly_reports FOR SELECT
USING (
  zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins and viewers view all weekly reports"
ON weekly_reports FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('regional_admin', 'viewer'))
);

CREATE POLICY "Officers insert own zone weekly reports"
ON weekly_reports FOR INSERT
WITH CHECK (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer')
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'regional_admin'
);

CREATE POLICY "Officers update own zone weekly reports"
ON weekly_reports FOR UPDATE
USING (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer')
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'regional_admin'
);
