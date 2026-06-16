-- Migration 012: Add Accra (head office) as a zonal office
-- Accra/Greater Accra is the head-office region. Regional admins log
-- head-office activities against it, and it is their default zone.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Run this statement on its own in the Supabase SQL editor.

ALTER TYPE zonal_office ADD VALUE IF NOT EXISTS 'accra';
