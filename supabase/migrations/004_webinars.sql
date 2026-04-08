-- Migration 004: Module B — Webinars & Tasks

-- Working day deadline calculator
CREATE OR REPLACE FUNCTION calculate_working_day_deadline(
  start_ts TIMESTAMPTZ,
  working_days INT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  result TIMESTAMPTZ := start_ts;
  days_added INT := 0;
BEGIN
  WHILE days_added < working_days LOOP
    result := result + INTERVAL '1 day';
    -- Skip Saturday (6) and Sunday (0)
    IF EXTRACT(DOW FROM result) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE webinars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  country_code CHAR(2),               -- ISO 3166-1 alpha-2 (e.g. 'FR' for France)
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE webinar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  task_name webinar_task_name NOT NULL,
  task_order SMALLINT NOT NULL CHECK (task_order BETWEEN 1 AND 6),
  status task_status NOT NULL DEFAULT 'not_started',

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,               -- started_at + 5 working days (set by trigger)
  is_delayed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Notes per task
  notes TEXT,
  completed_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(webinar_id, task_order),
  UNIQUE(webinar_id, task_name)
);

CREATE INDEX idx_webinar_tasks_webinar ON webinar_tasks(webinar_id);
CREATE INDEX idx_webinar_tasks_status ON webinar_tasks(status);
CREATE INDEX idx_webinar_tasks_delayed ON webinar_tasks(is_delayed) WHERE is_delayed = TRUE;

CREATE TRIGGER webinars_updated_at
  BEFORE UPDATE ON webinars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER webinar_tasks_updated_at
  BEFORE UPDATE ON webinar_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create 6 tasks when a webinar is inserted
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_webinar_created
  AFTER INSERT ON webinars
  FOR EACH ROW EXECUTE FUNCTION create_webinar_tasks();

-- Advance to next task when one is completed
CREATE OR REPLACE FUNCTION advance_to_next_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_completed
  BEFORE UPDATE ON webinar_tasks
  FOR EACH ROW EXECUTE FUNCTION advance_to_next_task();

-- Enable RLS
ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users view webinars"
ON webinars FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
);

CREATE POLICY "Officers and admins create webinars"
ON webinars FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('zonal_officer', 'regional_admin')
  )
);

CREATE POLICY "Admins can update webinars"
ON webinars FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
);

CREATE POLICY "Authenticated users view tasks"
ON webinar_tasks FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Officers and admins update tasks"
ON webinar_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('zonal_officer', 'regional_admin')
  )
);

-- Webinar progress view
CREATE VIEW v_webinar_progress AS
SELECT
  w.id AS webinar_id,
  w.country,
  w.country_code,
  w.created_at,
  ROUND(
    (COUNT(*) FILTER (WHERE t.status = 'completed') * 100.0) / 6,
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

-- Full task detail view
CREATE VIEW v_webinar_task_detail AS
SELECT
  w.id AS webinar_id,
  w.country,
  t.id AS task_id,
  t.task_name,
  t.task_order,
  t.status,
  t.started_at,
  t.completed_at,
  t.deadline,
  t.is_delayed,
  t.notes,
  CASE
    WHEN t.status = 'in_progress' AND NOW() > t.deadline THEN TRUE
    ELSE FALSE
  END AS currently_overdue
FROM webinars w
JOIN webinar_tasks t ON t.webinar_id = w.id
WHERE w.deleted_at IS NULL
ORDER BY w.country, t.task_order;
