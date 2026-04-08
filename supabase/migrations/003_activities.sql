-- Migration 003: Module A — Activities Table

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type activity_type NOT NULL,
  zonal_office zonal_office NOT NULL,

  -- Core fields
  date DATE NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  sector TEXT,
  detail TEXT,
  action_required TEXT,
  status activity_status NOT NULL DEFAULT 'pending',

  -- Audit fields
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX idx_activities_zone ON activities(zonal_office);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_zone_date ON activities(zonal_office, date);
CREATE INDEX idx_activities_not_deleted ON activities(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit trail trigger
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_set_updated_by
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Zonal officers see own zone"
ON activities FOR SELECT
USING (
  zonal_office = (
    SELECT zonal_office FROM profiles WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Admins see all activities"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Viewers see all activities"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'viewer'
  )
  AND deleted_at IS NULL
);

CREATE POLICY "Zonal officers can insert own zone"
ON activities FOR INSERT
WITH CHECK (
  zonal_office = (
    SELECT zonal_office FROM profiles WHERE id = auth.uid()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer'
);

CREATE POLICY "Admins can insert any activity"
ON activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
);

CREATE POLICY "Officers update own zone activities"
ON activities FOR UPDATE
USING (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer')
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'regional_admin'
);

-- Monthly summary view
CREATE VIEW v_monthly_activity_summary AS
SELECT
  zonal_office,
  activity_type,
  DATE_TRUNC('month', date)::DATE AS month,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending
FROM activities
WHERE deleted_at IS NULL
GROUP BY zonal_office, activity_type, DATE_TRUNC('month', date);

-- Quarterly summary view
CREATE VIEW v_quarterly_activity_summary AS
SELECT
  zonal_office,
  activity_type,
  DATE_TRUNC('quarter', date)::DATE AS quarter,
  EXTRACT(YEAR FROM date)::INT AS year,
  EXTRACT(QUARTER FROM date)::INT AS quarter_num,
  COUNT(*) AS total
FROM activities
WHERE deleted_at IS NULL
GROUP BY zonal_office, activity_type, DATE_TRUNC('quarter', date),
         EXTRACT(YEAR FROM date), EXTRACT(QUARTER FROM date);

-- Annual cumulative view
CREATE VIEW v_annual_cumulative_summary AS
SELECT
  activity_type,
  EXTRACT(YEAR FROM date)::INT AS year,
  COUNT(*) AS total,
  COUNT(DISTINCT zonal_office) AS zones_contributing
FROM activities
WHERE deleted_at IS NULL
GROUP BY activity_type, EXTRACT(YEAR FROM date);
