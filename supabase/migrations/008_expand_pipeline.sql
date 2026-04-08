-- Migration 008: Expand webinar task pipeline from 6 to 9 tasks
-- New tasks inserted after flyer_distribution (task 4):
--   5. obtaining_presenter_details
--   6. link_creation
--   7. confirmation_of_teams
-- Existing tasks 5 & 6 shift to 8 & 9.

-- Step 1: Add new enum values (cannot run inside a transaction)
ALTER TYPE webinar_task_name ADD VALUE IF NOT EXISTS 'obtaining_presenter_details';
ALTER TYPE webinar_task_name ADD VALUE IF NOT EXISTS 'link_creation';
ALTER TYPE webinar_task_name ADD VALUE IF NOT EXISTS 'confirmation_of_teams';

-- Step 2: Drop old check constraint, add new one allowing 1–9
ALTER TABLE webinar_tasks DROP CONSTRAINT webinar_tasks_task_order_check;
ALTER TABLE webinar_tasks ADD CONSTRAINT webinar_tasks_task_order_check
  CHECK (task_order BETWEEN 1 AND 9);

-- Step 3: Shift existing tasks 5 & 6 → 8 & 9
UPDATE webinar_tasks SET task_order = 8 WHERE task_name = 'hosting_of_webinar';
UPDATE webinar_tasks SET task_order = 9 WHERE task_name = 'webinar_report_and_leads_transfer';

-- Step 4: Insert 3 new tasks for all existing webinars
-- If flyer_distribution is already completed, backfill new tasks as completed too
INSERT INTO webinar_tasks (webinar_id, task_name, task_order, status)
SELECT
  w.id,
  vals.task_name::webinar_task_name,
  vals.task_order,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM webinar_tasks wt2
      WHERE wt2.webinar_id = w.id
        AND wt2.task_name = 'flyer_distribution'
        AND wt2.status = 'completed'
    ) THEN 'completed'::task_status
    ELSE 'not_started'::task_status
  END
FROM webinars w
CROSS JOIN (VALUES
  ('obtaining_presenter_details', 5),
  ('link_creation',               6),
  ('confirmation_of_teams',       7)
) AS vals(task_name, task_order)
WHERE w.deleted_at IS NULL
ON CONFLICT (webinar_id, task_name) DO NOTHING;

-- Step 5: Update v_webinar_progress view (/6 → /9)
CREATE OR REPLACE VIEW v_webinar_progress AS
SELECT
  w.id AS webinar_id,
  w.country,
  w.country_code,
  w.created_at,
  ROUND(
    (COUNT(*) FILTER (WHERE t.status = 'completed') * 100.0) / 9,
    0
  )::INT AS progress_pct,
  COUNT(*) FILTER (WHERE t.status = 'completed') AS tasks_completed,
  COUNT(*) FILTER (WHERE t.is_delayed = TRUE) AS tasks_delayed,
  BOOL_OR(t.is_delayed) AS has_delayed_tasks,
  MAX(t.task_order) FILTER (WHERE t.status = 'in_progress') AS current_task_order
FROM webinars w
LEFT JOIN webinar_tasks t ON t.webinar_id = w.id
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.country, w.country_code, w.created_at;

-- Step 6: Update create_webinar_tasks() trigger to insert all 9 tasks
CREATE OR REPLACE FUNCTION create_webinar_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webinar_tasks (webinar_id, task_name, task_order, status)
  VALUES
    (NEW.id, 'notice_to_ministry_of_finance',     1, 'in_progress'),
    (NEW.id, 'contact_with_mission',              2, 'not_started'),
    (NEW.id, 'date_confirmation_with_mission',    3, 'not_started'),
    (NEW.id, 'flyer_distribution',               4, 'not_started'),
    (NEW.id, 'obtaining_presenter_details',       5, 'not_started'),
    (NEW.id, 'link_creation',                    6, 'not_started'),
    (NEW.id, 'confirmation_of_teams',            7, 'not_started'),
    (NEW.id, 'hosting_of_webinar',               8, 'not_started'),
    (NEW.id, 'webinar_report_and_leads_transfer', 9, 'not_started');

  UPDATE webinar_tasks
  SET
    started_at = NOW(),
    deadline = calculate_working_day_deadline(NOW(), 5)
  WHERE webinar_id = NEW.id AND task_order = 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
