/**
 * Project Settings Service
 * T011: ProjectSettingsService implementation
 *
 * Service for managing project settings data including statistics and permissions
 */

import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import type {
  ProjectSettingsData,
  ProjectInfo,
  ProjectStatistics,
  ProjectPermissions
} from '@/types/project-settings'

export class ProjectSettingsService {
  /**
   * Get complete project settings data for a project
   */
  static async getProjectSettings(projectId: string, userId: string): Promise<ProjectSettingsData | null> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database connection not available')
      }

      // Verify project exists and user has access
      const { data: project, error: projectError } = await supabaseAdmin
        .from('fl_projects')
        .select(`
          id,
          name,
          owner_id,
          created_at,
          integration_key
        `)
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return null
      }

      // Check if user has access to this project
      const hasAccess = await ServerSession.hasProjectAccess(projectId)
      if (!hasAccess) {
        return null
      }

      // Get project statistics
      const statistics = await this.getProjectStatistics(projectId)

      // Get project permissions for the current user
      const permissions = await this.getProjectPermissions(projectId, userId)

      const projectInfo: ProjectInfo = {
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        created_at: project.created_at,
        integration_key: project.integration_key
      }

      return {
        project: projectInfo,
        statistics,
        permissions
      }
    } catch (error) {
      console.error('Error getting project settings:', error)
      return null
    }
  }

  /**
   * Get project statistics including counts and storage usage
   */
  static async getProjectStatistics(projectId: string): Promise<ProjectStatistics> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database connection not available')
      }

      // Get member count
      const { count: memberCount, error: memberError } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (memberError) {
        console.error('Error counting members:', memberError)
      }

      // Add 1 for the owner (who is not in invitations table)
      const totalMemberCount = (memberCount || 0) + 1

      // Get report count
      const { count: reportCount, error: reportError } = await supabaseAdmin
        .from('fl_reports')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (reportError) {
        console.error('Error counting reports:', reportError)
      }

      // Get attachment count
      const { count: attachmentCount, error: attachmentError } = await supabaseAdmin
        .from('fl_attachments')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (attachmentError) {
        console.error('Error counting attachments:', attachmentError)
      }

      // Calculate total storage usage from attachments
      const { data: attachments, error: storageError } = await supabaseAdmin
        .from('fl_attachments')
        .select('file_size')
        .eq('project_id', projectId)

      let totalStorageUsage = 0
      if (!storageError && attachments) {
        totalStorageUsage = attachments.reduce((sum, attachment) => {
          return sum + (attachment.file_size || 0)
        }, 0)
      }

      // For export template count, we'll set to 0 for now as this feature may not be implemented yet
      const exportTemplateCount = 0

      return {
        member_count: totalMemberCount,
        report_count: reportCount || 0,
        attachment_count: attachmentCount || 0,
        export_template_count: exportTemplateCount,
        total_storage_usage: totalStorageUsage
      }
    } catch (error) {
      console.error('Error getting project statistics:', error)
      // Return zeros if there's an error
      return {
        member_count: 0,
        report_count: 0,
        attachment_count: 0,
        export_template_count: 0,
        total_storage_usage: 0
      }
    }
  }

  /**
   * Get project permissions for a specific user
   */
  static async getProjectPermissions(projectId: string, userId: string): Promise<ProjectPermissions> {
    try {
      if (!supabaseAdmin) {
        throw new Error('Database connection not available')
      }

      // Get project to check ownership
      const { data: project, error: projectError } = await supabaseAdmin
        .from('fl_projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return {
          can_delete: false,
          can_modify: false
        }
      }

      const isOwner = project.owner_id === userId

      // Only owners can delete and modify projects
      return {
        can_delete: isOwner,
        can_modify: isOwner
      }
    } catch (error) {
      console.error('Error getting project permissions:', error)
      return {
        can_delete: false,
        can_modify: false
      }
    }
  }

  /**
   * Validate if user is the project owner
   */
  static async validateProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        return false
      }

      const { data: project, error } = await supabaseAdmin
        .from('fl_projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (error || !project) {
        return false
      }

      return project.owner_id === userId
    } catch (error) {
      console.error('Error validating project ownership:', error)
      return false
    }
  }

  /**
   * Get project name for validation purposes
   */
  static async getProjectName(projectId: string): Promise<string | null> {
    try {
      if (!supabaseAdmin) {
        return null
      }

      const { data: project, error } = await supabaseAdmin
        .from('fl_projects')
        .select('name')
        .eq('id', projectId)
        .single()

      if (error || !project) {
        return null
      }

      return project.name
    } catch (error) {
      console.error('Error getting project name:', error)
      return null
    }
  }

  /**
   * Check if project exists
   */
  static async projectExists(projectId: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        return false
      }

      const { data: project, error } = await supabaseAdmin
        .from('fl_projects')
        .select('id')
        .eq('id', projectId)
        .single()

      return !error && !!project
    } catch (error) {
      console.error('Error checking if project exists:', error)
      return false
    }
  }

  /**
   * Get detailed project information for settings
   */
  static async getDetailedProjectInfo(projectId: string): Promise<ProjectInfo | null> {
    try {
      if (!supabaseAdmin) {
        return null
      }

      const { data: project, error } = await supabaseAdmin
        .from('fl_projects')
        .select(`
          id,
          name,
          owner_id,
          created_at,
          integration_key
        `)
        .eq('id', projectId)
        .single()

      if (error || !project) {
        return null
      }

      return {
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        created_at: project.created_at,
        integration_key: project.integration_key
      }
    } catch (error) {
      console.error('Error getting detailed project info:', error)
      return null
    }
  }

  /**
   * Validate settings access for a user
   */
  static async validateSettingsAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      // Only project owners can access settings
      return await this.validateProjectOwnership(projectId, userId)
    } catch (error) {
      console.error('Error validating settings access:', error)
      return false
    }
  }
}