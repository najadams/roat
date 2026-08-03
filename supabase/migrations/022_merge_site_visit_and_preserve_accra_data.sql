-- Migration 022: Retire the duplicate Monitoring / Site Visit choice without
-- deleting or recreating activity records.
--
-- Existing site_visit rows are relabelled as outreach_promotional in place.
-- Accra's legacy free-text rows are then classified as accra_other, retaining
-- their descriptions in activities.detail. Target rows are moved in place; if
-- both legacy and retained targets exist for the same period, their counts are
-- combined into the retained row before the legacy row is removed.

BEGIN;

CREATE TEMP TABLE _argus_activity_content_before ON COMMIT DROP AS
SELECT
  id,
  to_jsonb(activities) - 'activity_type' AS unchanged_content
FROM activities
WHERE activity_type = 'site_visit'
   OR (zonal_office = 'accra' AND activity_type = 'outreach_promotional');

CREATE TEMP TABLE _argus_migration_totals_before ON COMMIT DROP AS
SELECT
  (SELECT COUNT(*) FROM activities) AS activity_rows,
  (SELECT COALESCE(SUM(target_count), 0) FROM activity_targets) AS target_total;

-- These audit triggers would otherwise change updated_at/updated_by during a
-- classification-only migration. Disabling USER triggers keeps every field
-- except activity_type byte-for-byte unchanged.
ALTER TABLE activities DISABLE TRIGGER USER;

UPDATE activities
SET activity_type = 'outreach_promotional'
WHERE activity_type = 'site_visit';

UPDATE activities
SET activity_type = 'accra_other'
WHERE zonal_office = 'accra'
  AND activity_type = 'outreach_promotional';

ALTER TABLE activities ENABLE TRIGGER USER;

-- Merge only genuine target conflicts, retaining the already-current row.
UPDATE activity_targets AS retained
SET target_count = retained.target_count + legacy.target_count
FROM activity_targets AS legacy
WHERE retained.activity_type = 'outreach_promotional'
  AND legacy.activity_type = 'site_visit'
  AND retained.zonal_office = legacy.zonal_office
  AND retained.period_type = legacy.period_type
  AND retained.period_year = legacy.period_year
  AND retained.period_value = legacy.period_value;

DELETE FROM activity_targets AS legacy
WHERE legacy.activity_type = 'site_visit'
  AND EXISTS (
    SELECT 1
    FROM activity_targets AS retained
    WHERE retained.activity_type = 'outreach_promotional'
      AND retained.zonal_office = legacy.zonal_office
      AND retained.period_type = legacy.period_type
      AND retained.period_year = legacy.period_year
      AND retained.period_value = legacy.period_value
  );

UPDATE activity_targets
SET activity_type = 'outreach_promotional'
WHERE activity_type = 'site_visit';

DO $$
DECLARE
  before_totals RECORD;
  current_activity_rows BIGINT;
  current_target_total BIGINT;
BEGIN
  SELECT * INTO before_totals FROM _argus_migration_totals_before;
  SELECT COUNT(*) INTO current_activity_rows FROM activities;
  SELECT COALESCE(SUM(target_count), 0) INTO current_target_total FROM activity_targets;

  IF current_activity_rows <> before_totals.activity_rows THEN
    RAISE EXCEPTION 'Activity row count changed during activity type migration';
  END IF;

  IF current_target_total <> before_totals.target_total THEN
    RAISE EXCEPTION 'Total target value changed during activity type migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM _argus_activity_content_before AS snapshot
    LEFT JOIN activities AS activity USING (id)
    WHERE activity.id IS NULL
       OR (to_jsonb(activity) - 'activity_type') IS DISTINCT FROM snapshot.unchanged_content
  ) THEN
    RAISE EXCEPTION 'Non-category activity data changed during activity type migration';
  END IF;

  IF EXISTS (SELECT 1 FROM activities WHERE activity_type = 'site_visit')
     OR EXISTS (SELECT 1 FROM activity_targets WHERE activity_type = 'site_visit') THEN
    RAISE EXCEPTION 'Legacy site_visit values remain after migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM activities
    WHERE zonal_office = 'accra'
      AND activity_type = 'outreach_promotional'
  ) THEN
    RAISE EXCEPTION 'Legacy Accra free-text rows were not classified as Other';
  END IF;
END;
$$;

COMMIT;
