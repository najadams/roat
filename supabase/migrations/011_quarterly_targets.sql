-- Revert to quarterly-only target storage.
-- Targets are set once per quarter; weekly/monthly views derive
-- cumulative progress toward the quarterly benchmark.

-- Drop the old constraint first
ALTER TABLE activity_targets
  DROP CONSTRAINT activity_targets_period_type_check;

-- Remove any weekly targets BEFORE re-adding the constraint
DELETE FROM activity_targets WHERE period_type = 'weekly';

-- Now safely add the new constraint (no weekly rows remain)
ALTER TABLE activity_targets
  ADD CONSTRAINT activity_targets_period_type_check
  CHECK (period_type IN ('monthly', 'quarterly', 'annual'));
