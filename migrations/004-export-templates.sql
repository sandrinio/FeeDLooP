-- Migration 004: Export Templates and Scheduling System
-- Enhanced Log Visualization - Phase 6: Export functionality
-- Creates tables for managing export templates and scheduled exports

-- Create export templates table
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

-- Create scheduled exports table for future functionality
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

-- Create export history table to track export executions
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_export_templates_project_id ON fl_export_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_created_by ON fl_export_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_export_templates_is_default ON fl_export_templates(project_id, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_exports_project_id ON fl_scheduled_exports(project_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_template_id ON fl_scheduled_exports(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_next_run ON fl_scheduled_exports(next_run_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_export_history_project_id ON fl_export_history(project_id);
CREATE INDEX IF NOT EXISTS idx_export_history_template_id ON fl_export_history(template_id);
CREATE INDEX IF NOT EXISTS idx_export_history_scheduled_export_id ON fl_export_history(scheduled_export_id);
CREATE INDEX IF NOT EXISTS idx_export_history_status ON fl_export_history(status);
CREATE INDEX IF NOT EXISTS idx_export_history_expires_at ON fl_export_history(expires_at) WHERE expires_at IS NOT NULL;

-- Add row level security policies
ALTER TABLE fl_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_scheduled_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_export_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for export templates
CREATE POLICY "Users can view export templates for their projects"
    ON fl_export_templates FOR SELECT
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can create export templates for their projects"
    ON fl_export_templates FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND status = 'accepted'
            AND role IN ('owner', 'admin', 'member')
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
            AND status = 'accepted'
            AND role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "Users can delete export templates for their projects"
    ON fl_export_templates FOR DELETE
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND status = 'accepted'
            AND role IN ('owner', 'admin')
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
            AND status = 'accepted'
        )
    );

CREATE POLICY "Users can create scheduled exports for their projects"
    ON fl_scheduled_exports FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND status = 'accepted'
            AND role IN ('owner', 'admin')
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
            AND status = 'accepted'
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can delete scheduled exports for their projects"
    ON fl_scheduled_exports FOR DELETE
    USING (
        project_id IN (
            SELECT project_id
            FROM fl_project_invitations
            WHERE user_id = auth.uid()
            AND status = 'accepted'
            AND role IN ('owner', 'admin')
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
            AND status = 'accepted'
        )
    );

CREATE POLICY "System can insert export history"
    ON fl_export_history FOR INSERT
    WITH CHECK (true); -- This will be used by system processes

CREATE POLICY "System can update export history"
    ON fl_export_history FOR UPDATE
    USING (true); -- This will be used by system processes

-- Insert default export templates for existing projects
DO $$
DECLARE
    project_record RECORD;
    admin_user_id UUID;
BEGIN
    -- Get the first admin user ID for default template creation
    SELECT id INTO admin_user_id
    FROM fl_users
    ORDER BY created_at
    LIMIT 1;

    -- Only proceed if we have a user
    IF admin_user_id IS NOT NULL THEN
        -- Create default templates for each existing project
        FOR project_record IN
            SELECT id FROM fl_projects
        LOOP
            -- Insert default CSV template
            INSERT INTO fl_export_templates (
                project_id,
                name,
                description,
                format,
                template_type,
                include_fields,
                data_format,
                compression,
                is_default,
                created_by
            ) VALUES (
                project_record.id,
                'Default CSV Export',
                'Standard CSV export with basic fields',
                'csv',
                'default',
                '{
                    "title": true,
                    "description": true,
                    "type": true,
                    "priority": true,
                    "reporter": true,
                    "url": true,
                    "created_at": true,
                    "console_logs": false,
                    "network_requests": false,
                    "performance_metrics": false,
                    "interaction_data": false,
                    "error_context": false,
                    "user_agent": false,
                    "viewport": false,
                    "attachments": false
                }'::jsonb,
                'flattened',
                false,
                true,
                admin_user_id
            ) ON CONFLICT DO NOTHING;

            -- Insert JIRA template
            INSERT INTO fl_export_templates (
                project_id,
                name,
                description,
                format,
                template_type,
                include_fields,
                data_format,
                compression,
                is_default,
                created_by
            ) VALUES (
                project_record.id,
                'JIRA Import Template',
                'CSV export formatted for JIRA import',
                'csv',
                'jira',
                '{
                    "title": true,
                    "description": true,
                    "type": true,
                    "priority": true,
                    "reporter": true,
                    "url": true,
                    "created_at": true,
                    "console_logs": true,
                    "network_requests": false,
                    "performance_metrics": false,
                    "interaction_data": false,
                    "error_context": true,
                    "user_agent": false,
                    "viewport": false,
                    "attachments": false
                }'::jsonb,
                'flattened',
                false,
                false,
                admin_user_id
            ) ON CONFLICT DO NOTHING;

        END LOOP;
    END IF;
END $$;

-- Add function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_export_templates_updated_at
    BEFORE UPDATE ON fl_export_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_exports_updated_at
    BEFORE UPDATE ON fl_scheduled_exports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired export files
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

-- Migration completion message
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Migration 004: Export Templates System';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Successfully created:';
    RAISE NOTICE '- fl_export_templates table';
    RAISE NOTICE '- fl_scheduled_exports table';
    RAISE NOTICE '- fl_export_history table';
    RAISE NOTICE '- Indexes and RLS policies';
    RAISE NOTICE '- Default templates for existing projects';
    RAISE NOTICE '- Cleanup functions and triggers';
    RAISE NOTICE '==========================================';
END $$;