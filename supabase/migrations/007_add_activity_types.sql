-- Migration 007: Add SOP-compliant activity types
-- Run in Supabase SQL editor (NOT wrapped in BEGIN/COMMIT — ADD VALUE cannot be rolled back)

ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'investor_enquiry';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'investor_issue_resolution';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'official_correspondence';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'outreach_promotional';
