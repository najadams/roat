-- Migration 006: fix advance_to_next_task trigger to respect pre-set deadlines
-- If an admin has pre-set a deadline on a not_started task, don't overwrite it
-- when the previous task completes.

CREATE OR REPLACE FUNCTION advance_to_next_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at = NOW();
    UPDATE webinar_tasks
    SET
      status = 'in_progress',
      started_at = NOW(),
      deadline = CASE
                   WHEN deadline IS NULL  THEN calculate_working_day_deadline(NOW(), 5)
                   ELSE deadline  -- respect admin pre-set deadline
                 END
    WHERE
      webinar_id = NEW.webinar_id
      AND task_order = NEW.task_order + 1
      AND status = 'not_started';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
