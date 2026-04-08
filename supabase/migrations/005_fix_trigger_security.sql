-- Fix: Add SECURITY DEFINER to trigger functions so they bypass RLS
-- when auto-inserting/updating webinar_tasks.

CREATE OR REPLACE FUNCTION create_webinar_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webinar_tasks (webinar_id, task_name, task_order, status)
  VALUES
    (NEW.id, 'notice_to_ministry_of_finance',     1, 'in_progress'),
    (NEW.id, 'contact_with_mission',              2, 'not_started'),
    (NEW.id, 'date_confirmation_with_mission',    3, 'not_started'),
    (NEW.id, 'flyer_distribution',               4, 'not_started'),
    (NEW.id, 'hosting_of_webinar',               5, 'not_started'),
    (NEW.id, 'webinar_report_and_leads_transfer', 6, 'not_started');

  UPDATE webinar_tasks
  SET
    started_at = NOW(),
    deadline = calculate_working_day_deadline(NOW(), 5)
  WHERE webinar_id = NEW.id AND task_order = 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION advance_to_next_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at = NOW();

    UPDATE webinar_tasks
    SET
      status = 'in_progress',
      started_at = NOW(),
      deadline = calculate_working_day_deadline(NOW(), 5)
    WHERE
      webinar_id = NEW.webinar_id
      AND task_order = NEW.task_order + 1
      AND status = 'not_started';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
