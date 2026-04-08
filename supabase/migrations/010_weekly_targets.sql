-- Allow 'weekly' as a valid period_type for activity_targets.
-- Weekly targets are the canonical storage unit; monthly/quarterly/annual
-- totals are derived by the application aggregation layer.
-- period_value for weekly = ISO week number (1–53).

ALTER TABLE activity_targets
  DROP CONSTRAINT activity_targets_period_type_check;

ALTER TABLE activity_targets
  ADD CONSTRAINT activity_targets_period_type_check
  CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual'));
