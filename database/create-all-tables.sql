-- Complete Database Setup - Create All Tables Step by Step
-- Run each section separately to ensure proper creation

-- Step 1: Create required ENUM types first
DO $$ BEGIN
    -- Check and create user_role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'member');
    END IF;

    -- Check and create report_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
        CREATE TYPE report_type AS ENUM ('bug', 'initiative', 'feedback');
    END IF;

    -- Check and create report_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('active', 'archived');
    END IF;

    -- Check and create priority_level enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
END $$;

-- Step 2: Create fl_projects table
DROP TABLE IF EXISTS fl_projects CASCADE;

CREATE TABLE fl_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    integration_key VARCHAR(50) UNIQUE NOT NULL DEFAULT substring(replace(uuid_generate_v4()::text, '-', ''), 1, 32),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add name length validation for projects
ALTER TABLE fl_projects ADD CONSTRAINT valid_name_length
CHECK (char_length(name) >= 1 AND char_length(name) <= 100);

-- Step 3: Create fl_project_invitations table
DROP TABLE IF EXISTS fl_project_invitations CASCADE;

CREATE TABLE fl_project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    can_invite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prevent duplicate invitations
ALTER TABLE fl_project_invitations ADD CONSTRAINT unique_user_project
UNIQUE(user_id, project_id);

-- Step 4: Create fl_reports table
DROP TABLE IF EXISTS fl_reports CASCADE;

CREATE TABLE fl_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    type report_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'active',
    priority priority_level,
    reporter_email VARCHAR(255),
    reporter_name VARCHAR(100),
    url TEXT,
    user_agent TEXT,
    console_logs JSON,
    network_requests JSON,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation constraints for reports
ALTER TABLE fl_reports ADD CONSTRAINT valid_title_length
CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

ALTER TABLE fl_reports ADD CONSTRAINT valid_description_length
CHECK (char_length(description) >= 1 AND char_length(description) <= 5000);

ALTER TABLE fl_reports ADD CONSTRAINT valid_reporter_email
CHECK (reporter_email IS NULL OR reporter_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE fl_reports ADD CONSTRAINT valid_reporter_name_length
CHECK (reporter_name IS NULL OR char_length(reporter_name) <= 100);

-- Step 5: Create fl_attachments table
DROP TABLE IF EXISTS fl_attachments CASCADE;

CREATE TABLE fl_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES fl_reports(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation constraints for attachments
ALTER TABLE fl_attachments ADD CONSTRAINT valid_filename_length
CHECK (char_length(filename) >= 1 AND char_length(filename) <= 255);

ALTER TABLE fl_attachments ADD CONSTRAINT valid_file_size
CHECK (file_size > 0 AND file_size <= 10485760); -- 10MB max

ALTER TABLE fl_attachments ADD CONSTRAINT valid_mime_type
CHECK (mime_type IN (
    'image/png', 'image/jpeg', 'image/gif', 'image/jpg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- xlsx
    'application/vnd.ms-excel', -- xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- docx
    'application/msword' -- doc
));

-- Step 6: Verify all tables were created
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name LIKE 'fl_%'
AND table_schema = 'public'
ORDER BY table_name;

-- Step 7: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_fl_reports_project_status ON fl_reports(project_id, status);
CREATE INDEX IF NOT EXISTS idx_fl_reports_created_at ON fl_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_reports_type ON fl_reports(type);
CREATE INDEX IF NOT EXISTS idx_fl_project_invitations_user_project ON fl_project_invitations(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_fl_project_invitations_project ON fl_project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_fl_attachments_report ON fl_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_fl_projects_integration_key ON fl_projects(integration_key);
CREATE INDEX IF NOT EXISTS idx_fl_users_email ON fl_users(email);
CREATE INDEX IF NOT EXISTS idx_fl_reports_project_type_status ON fl_reports(project_id, type, status);
CREATE INDEX IF NOT EXISTS idx_fl_reports_updated_at ON fl_reports(updated_at DESC);

-- Step 8: Enable Row Level Security on all tables
ALTER TABLE fl_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_attachments ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies
-- Users can only access their own data
CREATE POLICY users_own_data ON fl_users
FOR ALL TO authenticated
USING (auth.uid() = id);

-- Users can only access projects they're invited to
CREATE POLICY project_access ON fl_projects
FOR ALL TO authenticated
USING (
    id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);

-- Users can manage invitations for projects they're part of
CREATE POLICY invitation_access ON fl_project_invitations
FOR ALL TO authenticated
USING (
    project_id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);

-- Users can only access reports from their projects
CREATE POLICY report_access ON fl_reports
FOR ALL TO authenticated
USING (
    project_id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);

-- Users can only access attachments from their reports
CREATE POLICY attachment_access ON fl_attachments
FOR ALL TO authenticated
USING (
    report_id IN (
        SELECT r.id FROM fl_reports r
        JOIN fl_project_invitations pi ON r.project_id = pi.project_id
        WHERE pi.user_id = auth.uid()
    )
);

-- Allow anonymous widget submissions (for public widget)
CREATE POLICY widget_submission ON fl_reports
FOR INSERT TO anon
WITH CHECK (
    project_id IN (SELECT id FROM fl_projects)
);

-- Step 10: Create helper functions
-- Function to automatically create owner invitation when project is created
CREATE OR REPLACE FUNCTION fl_ensure_project_owner_invitation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO fl_project_invitations (project_id, user_id, role, can_invite)
    VALUES (NEW.id, NEW.owner_id, 'owner', TRUE)
    ON CONFLICT (user_id, project_id) DO NOTHING;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic owner invitation
CREATE TRIGGER create_owner_invitation AFTER INSERT ON fl_projects
    FOR EACH ROW EXECUTE FUNCTION fl_ensure_project_owner_invitation();

-- Function to limit attachments per report to 5
CREATE OR REPLACE FUNCTION fl_check_attachment_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM fl_attachments WHERE report_id = NEW.report_id) >= 5 THEN
        RAISE EXCEPTION 'Maximum of 5 attachments allowed per report';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for attachment limit
CREATE TRIGGER attachment_limit_check BEFORE INSERT ON fl_attachments
    FOR EACH ROW EXECUTE FUNCTION fl_check_attachment_limit();

-- Step 11: Create updated_at triggers (if update_updated_at_column function exists)
-- Note: This function should already exist in Supabase
CREATE TRIGGER update_fl_users_updated_at BEFORE UPDATE ON fl_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fl_projects_updated_at BEFORE UPDATE ON fl_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fl_reports_updated_at BEFORE UPDATE ON fl_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Final verification
SELECT
    'Tables created successfully!' as message,
    COUNT(*) as table_count
FROM information_schema.tables
WHERE table_name LIKE 'fl_%' AND table_schema = 'public';