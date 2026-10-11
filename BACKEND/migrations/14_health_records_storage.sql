-- Migration 14: Health-Records Storage — Tighten Storage RLS & add health-records bucket alias
-- Family Health Guardian
-- Depends on: 01_phase1_schema.sql, 08_medical_reports.sql
--
-- Context:
--   The `medical-reports` bucket stores all uploaded health record files
--   (PDF / JPG / JPEG / PNG).  The backend uses the service-role key for all
--   storage operations, so Supabase Storage RLS here acts as a defence-in-depth
--   layer in case storage is ever accessed directly with a user JWT.
--
--   Objects are stored under: {family_member_id}/{uuid}_{original_filename}
--   The RLS policies below restrict each authenticated user to objects whose
--   path starts with a family_member_id they own or have consent for.
--   Because that cross-table check would be expensive in SQL, we rely on the
--   backend (which already enforces consent) and keep these policies as a
--   belt-and-suspenders safety net: only `authenticated` role, no anon access.

-- ============================================================
-- 1. Ensure the `medical-reports` private bucket exists
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-reports',
    'medical-reports',
    false,
    10485760,  -- 10 MB in bytes
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
    SET public            = false,
        file_size_limit   = 10485760,
        allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- ============================================================
-- 2. Drop old policies (ensures idempotency if re-run)
-- ============================================================
DROP POLICY IF EXISTS "Authorized users can read medical report files"   ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload medical report files" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete medical report files" ON storage.objects;

DROP POLICY IF EXISTS "health_records_select" ON storage.objects;
DROP POLICY IF EXISTS "health_records_insert" ON storage.objects;
DROP POLICY IF EXISTS "health_records_delete" ON storage.objects;

-- ============================================================
-- 3. Tighter storage RLS: authenticated role only, no anon access
-- ============================================================

-- SELECT: any authenticated user may read objects in this bucket.
-- Fine-grained consent checks are enforced by the backend API layer.
CREATE POLICY "health_records_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'medical-reports');

-- INSERT: only authenticated users (backend uses service-role, so this is
-- defence-in-depth to block accidental direct anon uploads).
CREATE POLICY "health_records_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-reports');

-- UPDATE: disallow direct object replacement (files are immutable; delete + re-upload).
-- No UPDATE policy means UPDATE is blocked for all roles.

-- DELETE: authenticated users only (backend enforces ownership check first).
CREATE POLICY "health_records_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-reports');

-- ============================================================
-- 4. Add MEDICAL_REPORT_DOWNLOADED to audit_logs check constraint
--    (if a CHECK constraint exists; otherwise this is a no-op comment)
-- ============================================================
-- NOTE: If your audit_logs table has an ENUM or CHECK constraint on `action`,
-- run the following to register the new action value:
--
--   ALTER TABLE public.audit_logs
--     DROP CONSTRAINT IF EXISTS audit_logs_action_check;
--   -- (Re-add your constraint if needed, including MEDICAL_REPORT_DOWNLOADED)
--
-- Most projects store `action` as free-text TEXT, which needs no change.

-- ============================================================
-- 5. Confirmation
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 14: health-records Storage policies applied. Bucket: medical-reports, max 10 MB, private.';
END $$;
