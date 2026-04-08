-- Migration 009: Add pending_alert_sent_at to activities
-- Used by the check-pending-activities Edge Function to avoid duplicate alerts.
-- When an activity is alerted, this timestamp is set.
-- If the activity is later resolved (status changes), the column remains set
-- (no need to re-alert the same stale record).

ALTER TABLE activities ADD COLUMN IF NOT EXISTS pending_alert_sent_at TIMESTAMPTZ;

-- Schedule the Edge Function via pg_cron (run in Supabase SQL editor after deploying the function):
--
-- SELECT cron.schedule(
--   'check-pending-activities',
--   '0 7 * * 1-5',  -- 7:00 AM UTC, Monday–Friday
--   $$
--     SELECT net.http_post(
--       url := 'https://kkvqbxenetickwvlkekk.supabase.co/functions/v1/check-pending-activities',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--         'Content-Type', 'application/json'
--       )
--     )
--   $$
-- );
