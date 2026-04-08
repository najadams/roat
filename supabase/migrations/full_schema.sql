-- ============================================================
-- Argus — Full Schema (consolidated, run once on a fresh project)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE zonal_office AS ENUM (
  'kumasi', 'tamale', 'takoradi', 'techiman', 'ho', 'koforidua'
);

CREATE TYPE user_role AS ENUM (
  'zonal_officer', 'regional_admin', 'viewer'
);

CREATE TYPE activity_type AS ENUM (
  'new_registration',
  'renewal',
  'facilitation_done',
  'site_visit',
  'technology_transfer_agreement',
  'stakeholder_engagement',
  'media_interview',
  'checkup_call',
  'iomp_update',
  'investor_enquiry',
  'investor_issue_resolution',
  'official_correspondence',
  'outreach_promotional'
);

CREATE TYPE activity_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE webinar_task_name AS ENUM (
  'notice_to_ministry_of_finance',
  'contact_with_mission',
  'date_confirmation_with_mission',
  'flyer_distribution',
  'hosting_of_webinar',
  'webinar_report_and_leads_transfer'
);

CREATE TYPE task_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'delayed'
);


-- ────────────────────────────────────────────────────────────
-- 2. SHARED FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at on any table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Working day deadline calculator (skips weekends)
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
    IF EXTRACT(DOW FROM result) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- NOTE: get_my_role() is defined AFTER the profiles table below,
-- because it references public.profiles.


-- ────────────────────────────────────────────────────────────
-- 3. PROFILES
-- ────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  zonal_office  zonal_office,
  role          user_role NOT NULL DEFAULT 'zonal_officer',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Security-definer helper: returns the calling user's role without
-- triggering RLS recursion on the profiles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Uses get_my_role() to avoid recursive self-subquery
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (get_my_role() = 'regional_admin');

CREATE POLICY "Admins can manage profiles"
ON profiles FOR ALL
USING (get_my_role() = 'regional_admin');

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 4. MODULE A — ACTIVITIES
-- ────────────────────────────────────────────────────────────

CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type   activity_type NOT NULL,
  zonal_office    zonal_office NOT NULL,
  date            DATE NOT NULL,
  company_name    TEXT NOT NULL,
  location        TEXT NOT NULL,
  telephone       TEXT,
  email           TEXT,
  sector          TEXT,
  detail          TEXT,
  action_required TEXT,
  status          activity_status NOT NULL DEFAULT 'pending',
  created_by      UUID NOT NULL REFERENCES profiles(id),
  updated_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_activities_zone       ON activities(zonal_office);
CREATE INDEX idx_activities_type       ON activities(activity_type);
CREATE INDEX idx_activities_date       ON activities(date);
CREATE INDEX idx_activities_zone_date  ON activities(zonal_office, date);
CREATE INDEX idx_activities_not_deleted ON activities(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zonal officers see own zone"
ON activities FOR SELECT
USING (
  zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
);

CREATE POLICY "Admins see all activities"
ON activities FOR SELECT
USING (get_my_role() = 'regional_admin' AND deleted_at IS NULL);

CREATE POLICY "Viewers see all activities"
ON activities FOR SELECT
USING (get_my_role() = 'viewer' AND deleted_at IS NULL);

CREATE POLICY "Zonal officers can insert own zone"
ON activities FOR INSERT
WITH CHECK (
  zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
  AND get_my_role() = 'zonal_officer'
);

CREATE POLICY "Admins can insert any activity"
ON activities FOR INSERT
WITH CHECK (get_my_role() = 'regional_admin');

CREATE POLICY "Officers update own zone activities"
ON activities FOR UPDATE
USING (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND get_my_role() = 'zonal_officer')
  OR get_my_role() = 'regional_admin'
);

-- Views
CREATE VIEW v_monthly_activity_summary AS
SELECT
  zonal_office, activity_type,
  DATE_TRUNC('month', date)::DATE AS month,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending
FROM activities WHERE deleted_at IS NULL
GROUP BY zonal_office, activity_type, DATE_TRUNC('month', date);

CREATE VIEW v_quarterly_activity_summary AS
SELECT
  zonal_office, activity_type,
  DATE_TRUNC('quarter', date)::DATE AS quarter,
  EXTRACT(YEAR FROM date)::INT AS year,
  EXTRACT(QUARTER FROM date)::INT AS quarter_num,
  COUNT(*) AS total
FROM activities WHERE deleted_at IS NULL
GROUP BY zonal_office, activity_type, DATE_TRUNC('quarter', date),
         EXTRACT(YEAR FROM date), EXTRACT(QUARTER FROM date);

CREATE VIEW v_annual_cumulative_summary AS
SELECT
  activity_type,
  EXTRACT(YEAR FROM date)::INT AS year,
  COUNT(*) AS total,
  COUNT(DISTINCT zonal_office) AS zones_contributing
FROM activities WHERE deleted_at IS NULL
GROUP BY activity_type, EXTRACT(YEAR FROM date);


-- ────────────────────────────────────────────────────────────
-- 5. MODULE A — ACTIVITY TARGETS
-- ────────────────────────────────────────────────────────────

CREATE TABLE activity_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zonal_office  zonal_office NOT NULL,
  activity_type activity_type NOT NULL,
  period_type   TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  period_year   SMALLINT NOT NULL,
  period_value  SMALLINT NOT NULL,
  target_count  INT NOT NULL CHECK (target_count > 0),
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zonal_office, activity_type, period_type, period_year, period_value)
);

ALTER TABLE activity_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view targets"
ON activity_targets FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage targets"
ON activity_targets FOR ALL
USING (get_my_role() = 'regional_admin');

CREATE TRIGGER activity_targets_updated_at
  BEFORE UPDATE ON activity_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────────────────────────
-- 6. MODULE B — WEBINARS & TASKS
-- ────────────────────────────────────────────────────────────

CREATE TABLE webinars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country     TEXT NOT NULL,
  country_code CHAR(2),
  notes       TEXT,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE webinar_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id   UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  task_name    webinar_task_name NOT NULL,
  task_order   SMALLINT NOT NULL CHECK (task_order BETWEEN 1 AND 6),
  status       task_status NOT NULL DEFAULT 'not_started',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline     TIMESTAMPTZ,
  is_delayed   BOOLEAN NOT NULL DEFAULT FALSE,
  notes        TEXT,
  completed_by UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(webinar_id, task_order),
  UNIQUE(webinar_id, task_name)
);

CREATE INDEX idx_webinar_tasks_webinar ON webinar_tasks(webinar_id);
CREATE INDEX idx_webinar_tasks_status  ON webinar_tasks(status);
CREATE INDEX idx_webinar_tasks_delayed ON webinar_tasks(is_delayed) WHERE is_delayed = TRUE;

CREATE TRIGGER webinars_updated_at
  BEFORE UPDATE ON webinars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER webinar_tasks_updated_at
  BEFORE UPDATE ON webinar_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create all 6 tasks when a webinar is inserted
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
  SET started_at = NOW(),
      deadline   = calculate_working_day_deadline(NOW(), 5)
  WHERE webinar_id = NEW.id AND task_order = 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_webinar_created
  AFTER INSERT ON webinars
  FOR EACH ROW EXECUTE FUNCTION create_webinar_tasks();

-- Advance to next task; respect admin-pre-set deadlines
CREATE OR REPLACE FUNCTION advance_to_next_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at = NOW();
    UPDATE webinar_tasks
    SET
      status     = 'in_progress',
      started_at = NOW(),
      deadline   = CASE
                     WHEN deadline IS NULL THEN calculate_working_day_deadline(NOW(), 5)
                     ELSE deadline
                   END
    WHERE
      webinar_id = NEW.webinar_id
      AND task_order = NEW.task_order + 1
      AND status = 'not_started';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_task_completed
  BEFORE UPDATE ON webinar_tasks
  FOR EACH ROW EXECUTE FUNCTION advance_to_next_task();

ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view webinars"
ON webinars FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Officers and admins create webinars"
ON webinars FOR INSERT
WITH CHECK (get_my_role() IN ('zonal_officer', 'regional_admin'));

CREATE POLICY "Admins can update webinars"
ON webinars FOR UPDATE
USING (get_my_role() = 'regional_admin');

CREATE POLICY "Authenticated users view tasks"
ON webinar_tasks FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Officers and admins update tasks"
ON webinar_tasks FOR UPDATE
USING (get_my_role() IN ('zonal_officer', 'regional_admin'));

-- Views
CREATE VIEW v_webinar_progress AS
SELECT
  w.id AS webinar_id,
  w.country,
  w.country_code,
  w.created_at,
  ROUND((COUNT(*) FILTER (WHERE t.status = 'completed') * 100.0) / 6, 0)::INT AS progress_pct,
  COUNT(*) FILTER (WHERE t.status = 'completed') AS tasks_completed,
  COUNT(*) FILTER (WHERE t.is_delayed = TRUE) AS tasks_delayed,
  BOOL_OR(t.is_delayed) AS has_delayed_tasks,
  MAX(t.task_order) FILTER (WHERE t.status = 'in_progress') AS current_task_order
FROM webinars w
LEFT JOIN webinar_tasks t ON t.webinar_id = w.id
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.country, w.country_code, w.created_at;

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
