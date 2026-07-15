-- Migration 016: Activity evidence attachments (Section D "Evidence (Photo/Link)")
-- Files live in a PRIVATE Supabase Storage bucket named 'evidence'; this table
-- records the metadata + storage path. Downloads use short-lived signed URLs.

CREATE TABLE activity_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT,
  mime_type     TEXT,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_activity ON activity_attachments(activity_id);

ALTER TABLE activity_attachments ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read attachment rows (mirrors activity visibility;
-- the file bytes are still gated behind signed URLs / storage policies below).
CREATE POLICY "Authenticated read attachments"
ON activity_attachments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Officers and admins may attach evidence.
CREATE POLICY "Officers and admins insert attachments"
ON activity_attachments FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('zonal_officer', 'regional_admin'))
);

CREATE POLICY "Officers and admins delete attachments"
ON activity_attachments FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('zonal_officer', 'regional_admin'))
);

-- ── Storage bucket ──────────────────────────────────────────────────────────
-- Create the private bucket (or create it in the dashboard: Storage → New bucket
-- → name "evidence", Public = OFF).
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload to and read from the evidence bucket.
CREATE POLICY "Authenticated upload evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL);
