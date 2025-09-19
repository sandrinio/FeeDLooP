-- ============================================================================
-- PENDING INVITATIONS ENHANCEMENT
-- Migration 001: Add email-based invitations support
-- ============================================================================

-- ============================================================================
-- TABLE: fl_pending_invitations (Email-based invitations for non-registered users)
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
-- INDEXES for performance optimization
-- ============================================================================

-- Fast lookup by email for registration process
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_email ON fl_pending_invitations(email);

-- Fast lookup by project for invitation management
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_project ON fl_pending_invitations(project_id);

-- Fast lookup by invitation token for acceptance
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_token ON fl_pending_invitations(invitation_token);

-- Fast cleanup of expired invitations
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_expires_at ON fl_pending_invitations(expires_at);

-- Fast lookup for pending invitations by project (for UI display)
CREATE INDEX IF NOT EXISTS idx_fl_pending_invitations_project_status ON fl_pending_invitations(project_id, accepted_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) for fl_pending_invitations
-- ============================================================================

-- Enable RLS on the new table
ALTER TABLE fl_pending_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS pending_invitation_access ON fl_pending_invitations;

-- Users can manage pending invitations for projects they're part of
CREATE POLICY pending_invitation_access ON fl_pending_invitations
FOR ALL TO authenticated
USING (
    project_id IN (
        SELECT project_id FROM fl_project_invitations
        WHERE user_id = auth.uid()
    )
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

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

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

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
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify the new table was created
SELECT
    'Pending Invitations Migration Complete' as status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fl_pending_invitations')
        THEN 'SUCCESS: fl_pending_invitations table created'
        ELSE 'ERROR: fl_pending_invitations table not found'
    END as table_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'fl_process_pending_invitations')
        THEN 'SUCCESS: Trigger function created'
        ELSE 'ERROR: Trigger function not found'
    END as function_status;

-- Show table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'fl_pending_invitations'
ORDER BY ordinal_position;

COMMENT ON TABLE fl_pending_invitations IS 'Email-based invitations for users who have not yet registered. Automatically processed when user registers with matching email.';
COMMENT ON FUNCTION fl_process_pending_invitations() IS 'Automatically converts pending invitations to active project memberships when user registers.';
COMMENT ON FUNCTION fl_cleanup_expired_invitations() IS 'Removes expired pending invitations. Should be called periodically via cron job.';
COMMENT ON FUNCTION fl_get_project_invitations(UUID) IS 'Returns both active members and pending invitations for a project in unified format.';
COMMENT ON FUNCTION fl_get_pending_invitations_for_email(VARCHAR) IS 'Returns all pending invitations for an email address, used during registration flow.';