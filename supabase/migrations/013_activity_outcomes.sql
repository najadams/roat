-- Migration 013: Investment outcome fields on activities
-- Captures the quantitative impact of an activity so the reports page can
-- surface investment value and jobs created (the "Investment Impact" report).
-- All nullable / optional — existing rows are unaffected.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS investment_amount   NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS investment_currency TEXT,
  ADD COLUMN IF NOT EXISTS jobs_created        INTEGER;

-- Guard rails matching the form validation
ALTER TABLE activities
  ADD CONSTRAINT activities_investment_amount_nonneg
    CHECK (investment_amount IS NULL OR investment_amount >= 0),
  ADD CONSTRAINT activities_jobs_created_nonneg
    CHECK (jobs_created IS NULL OR jobs_created >= 0);

-- Helps the reports aggregation skip rows with no recorded investment
CREATE INDEX IF NOT EXISTS idx_activities_investment
  ON activities (investment_amount)
  WHERE investment_amount IS NOT NULL AND deleted_at IS NULL;
