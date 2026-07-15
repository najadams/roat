-- Migration 017: Explicit weekly targets for the weekly-report Section B categories.
-- Stored at the report's grouped-category grain (e.g. "monitoring_tta"), per office
-- per week-ending. When absent, the weekly report falls back to the derived value
-- (quarterly target ÷ weeks-in-quarter).

CREATE TABLE weekly_category_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zonal_office zonal_office NOT NULL,
  week_ending  DATE NOT NULL,
  category_key TEXT NOT NULL,
  target_count INT NOT NULL CHECK (target_count >= 0),
  created_by   UUID NOT NULL REFERENCES profiles(id),
  updated_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zonal_office, week_ending, category_key)
);

CREATE INDEX idx_weekly_cat_targets_zone_week
  ON weekly_category_targets(zonal_office, week_ending);

CREATE TRIGGER weekly_category_targets_updated_at
  BEFORE UPDATE ON weekly_category_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE weekly_category_targets ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user. Manage: officers (own zone) + admins (all).
CREATE POLICY "Authenticated read weekly targets"
ON weekly_category_targets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Officers and admins insert weekly targets"
ON weekly_category_targets FOR INSERT
WITH CHECK (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer')
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'regional_admin'
);

CREATE POLICY "Officers and admins update weekly targets"
ON weekly_category_targets FOR UPDATE
USING (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer')
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'regional_admin'
);
