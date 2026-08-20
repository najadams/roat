-- Migration 023: Record the operational result of check-up calls.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS call_outcome TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activities_call_outcome_check'
  ) THEN
    ALTER TABLE activities
      ADD CONSTRAINT activities_call_outcome_check
      CHECK (
        call_outcome IS NULL OR (
          activity_type = 'checkup_call' AND
          call_outcome IN (
            'answered',
            'call_not_going_through',
            'number_does_not_exist'
          )
        )
      );
  END IF;
END;
$$;
