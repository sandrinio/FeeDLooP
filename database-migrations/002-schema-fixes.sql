-- Schema fixes for missing columns and enum values
-- Migration 002: Fix missing columns and enum inconsistencies

-- 1. Add missing columns to fl_reports table
ALTER TABLE fl_reports ADD COLUMN IF NOT EXISTS browser_info JSON;
ALTER TABLE fl_reports ADD COLUMN IF NOT EXISTS page_url TEXT;

-- 2. Add missing column to fl_attachments table
ALTER TABLE fl_attachments ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 3. Update report_type enum to include 'feature'
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'feature';

-- 4. Update report_status enum to include 'new'
ALTER TYPE report_status ADD VALUE IF NOT EXISTS 'new';

-- 5. Update file_url for existing attachments (set to file_path for now)
UPDATE fl_attachments SET file_url = file_path WHERE file_url IS NULL;

-- 6. Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'fl_reports'
AND table_schema = 'public'
AND column_name IN ('browser_info', 'page_url')
ORDER BY column_name;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'fl_attachments'
AND table_schema = 'public'
AND column_name = 'file_url'
ORDER BY column_name;

-- 7. Verify enum values
SELECT unnest(enum_range(NULL::report_type)) AS report_type_values;
SELECT unnest(enum_range(NULL::report_status)) AS report_status_values;