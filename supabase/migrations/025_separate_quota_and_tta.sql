-- Migration 025: Track Quota and Technology Transfer Agreements separately.
--
-- Existing technology_transfer_agreement rows remain TTAs because the legacy
-- combined category does not contain enough information to classify them as
-- Quota records safely. New Quota records use the dedicated enum value.

ALTER TYPE activity_type
  ADD VALUE IF NOT EXISTS 'quota' BEFORE 'technology_transfer_agreement';

-- The old weekly category grouped Monitoring, Outreach, and TTAs. Preserve its
-- saved target as the Monitoring & Outreach target; Quota and TTA targets start
-- unset so administrators can define them independently.
UPDATE weekly_category_targets
SET category_key = 'monitoring_outreach'
WHERE category_key = 'monitoring_tta';
