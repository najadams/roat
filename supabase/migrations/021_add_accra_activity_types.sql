-- Migration 021: Add the Accra-specific activity categories.
--
-- Keep this migration limited to enum additions. PostgreSQL requires newly
-- added enum values to be committed before a later migration can write them.

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_webinars_with_mission';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_webinars_for_business_groups_chamber';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_capacity_building_for_missions';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_engagements_events';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_mission_support';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_capacity_building_for_regional_offices';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_orientation_for_regional_offices';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'accra_other';
