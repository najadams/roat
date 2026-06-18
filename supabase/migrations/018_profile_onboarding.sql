-- Track whether an invited user has completed first-login password setup.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

UPDATE profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE onboarding_completed_at IS NULL;
