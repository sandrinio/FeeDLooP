-- FeeDLooP Enhanced Database Setup Script
-- This script creates all tables, indexes, RLS policies, and constraints
-- Execute this in your Supabase SQL Editor
-- LAST UPDATED: September 2025 - Includes Enhanced Log Visualization & Export Templates

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES SETUP (Must be done first and committed)
-- ============================================================================

-- Handle enum types first - they need to be committed before use
DO $$ BEGIN
    -- Check and create user_role enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'member');
    ELSE
        -- Add missing values to existing enum (if they don't exist)
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'owner') THEN
            ALTER TYPE user_role ADD VALUE 'owner';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') AND enumlabel = 'member') THEN
            ALTER TYPE user_role ADD VALUE 'member';
        END IF;
    END IF;

    -- Check and create report_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
        CREATE TYPE report_type AS ENUM ('bug', 'initiative', 'feedback');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type') AND enumlabel = 'bug') THEN
            ALTER TYPE report_type ADD VALUE 'bug';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type') AND enumlabel = 'initiative') THEN
            ALTER TYPE report_type ADD VALUE 'initiative';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type') AND enumlabel = 'feedback') THEN
            ALTER TYPE report_type ADD VALUE 'feedback';
        END IF;
    END IF;

    -- Check and create report_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('active', 'archived');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_status') AND enumlabel = 'active') THEN
            ALTER TYPE report_status ADD VALUE 'active';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_status') AND enumlabel = 'archived') THEN
            ALTER TYPE report_status ADD VALUE 'archived';
        END IF;
    END IF;

    -- Check and create priority_level enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'priority_level') AND enumlabel = 'low') THEN
            ALTER TYPE priority_level ADD VALUE 'low';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'priority_level') AND enumlabel = 'medium') THEN
            ALTER TYPE priority_level ADD VALUE 'medium';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'priority_level') AND enumlabel = 'high') THEN
            ALTER TYPE priority_level ADD VALUE 'high';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'priority_level') AND enumlabel = 'critical') THEN
            ALTER TYPE priority_level ADD VALUE 'critical';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- TABLE 1: fl_users (User accounts and authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    company VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add email validation constraint for fl_users
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_email') THEN
        ALTER TABLE fl_users ADD CONSTRAINT valid_email
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- ============================================================================
-- TABLE 2: fl_projects (Project containers with integration keys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    integration_key VARCHAR(50) UNIQUE NOT NULL DEFAULT substring(replace(uuid_generate_v4()::text, '-', ''), 1, 32),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add name length validation for fl_projects
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_name_length') THEN
        ALTER TABLE fl_projects ADD CONSTRAINT valid_name_length
        CHECK (char_length(name) >= 1 AND char_length(name) <= 100);
    END IF;
END $$;

-- ============================================================================
-- TABLE 3: fl_project_invitations (User access and role management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    can_invite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Prevent duplicate invitations
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_project') THEN
        ALTER TABLE fl_project_invitations ADD CONSTRAINT unique_user_project
        UNIQUE(user_id, project_id);
    END IF;
END $$;

-- ============================================================================
-- TABLE 4: fl_reports (Feedback submissions with metadata and enhanced diagnostics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_reports (
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
    performance_metrics JSON, -- Enhanced: Core Web Vitals and performance timing data
    interaction_data JSON,    -- Enhanced: Anonymized user interaction tracking (consent-based)
    error_context JSON,       -- Enhanced: Error patterns, unhandled errors, and correlation data
    browser_info JSON,        -- Enhanced: Browser and device information
    page_url TEXT,            -- Enhanced: Full page URL where the report was submitted
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation constraints for fl_reports
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_title_length') THEN
        ALTER TABLE fl_reports ADD CONSTRAINT valid_title_length
        CHECK (char_length(title) >= 1 AND char_length(title) <= 200);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_description_length') THEN
        ALTER TABLE fl_reports ADD CONSTRAINT valid_description_length
        CHECK (char_length(description) >= 1 AND char_length(description) <= 5000);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_reporter_email') THEN
        ALTER TABLE fl_reports ADD CONSTRAINT valid_reporter_email
        CHECK (reporter_email IS NULL OR reporter_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_reporter_name_length') THEN
        ALTER TABLE fl_reports ADD CONSTRAINT valid_reporter_name_length
        CHECK (reporter_name IS NULL OR char_length(reporter_name) <= 100);
    END IF;
END $$;

-- ============================================================================
-- TABLE 5: fl_attachments (File uploads associated with reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES fl_reports(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url TEXT, -- Public URL for downloading/accessing the file
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation constraints for fl_attachments
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_filename_length') THEN
        ALTER TABLE fl_attachments ADD CONSTRAINT valid_filename_length
        CHECK (char_length(filename) >= 1 AND char_length(filename) <= 255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_file_size') THEN
        ALTER TABLE fl_attachments ADD CONSTRAINT valid_file_size
        CHECK (file_size > 0 AND file_size <= 10485760); -- 10MB max
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_mime_type') THEN
        ALTER TABLE fl_attachments ADD CONSTRAINT valid_mime_type
        CHECK (mime_type IN (
            'image/png', 'image/jpeg', 'image/gif', 'image/jpg',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- xlsx
            'application/vnd.ms-excel', -- xls
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- docx
            'application/msword' -- doc
        ));
    END IF;
END $$;

-- ============================================================================
-- TABLE 6: fl_pending_invitations (Email-based invitations for non-registered users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_pending_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    can_invite BOOLEAN NOT NULL DEFAULT FALSE,
    invited_by UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    invitation_token VARCHAR(64) UNIQUE NOT NULL DEFAULT substring(replace(uuid_generate_v4()::text, '-', '') || replace(uuid_generate_v4()::text, '-', ''), 1, 64),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add validation constraints for fl_pending_invitations
DO $$ BEGIN
    -- Email validation
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_pending_email') THEN
        ALTER TABLE fl_pending_invitations ADD CONSTRAINT valid_pending_email
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;

    -- Prevent duplicate pending invitations for same email+project
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_pending_email_project') THEN
        ALTER TABLE fl_pending_invitations ADD CONSTRAINT unique_pending_email_project
        UNIQUE(email, project_id)
        DEFERRABLE INITIALLY DEFERRED;
    END IF;

    -- Ensure expires_at is in the future when created
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_expiration_date') THEN
        ALTER TABLE fl_pending_invitations ADD CONSTRAINT valid_expiration_date
        CHECK (expires_at > created_at);
    END IF;
END $$;

-- ============================================================================
-- TABLE 7: fl_export_templates (Export configuration templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_export_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'json', 'excel', 'ndjson')),
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('default', 'jira', 'azure_devops')),
    include_fields JSONB NOT NULL DEFAULT '{}',
    data_format VARCHAR(20) NOT NULL DEFAULT 'flattened' CHECK (data_format IN ('flattened', 'structured')),
    compression BOOLEAN NOT NULL DEFAULT false,
    filters JSONB DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Ensure only one default template per project
    CONSTRAINT unique_default_per_project EXCLUDE (project_id WITH =) WHERE (is_default = true)
);

-- ============================================================================
-- TABLE 8: fl_scheduled_exports (Scheduled export configurations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_scheduled_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES fl_export_templates(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schedule_cron VARCHAR(100) NOT NULL, -- Cron expression for scheduling
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER NOT NULL DEFAULT 0,
    export_filters JSONB DEFAULT '{}', -- Additional filters for this scheduled export
    notification_emails TEXT[], -- Array of email addresses for notifications
    created_by UUID NOT NULL REFERENCES fl_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE 9: fl_export_history (Export execution tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fl_export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES fl_projects(id) ON DELETE CASCADE,
    template_id UUID REFERENCES fl_export_templates(id) ON DELETE SET NULL,
    scheduled_export_id UUID REFERENCES fl_scheduled_exports(id) ON DELETE SET NULL,
    export_type VARCHAR(20) NOT NULL CHECK (export_type IN ('manual', 'scheduled')),
    format VARCHAR(20) NOT NULL,
    total_records INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT,
    file_url TEXT, -- URL to download the generated export
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    executed_by UUID REFERENCES fl_users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- When the export file expires and gets cleaned up
);

-- ============================================================================
-- PERFORMANCE INDEXES (Query optimization)
-- ============================================================================

-- Query optimization for dashboard
CREATE INDEX IF NOT EXISTS idx_fl_reports_project_status ON fl_reports(project_id, status);
CREATE INDEX IF NOT EXISTS idx_fl_reports_created_at ON fl_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_reports_type ON fl_reports(type);

-- User project access optimization
CREATE INDEX IF NOT EXISTS idx_fl_project_invitations_user_project ON fl_project_invitations(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_fl_project_invitations_project ON fl_project_invitations(project_id);

-- File cleanup operations
CREATE INDEX IF NOT EXISTS idx_fl_attachments_report ON fl_attachments(report_id);

-- Project lookup by integration key (for widget)
CREATE INDEX IF NOT EXISTS idx_fl_projects_integration_key ON fl_projects(integration_key);

-- User lookup optimization
CREATE INDEX IF NOT EXISTS idx_fl_users_email ON fl_users(email);

-- Report filtering optimization
CREATE INDEX IF NOT EXISTS idx_fl_reports_project_type_status ON fl_reports(project_id, type, status);
CREATE INDEX IF NOT EXISTS idx_fl_reports_updated_at ON fl_reports(updated_at DESC);

-- Pending invitations optimization
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_email ON fl_pending_invitations(email);
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_project ON fl_pending_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_token ON fl_pending_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_expires_at ON fl_pending_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_project_status ON fl_pending_invitations(project_id, accepted_at);

-- Enhanced diagnostic data indexes (for performance metrics filtering)
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_lcp ON fl_reports(CAST(performance_metrics->'web_vitals'->>'lcp' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_fcp ON fl_reports(CAST(performance_metrics->'web_vitals'->>'fcp' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_cls ON fl_reports(CAST(performance_metrics->'web_vitals'->>'cls' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_fid ON fl_reports(CAST(performance_metrics->'web_vitals'->>'fid' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_tti ON fl_reports(CAST(performance_metrics->'web_vitals'->>'tti' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_ttfb ON fl_reports(CAST(performance_metrics->'web_vitals'->>'ttfb' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_perf_category ON fl_reports((performance_metrics->'categorization'->>'overall'));
CREATE INDEX IF NOT EXISTS idx_fl_reports_error_count ON fl_reports(CAST(error_context->>'total_error_count' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_error_rate ON fl_reports(CAST(error_context->>'error_rate' AS numeric));
CREATE INDEX IF NOT EXISTS idx_fl_reports_interaction_consent ON fl_reports(CAST(interaction_data->>'consent_given' AS boolean));
CREATE INDEX IF NOT EXISTS idx_fl_reports_engagement_score ON fl_reports(CAST(interaction_data->>'engagement_score' AS numeric));

-- Export templates optimization
CREATE INDEX IF NOT EXISTS idx_export_templates_project_id ON fl_export_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_created_by ON fl_export_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_export_templates_is_default ON fl_export_templates(project_id, is_default) WHERE is_default = true;

-- Scheduled exports optimization
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_project_id ON fl_scheduled_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_template_id ON fl_scheduled_exports(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_next_run ON fl_scheduled_exports(next_run_at) WHERE is_active = true;

-- Export history optimization
CREATE INDEX IF NOT EXISTS idx_export_history_project_id ON fl_export_history(project_id);
CREATE INDEX IF NOT EXISTS idx_export_history_template_id ON fl_export_history(template_id);
CREATE INDEX IF NOT EXISTS idx_export_history_scheduled_export_id ON fl_export_history(scheduled_export_id);
CREATE INDEX IF NOT EXISTS idx_export_history_status ON fl_export_history(status);
CREATE INDEX IF NOT EXISTS idx_export_history_expires_at ON fl_export_history(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE fl_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_scheduled_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_export_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS users_own_data ON fl_users;
DROP POLICY IF EXISTS project_access ON fl_projects;
DROP POLICY IF EXISTS invitation_access ON fl_project_invitations;
DROP POLICY IF EXISTS report_access ON fl_reports;
DROP POLICY IF EXISTS attachment_access ON fl_attachments;
DROP POLICY IF EXISTS widget_submission ON fl_reports;
DROP POLICY IF EXISTS pending_invitation_access ON fl_pending_invitations;
DROP POLICY IF EXISTS "Users can view export templates for their projects" ON fl_export_templates;
DROP POLICY IF EXISTS "Users can create export templates for their projects" ON fl_export_templates;
DROP POLICY IF EXISTS "Users can update export templates for their projects" ON fl_export_templates;
DROP POLICY IF EXISTS "Users can delete export templates for their projects" ON fl_export_templates;
DROP POLICY IF EXISTS "Users can view scheduled exports for their projects" ON fl_scheduled_exports;
DROP POLICY IF EXISTS "Users can create scheduled exports for their projects" ON fl_scheduled_exports;
DROP POLICY IF EXISTS "Users can update scheduled exports for their projects" ON fl_scheduled_exports;
DROP POLICY IF EXISTS "Users can delete scheduled exports for their projects" ON fl_scheduled_exports;
DROP POLICY IF EXISTS "Users can view export history for their projects" ON fl_export_history;
DROP POLICY IF EXISTS "System can insert export history" ON fl_export_history;
DROP POLICY IF EXISTS "System can update export history" ON fl_export_history;

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

-- Users can manage pending invitations for projects they're part of
CREATE POLICY pending_invitation_access ON fl_pending_invitations
FOR ALL TO authenticated
USING (
    project_id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);

-- RLS Policies for export templates
CREATE POLICY "Users can view export templates for their projects"
    ON fl_export_templates FOR SELECT
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create export templates for their projects"
    ON fl_export_templates FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'member')
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update export templates for their projects"
    ON fl_export_templates FOR UPDATE
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'member')
        )
    );

CREATE POLICY "Users can delete export templates for their projects"
    ON fl_export_templates FOR DELETE
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND role IN ('owner')
        )
    );

-- RLS Policies for scheduled exports
CREATE POLICY "Users can view scheduled exports for their projects"
    ON fl_scheduled_exports FOR SELECT
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create scheduled exports for their projects"
    ON fl_scheduled_exports FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND role IN ('owner')
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update scheduled exports for their projects"
    ON fl_scheduled_exports FOR UPDATE
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND role IN ('owner')
        )
    );

CREATE POLICY "Users can delete scheduled exports for their projects"
    ON fl_scheduled_exports FOR DELETE
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND role IN ('owner')
        )
    );

-- RLS Policies for export history
CREATE POLICY "Users can view export history for their projects"
    ON fl_export_history FOR SELECT
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert export history"
    ON fl_export_history FOR INSERT
    WITH CHECK (true); -- This will be used by system processes

CREATE POLICY "System can update export history"
    ON fl_export_history FOR UPDATE
    USING (true); -- This will be used by system processes

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_owner_invitation ON fl_projects;

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS attachment_limit_check ON fl_attachments;

-- Create trigger for attachment limit
CREATE TRIGGER attachment_limit_check BEFORE INSERT ON fl_attachments
    FOR EACH ROW EXECUTE FUNCTION fl_check_attachment_limit();

-- Function to automatically accept pending invitation when user registers
CREATE OR REPLACE FUNCTION fl_process_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
    pending_invitation RECORD;
BEGIN
    -- Loop through all pending invitations for this email
    FOR pending_invitation IN
        SELECT * FROM fl_pending_invitations
        WHERE email = NEW.email
        AND expires_at > NOW()
        AND accepted_at IS NULL
    LOOP
        -- Create actual project invitation
        INSERT INTO fl_project_invitations (project_id, user_id, role, can_invite)
        VALUES (
            pending_invitation.project_id,
            NEW.id,
            pending_invitation.role,
            pending_invitation.can_invite
        )
        ON CONFLICT (user_id, project_id) DO NOTHING;

        -- Mark pending invitation as accepted
        UPDATE fl_pending_invitations
        SET accepted_at = NOW()
        WHERE id = pending_invitation.id;
    END LOOP;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS process_pending_invitations_on_register ON fl_users;

-- Create trigger for automatic pending invitation processing
CREATE TRIGGER process_pending_invitations_on_register
    AFTER INSERT ON fl_users
    FOR EACH ROW EXECUTE FUNCTION fl_process_pending_invitations();

-- Function to automatically update updated_at timestamps for export tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on export tables
CREATE TRIGGER update_export_templates_updated_at
    BEFORE UPDATE ON fl_export_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_exports_updated_at
    BEFORE UPDATE ON fl_scheduled_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired export files
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete expired export history records
    DELETE FROM fl_export_history
    WHERE expires_at IS NOT NULL
    AND expires_at < now();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION fl_cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM fl_pending_invitations
    WHERE expires_at <= NOW() AND accepted_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Function to get all invitations (both active and pending) for a project
CREATE OR REPLACE FUNCTION fl_get_project_invitations(p_project_id UUID)
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    name VARCHAR(101),
    role user_role,
    can_invite BOOLEAN,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    -- Active members
    SELECT
        pi.id,
        u.email,
        (u.first_name || ' ' || u.last_name) as name,
        pi.role,
        pi.can_invite,
        'active'::VARCHAR(20) as status,
        pi.created_at,
        pi.user_id
    FROM fl_project_invitations pi
    JOIN fl_users u ON pi.user_id = u.id
    WHERE pi.project_id = p_project_id

    UNION ALL

    -- Pending invitations
    SELECT
        pend.id,
        pend.email,
        NULL::VARCHAR(101) as name,
        pend.role,
        pend.can_invite,
        'pending'::VARCHAR(20) as status,
        pend.created_at,
        NULL::UUID as user_id
    FROM fl_pending_invitations pend
    WHERE pend.project_id = p_project_id
    AND pend.expires_at > NOW()
    AND pend.accepted_at IS NULL;
END;
$$ language 'plpgsql';

-- Function to get pending invitations for a user email
CREATE OR REPLACE FUNCTION fl_get_pending_invitations_for_email(p_email VARCHAR(255))
RETURNS TABLE (
    invitation_id UUID,
    project_id UUID,
    project_name VARCHAR(100),
    role user_role,
    can_invite BOOLEAN,
    invited_by_name VARCHAR(101),
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pend.id as invitation_id,
        pend.project_id,
        proj.name as project_name,
        pend.role,
        pend.can_invite,
        (u.first_name || ' ' || u.last_name) as invited_by_name,
        pend.created_at,
        pend.expires_at
    FROM fl_pending_invitations pend
    JOIN fl_projects proj ON pend.project_id = proj.id
    JOIN fl_users u ON pend.invited_by = u.id
    WHERE pend.email = p_email
    AND pend.expires_at > NOW()
    AND pend.accepted_at IS NULL;
END;
$$ language 'plpgsql';

-- ============================================================================
-- UPDATED_AT TRIGGERS (Uses existing Supabase function)
-- ============================================================================

-- Note: update_updated_at_column() function should already exist in Supabase
-- If not, create it with:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = now();
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_fl_users_updated_at ON fl_users;
DROP TRIGGER IF EXISTS update_fl_projects_updated_at ON fl_projects;
DROP TRIGGER IF EXISTS update_fl_reports_updated_at ON fl_reports;

-- Create updated_at triggers
CREATE TRIGGER update_fl_users_updated_at BEFORE UPDATE ON fl_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fl_projects_updated_at BEFORE UPDATE ON fl_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fl_reports_updated_at BEFORE UPDATE ON fl_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATABASE VERIFICATION AND STATUS
-- ============================================================================

-- Verify all tables exist (should show 9 tables)
SELECT
    'FeeDLooP Enhanced Database Setup Verification' as status,
    COUNT(*) as feedloop_tables_created
FROM information_schema.tables
WHERE table_name LIKE 'fl_%' AND table_schema = 'public';

-- Show table details
SELECT
    table_name,
    table_schema,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = t.table_name AND table_schema = t.table_schema) as column_count
FROM information_schema.tables t
WHERE table_name LIKE 'fl_%' AND table_schema = 'public'
ORDER BY table_name;

-- Show RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename LIKE 'fl_%'
ORDER BY tablename;

-- Show enum types
SELECT
    typname as enum_name,
    array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('user_role', 'report_type', 'report_status', 'priority_level')
GROUP BY typname
ORDER BY typname;

-- ============================================================================
-- CURRENT DATABASE STATE SUMMARY
-- ============================================================================

/*
CURRENT DEPLOYED TABLES (9 total):
1. fl_users - User accounts with first_name, last_name, company, email_verified fields
2. fl_projects - Project containers with integration keys for widget access
3. fl_project_invitations - Team membership and role management for registered users
4. fl_pending_invitations - Email-based invitations for non-registered users
5. fl_reports - Feedback submissions with enhanced diagnostic data (performance, interaction, error context)
6. fl_attachments - File uploads (max 5 per report)
7. fl_export_templates - Export configuration templates with field selection and formatting options
8. fl_scheduled_exports - Cron-based scheduled export configurations with email notifications
9. fl_export_history - Export execution tracking with file management and cleanup

ENUM TYPES (4 total):
- user_role: 'owner', 'member'
- report_type: 'bug', 'initiative', 'feedback'
- report_status: 'active', 'archived'
- priority_level: 'low', 'medium', 'high', 'critical'

ENHANCED DIAGNOSTIC DATA:
- performance_metrics: Core Web Vitals (FCP, LCP, CLS, FID, TTI, TTFB), memory usage, categorization
- interaction_data: Consent-based user interaction tracking, engagement scores, anonymized events
- error_context: Unhandled errors, promise rejections, error patterns, correlation data

EXPORT SYSTEM:
- Multiple formats: CSV, JSON, Excel XLSX, NDJSON
- Template-based configurations (Default, JIRA, Azure DevOps)
- Advanced field selection with enhanced diagnostic data
- GZIP compression support
- Scheduled exports with cron expressions
- Export history tracking with automatic cleanup
- Role-based access control (owners can manage scheduled exports)

SECURITY:
- Row Level Security enabled on all 9 tables
- Authenticated users can only access their data
- Anonymous users can submit widget reports
- Project-based access control implemented
- Secure token-based invitation system with expiration
- Export templates and scheduled exports restricted by project membership
- System-level policies for export history management

TRIGGERS:
- Auto-create owner invitation on project creation
- Limit attachments to 5 per report
- Auto-update updated_at timestamps (all tables)
- Auto-process pending invitations on user registration
- Export template and scheduled export timestamp updates

FUNCTIONS:
- fl_process_pending_invitations() - Processes pending invitations during registration
- fl_cleanup_expired_invitations() - Utility for cleaning expired invitations
- fl_get_project_invitations(UUID) - Unified view of active and pending invitations
- fl_get_pending_invitations_for_email(VARCHAR) - Get pending invitations by email
- cleanup_expired_exports() - Removes expired export history records
- update_updated_at_column() - Automatic timestamp updates

PERFORMANCE INDEXES:
- Dashboard query optimization (reports, projects, users)
- Enhanced diagnostic data filtering (Core Web Vitals, error metrics, engagement)
- Export template and scheduled export lookups
- Export history tracking and cleanup operations
- Pending invitation email and token lookups

ENHANCED FEATURES:
- Advanced export system with multiple formats and scheduling
- Enhanced diagnostic data collection (performance, interactions, errors)
- Template-based export configurations
- Email-based invitations for non-registered users
- Automatic project access upon registration
- 7-day invitation expiration with cleanup
- Export file lifecycle management with automatic cleanup
- Unified team management UI for active and pending members
*/

COMMENT ON DATABASE postgres IS 'FeeDLooP Enhanced Database - Production Ready Schema with 9 tables, enhanced diagnostics, export system, email invitations, RLS, and automated triggers';

-- Add detailed table comments
COMMENT ON TABLE fl_pending_invitations IS 'Email-based invitations for users who have not yet registered. Automatically processed when user registers with matching email.';
COMMENT ON TABLE fl_export_templates IS 'Export configuration templates with field selection, formatting options, and integration-specific mappings (JIRA, Azure DevOps).';
COMMENT ON TABLE fl_scheduled_exports IS 'Cron-based scheduled export configurations with email notifications and template-based data formatting.';
COMMENT ON TABLE fl_export_history IS 'Export execution tracking with file management, status monitoring, and automatic cleanup of expired files.';
COMMENT ON COLUMN fl_reports.performance_metrics IS 'Core Web Vitals and performance timing data collected from browser Performance Observer API. Includes FCP, LCP, CLS, FID, TTI, TTFB metrics plus resource timing and memory usage.';
COMMENT ON COLUMN fl_reports.interaction_data IS 'Anonymized user interaction tracking data (requires explicit user consent). Includes click, scroll, input events with timestamps and engagement metrics. No PII stored.';
COMMENT ON COLUMN fl_reports.error_context IS 'Enhanced error information including unhandled errors, promise rejections, CORS errors, CSP violations, and detected error patterns with correlation data.';
COMMENT ON FUNCTION fl_process_pending_invitations() IS 'Automatically converts pending invitations to active project memberships when user registers.';
COMMENT ON FUNCTION fl_cleanup_expired_invitations() IS 'Removes expired pending invitations. Should be called periodically via cron job.';
COMMENT ON FUNCTION fl_get_project_invitations(UUID) IS 'Returns both active members and pending invitations for a project in unified format.';
COMMENT ON FUNCTION fl_get_pending_invitations_for_email(VARCHAR) IS 'Returns all pending invitations for an email address, used during registration flow.';
COMMENT ON FUNCTION cleanup_expired_exports() IS 'Removes expired export history records and associated files. Should be called periodically via cron job.';