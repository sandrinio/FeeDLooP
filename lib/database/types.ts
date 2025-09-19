/**
 * Database Types for Supabase Integration
 * Generated from database schema with manual adjustments for FeeDLooP
 */

// Enum types
export type UserRole = 'owner' | 'member'
export type ProjectStatus = 'active' | 'inactive' | 'archived'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'
export type ReportType = 'bug' | 'initiative' | 'feedback'
export type ReportStatus = 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed'
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical'
export type AttachmentStatus = 'uploading' | 'processing' | 'ready' | 'error' | 'quarantined'
export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'infected' | 'error'

// Database schema interface
export interface Database {
  public: {
    Tables: {
      fl_users: {
        Row: {
          id: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          company: string
          avatar_url: string | null
          email_verified: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          first_name: string
          last_name: string
          company: string
          avatar_url?: string | null
          email_verified?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          first_name?: string
          last_name?: string
          company?: string
          avatar_url?: string | null
          email_verified?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fl_projects: {
        Row: {
          id: string
          name: string
          description: string
          integration_key: string
          domain: string | null
          allowed_origins: string
          webhook_url: string | null
          status: ProjectStatus
          settings: string
          owner_id: string
          created_at: string
          updated_at: string
          last_activity_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          integration_key: string
          domain?: string | null
          allowed_origins?: string
          webhook_url?: string | null
          status?: ProjectStatus
          settings?: string
          owner_id: string
          created_at?: string
          updated_at?: string
          last_activity_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          integration_key?: string
          domain?: string | null
          allowed_origins?: string
          webhook_url?: string | null
          status?: ProjectStatus
          settings?: string
          owner_id?: string
          created_at?: string
          updated_at?: string
          last_activity_at?: string | null
        }
      }
      fl_project_invitations: {
        Row: {
          id: string
          project_id: string
          email: string
          role: UserRole
          status: InvitationStatus
          token: string
          message: string | null
          invited_by: string
          invited_at: string
          expires_at: string
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          email: string
          role?: UserRole
          status?: InvitationStatus
          token: string
          message?: string | null
          invited_by: string
          invited_at?: string
          expires_at: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          email?: string
          role?: UserRole
          status?: InvitationStatus
          token?: string
          message?: string | null
          invited_by?: string
          invited_at?: string
          expires_at?: string
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      fl_reports: {
        Row: {
          id: string
          project_id: string
          type: ReportType
          title: string
          description: string
          status: ReportStatus
          priority: ReportPriority
          user_info: string | null
          diagnostic_data: string | null
          internal_notes: string | null
          resolution_notes: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          type: ReportType
          title: string
          description: string
          status?: ReportStatus
          priority?: ReportPriority
          user_info?: string | null
          diagnostic_data?: string | null
          internal_notes?: string | null
          resolution_notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          type?: ReportType
          title?: string
          description?: string
          status?: ReportStatus
          priority?: ReportPriority
          user_info?: string | null
          diagnostic_data?: string | null
          internal_notes?: string | null
          resolution_notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
      }
      fl_attachments: {
        Row: {
          id: string
          project_id: string
          report_id: string | null
          filename: string
          original_filename: string
          content_type: string
          size: number
          url: string
          storage_path: string
          status: AttachmentStatus
          description: string | null
          metadata: string | null
          scan_status: ScanStatus
          scan_result: string | null
          scanned_at: string | null
          download_count: number
          last_downloaded_at: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          report_id?: string | null
          filename: string
          original_filename: string
          content_type: string
          size: number
          url: string
          storage_path: string
          status?: AttachmentStatus
          description?: string | null
          metadata?: string | null
          scan_status?: ScanStatus
          scan_result?: string | null
          scanned_at?: string | null
          download_count?: number
          last_downloaded_at?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          report_id?: string | null
          filename?: string
          original_filename?: string
          content_type?: string
          size?: number
          url?: string
          storage_path?: string
          status?: AttachmentStatus
          description?: string | null
          metadata?: string | null
          scan_status?: ScanStatus
          scan_result?: string | null
          scanned_at?: string | null
          download_count?: number
          last_downloaded_at?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      // Views can be added here if needed
    }
    Functions: {
      // Database functions
      set_user_context: {
        Args: {
          user_id: string
        }
        Returns: void
      }
      run_migration: {
        Args: {
          migration_sql: string
        }
        Returns: void
      }
      get_project_stats: {
        Args: {
          project_id: string
        }
        Returns: {
          total_reports: number
          bug_reports: number
          initiative_reports: number
          feedback_reports: number
          new_reports: number
          in_progress_reports: number
          resolved_reports: number
          team_member_count: number
        }
      }
      search_reports: {
        Args: {
          project_id: string
          search_term: string
          report_type?: ReportType
          report_status?: ReportStatus
          limit?: number
          offset?: number
        }
        Returns: Array<{
          id: string
          title: string
          description: string
          type: ReportType
          status: ReportStatus
          priority: ReportPriority
          created_at: string
          rank: number
        }>
      }
    }
    Enums: {
      user_role: UserRole
      project_status: ProjectStatus
      invitation_status: InvitationStatus
      report_type: ReportType
      report_status: ReportStatus
      report_priority: ReportPriority
      attachment_status: AttachmentStatus
      scan_status: ScanStatus
    }
  }
}

// Utility types for better developer experience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]

// Specific table types for convenience
export type User = Tables<'fl_users'>
export type Project = Tables<'fl_projects'>
export type ProjectInvitation = Tables<'fl_project_invitations'>
export type Report = Tables<'fl_reports'>
export type Attachment = Tables<'fl_attachments'>

// Insert types
export type UserInsert = Database['public']['Tables']['fl_users']['Insert']
export type ProjectInsert = Database['public']['Tables']['fl_projects']['Insert']
export type ProjectInvitationInsert = Database['public']['Tables']['fl_project_invitations']['Insert']
export type ReportInsert = Database['public']['Tables']['fl_reports']['Insert']
export type AttachmentInsert = Database['public']['Tables']['fl_attachments']['Insert']

// Update types
export type UserUpdate = Database['public']['Tables']['fl_users']['Update']
export type ProjectUpdate = Database['public']['Tables']['fl_projects']['Update']
export type ProjectInvitationUpdate = Database['public']['Tables']['fl_project_invitations']['Update']
export type ReportUpdate = Database['public']['Tables']['fl_reports']['Update']
export type AttachmentUpdate = Database['public']['Tables']['fl_attachments']['Update']

// Complex query types
export type ProjectWithTeam = Project & {
  team_members: Array<{
    user_id: string
    email: string
    first_name: string
    last_name: string
    role: UserRole
    joined_at: string
    avatar_url?: string | null
  }>
  report_counts?: {
    total: number
    bugs: number
    initiatives: number
    feedback: number
    new: number
    in_progress: number
    resolved: number
  }
}

export type ReportWithAttachments = Report & {
  attachments: Attachment[]
}

export type InvitationWithDetails = ProjectInvitation & {
  project: {
    id: string
    name: string
    description: string
    domain?: string | null
  }
  inviter: {
    id: string
    first_name: string
    last_name: string
    email: string
    company: string
  }
}