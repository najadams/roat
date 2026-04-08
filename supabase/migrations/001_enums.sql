-- Migration 001: Enums
-- Run in Supabase SQL editor

-- Zonal offices
CREATE TYPE zonal_office AS ENUM (
  'kumasi', 'tamale', 'takoradi', 'techiman', 'ho', 'koforidua'
);

-- User roles
CREATE TYPE user_role AS ENUM (
  'zonal_officer', 'regional_admin', 'viewer'
);

-- Activity types (Module A)
CREATE TYPE activity_type AS ENUM (
  'new_registration',
  'renewal',
  'facilitation_done',
  'site_visit',
  'technology_transfer_agreement',
  'stakeholder_engagement',
  'media_interview',
  'checkup_call',
  'iomp_update'
);

-- Activity status
CREATE TYPE activity_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled'
);

-- Webinar task names (Module B) — must follow this order
CREATE TYPE webinar_task_name AS ENUM (
  'notice_to_ministry_of_finance',
  'contact_with_mission',
  'date_confirmation_with_mission',
  'flyer_distribution',
  'hosting_of_webinar',
  'webinar_report_and_leads_transfer'
);

-- Webinar task status
CREATE TYPE task_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'delayed'
);
