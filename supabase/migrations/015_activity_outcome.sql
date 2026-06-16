-- Migration 015: Per-activity narrative outcome (Section D "Outcome" column)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome TEXT;
