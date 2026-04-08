CREATE TABLE activity_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zonal_office  zonal_office NOT NULL,
  activity_type activity_type NOT NULL,
  period_type   TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_year   SMALLINT NOT NULL,
  period_value  SMALLINT NOT NULL,  -- month 1–12, quarter 1–4, or 0 for annual
  target_count  INT NOT NULL CHECK (target_count > 0),
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zonal_office, activity_type, period_type, period_year, period_value)
);

ALTER TABLE activity_targets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read targets
CREATE POLICY "Authenticated users view targets"
ON activity_targets FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only regional admins can insert / update / delete
CREATE POLICY "Admins manage targets"
ON activity_targets FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'regional_admin')
);

CREATE TRIGGER activity_targets_updated_at
  BEFORE UPDATE ON activity_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
