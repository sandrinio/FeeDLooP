/**
 * Project Service Layer with Team Management
 * T084: Project service layer with team management in lib/services/projectService.ts
 */

import { supabaseAdmin, handleDatabaseError, measureQuery, DatabaseError } from '@/lib/database/supabase'
import { userService } from '@/lib/services/userService'
import { PublicUser } from '@/lib/models/user'

// Simplified project types based on actual database schema
export interface CreateProjectInput {
  name: string
}

export interface UpdateProjectInput {
  name?: string
}

export interface Project {
  id: string
  name: string
  owner_id: string
  integration_key: string
  created_at: Date
  updated_at: Date
}

export interface ProjectWithTeam extends Project {
  members: ProjectMember[]
  pendingInvitations: PendingInvitation[]
}

export interface ProjectMember {
  id: string
  user_id: string
  email: string
  name: string
  role: 'owner' | 'member'
  can_invite: boolean
  status: 'active'
  created_at: Date
}

export interface PendingInvitation {
  id: string
  email: string
  role: 'member' | 'admin'
  can_invite: boolean
  status: 'pending'
  expires_at: Date
  created_at: Date
}

export interface ProjectStats {
  totalReports: number
  activeReports: number
  archivedReports: number
  bugReports: number
  initiativeReports: number
  feedbackReports: number
  teamMemberCount: number
}

export interface TeamInvitation {
  email: string
  role: 'member' | 'admin'
  can_invite?: boolean
}

export class ProjectService {
  private static instance: ProjectService

  private constructor() {}

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService()
    }
    return ProjectService.instance
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, projectData: CreateProjectInput): Promise<Project> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Validate input
      if (!projectData.name || projectData.name.trim().length === 0) {
        throw new DatabaseError('Project name is required', 'VALIDATION_ERROR')
      }

      if (projectData.name.length > 100) {
        throw new DatabaseError('Project name must be less than 100 characters', 'VALIDATION_ERROR')
      }

      // Create project in database
      const { data: project, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .insert({
            name: projectData.name.trim(),
            owner_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single(),
        'createProject'
      )

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseError('Project name already exists', 'PROJECT_EXISTS')
        }
        handleDatabaseError(error)
      }

      return {
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        integration_key: project.integration_key,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get project by ID with team information
   */
  async getProjectById(projectId: string, includeTeam = false): Promise<ProjectWithTeam | null> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get project
      const { data: project, error: projectError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('*')
          .eq('id', projectId)
          .single(),
        'getProjectById'
      )

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return null // Project not found
        }
        handleDatabaseError(projectError)
      }

      const result: ProjectWithTeam = {
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        integration_key: project.integration_key,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at),
        members: [],
        pendingInvitations: []
      }

      if (includeTeam) {
        // Get team members
        const { data: teamMembers, error: membersError } = await measureQuery(
          () => supabaseAdmin
            .from('fl_project_invitations')
            .select(`
              id,
              user_id,
              role,
              can_invite,
              created_at,
              fl_users!inner(
                email,
                first_name,
                last_name
              )
            `)
            .eq('project_id', projectId),
          'getProjectTeamMembers'
        )

        if (membersError) {
          console.error('Error fetching team members:', membersError)
        } else if (teamMembers) {
          result.members = teamMembers.map((member: any) => ({
            id: member.id,
            user_id: member.user_id,
            email: member.fl_users.email,
            name: `${member.fl_users.first_name} ${member.fl_users.last_name}`.trim(),
            role: member.role as 'owner' | 'member',
            can_invite: member.can_invite,
            status: 'active' as const,
            created_at: new Date(member.created_at)
          }))
        }

        // Get pending invitations
        const { data: pendingInvitations, error: pendingError } = await measureQuery(
          () => supabaseAdmin
            .from('fl_pending_invitations')
            .select('*')
            .eq('project_id', projectId)
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString()),
          'getProjectPendingInvitations'
        )

        if (pendingError) {
          console.error('Error fetching pending invitations:', pendingError)
        } else if (pendingInvitations) {
          result.pendingInvitations = pendingInvitations.map((invitation: any) => ({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role as 'member' | 'admin',
            can_invite: invitation.can_invite,
            status: 'pending' as const,
            expires_at: new Date(invitation.expires_at),
            created_at: new Date(invitation.created_at)
          }))
        }
      }

      return result

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get projects for a user
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get projects where user is owner or member
      const { data: projectIds, error: invitationsError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_project_invitations')
          .select('project_id')
          .eq('user_id', userId),
        'getUserProjectInvitations'
      )

      if (invitationsError) {
        handleDatabaseError(invitationsError)
      }

      if (!projectIds || projectIds.length === 0) {
        return []
      }

      const projectIdList = projectIds.map(inv => inv.project_id)

      const { data: projects, error: projectsError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('*')
          .in('id', projectIdList)
          .order('created_at', { ascending: false }),
        'getUserProjects'
      )

      if (projectsError) {
        handleDatabaseError(projectsError)
      }

      return (projects || []).map((project: any) => ({
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        integration_key: project.integration_key,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      }))

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get user projects: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, userId: string, updateData: UpdateProjectInput): Promise<Project> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if user can manage this project
      const canManage = await this.canUserManageProject(projectId, userId)
      if (!canManage) {
        throw new DatabaseError('Insufficient permissions to update project', 'INSUFFICIENT_PERMISSIONS')
      }

      // Validate input
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          throw new DatabaseError('Project name is required', 'VALIDATION_ERROR')
        }
        if (updateData.name.length > 100) {
          throw new DatabaseError('Project name must be less than 100 characters', 'VALIDATION_ERROR')
        }
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      }

      if (updateData.name !== undefined) {
        updatePayload.name = updateData.name.trim()
      }

      const { data: project, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .update(updatePayload)
          .eq('id', projectId)
          .select()
          .single(),
        'updateProject'
      )

      if (error) {
        if (error.code === '23505') {
          throw new DatabaseError('Project name already exists', 'PROJECT_EXISTS')
        }
        handleDatabaseError(error)
      }

      return {
        id: project.id,
        name: project.name,
        owner_id: project.owner_id,
        integration_key: project.integration_key,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if user is project owner
      const { data: project, error: projectError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('owner_id')
          .eq('id', projectId)
          .single(),
        'getProjectForDeletion'
      )

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          throw new DatabaseError('Project not found', 'PROJECT_NOT_FOUND')
        }
        handleDatabaseError(projectError)
      }

      if (project.owner_id !== userId) {
        throw new DatabaseError('Only project owners can delete projects', 'INSUFFICIENT_PERMISSIONS')
      }

      // Delete project (cascade delete will handle related records)
      const { error: deleteError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .delete()
          .eq('id', projectId),
        'deleteProject'
      )

      if (deleteError) {
        handleDatabaseError(deleteError)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Invite user to project
   */
  async inviteUserToProject(projectId: string, inviterId: string, invitation: TeamInvitation): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if inviter can invite to this project
      const canInvite = await this.canUserInviteToProject(projectId, inviterId)
      if (!canInvite) {
        throw new DatabaseError('Insufficient permissions to invite users', 'INSUFFICIENT_PERMISSIONS')
      }

      // Validate email
      if (!invitation.email || !invitation.email.includes('@')) {
        throw new DatabaseError('Valid email address is required', 'VALIDATION_ERROR')
      }

      // Check if user already exists
      const existingUser = await userService.getUserByEmail(invitation.email)

      if (existingUser) {
        // User exists - create direct invitation
        const { data: existingInvitation, error: checkError } = await measureQuery(
          () => supabaseAdmin
            .from('fl_project_invitations')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', existingUser.id)
            .single(),
          'checkExistingInvitation'
        )

        if (existingInvitation) {
          throw new DatabaseError('User is already a member of this project', 'USER_ALREADY_MEMBER')
        }

        // Create invitation
        const { error: createError } = await measureQuery(
          () => supabaseAdmin
            .from('fl_project_invitations')
            .insert({
              project_id: projectId,
              user_id: existingUser.id,
              role: invitation.role === 'admin' ? 'member' : 'member', // Map admin to member for now
              can_invite: invitation.can_invite || false
            }),
          'createDirectInvitation'
        )

        if (createError) {
          if (createError.code === '23505') {
            throw new DatabaseError('User is already a member of this project', 'USER_ALREADY_MEMBER')
          }
          handleDatabaseError(createError)
        }
      } else {
        // User doesn't exist - create pending invitation
        const { data: existingPending, error: pendingCheckError } = await measureQuery(
          () => supabaseAdmin
            .from('fl_pending_invitations')
            .select('id')
            .eq('project_id', projectId)
            .eq('email', invitation.email.toLowerCase())
            .is('accepted_at', null)
            .gt('expires_at', new Date().toISOString())
            .single(),
          'checkExistingPendingInvitation'
        )

        if (existingPending) {
          throw new DatabaseError('A pending invitation already exists for this email', 'INVITATION_ALREADY_EXISTS')
        }

        // Create pending invitation
        const { error: createPendingError } = await measureQuery(
          () => supabaseAdmin
            .from('fl_pending_invitations')
            .insert({
              project_id: projectId,
              email: invitation.email.toLowerCase(),
              role: invitation.role === 'admin' ? 'member' : 'member', // Map admin to member for now
              can_invite: invitation.can_invite || false,
              invited_by: inviterId
            }),
          'createPendingInvitation'
        )

        if (createPendingError) {
          if (createPendingError.code === '23505') {
            throw new DatabaseError('A pending invitation already exists for this email', 'INVITATION_ALREADY_EXISTS')
          }
          handleDatabaseError(createPendingError)
        }
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to invite user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove user from project
   */
  async removeUserFromProject(projectId: string, removerId: string, targetUserId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if remover can manage team
      const canManage = await this.canUserManageTeam(projectId, removerId)
      if (!canManage) {
        throw new DatabaseError('Insufficient permissions to remove users', 'INSUFFICIENT_PERMISSIONS')
      }

      // Cannot remove project owner
      const { data: project, error: projectError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('owner_id')
          .eq('id', projectId)
          .single(),
        'getProjectOwner'
      )

      if (projectError) {
        handleDatabaseError(projectError)
      }

      if (project.owner_id === targetUserId) {
        throw new DatabaseError('Cannot remove project owner', 'CANNOT_REMOVE_OWNER')
      }

      // Users cannot remove themselves
      if (removerId === targetUserId) {
        throw new DatabaseError('Cannot remove yourself from project', 'CANNOT_REMOVE_SELF')
      }

      // Remove user from project
      const { error: removeError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_project_invitations')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', targetUserId),
        'removeUserFromProject'
      )

      if (removeError) {
        handleDatabaseError(removeError)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to remove user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cancel pending invitation
   */
  async cancelPendingInvitation(projectId: string, cancellerId: string, invitationId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if canceller can manage team
      const canManage = await this.canUserManageTeam(projectId, cancellerId)
      if (!canManage) {
        throw new DatabaseError('Insufficient permissions to cancel invitations', 'INSUFFICIENT_PERMISSIONS')
      }

      // Cancel pending invitation
      const { error: cancelError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_pending_invitations')
          .delete()
          .eq('id', invitationId)
          .eq('project_id', projectId),
        'cancelPendingInvitation'
      )

      if (cancelError) {
        handleDatabaseError(cancelError)
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to cancel invitation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Get total reports
      const { count: totalReports, error: totalError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId),
        'getProjectTotalReports'
      )

      if (totalError) {
        handleDatabaseError(totalError)
      }

      // Get active reports
      const { count: activeReports, error: activeError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'active'),
        'getProjectActiveReports'
      )

      if (activeError) {
        handleDatabaseError(activeError)
      }

      // Get archived reports
      const { count: archivedReports, error: archivedError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('status', 'archived'),
        'getProjectArchivedReports'
      )

      if (archivedError) {
        handleDatabaseError(archivedError)
      }

      // Get bug reports
      const { count: bugReports, error: bugError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('type', 'bug'),
        'getProjectBugReports'
      )

      if (bugError) {
        handleDatabaseError(bugError)
      }

      // Get initiative reports
      const { count: initiativeReports, error: initiativeError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('type', 'initiative'),
        'getProjectInitiativeReports'
      )

      if (initiativeError) {
        handleDatabaseError(initiativeError)
      }

      // Get feedback reports
      const { count: feedbackReports, error: feedbackError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_reports')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .eq('type', 'feedback'),
        'getProjectFeedbackReports'
      )

      if (feedbackError) {
        handleDatabaseError(feedbackError)
      }

      // Get team member count
      const { count: teamMemberCount, error: teamError } = await measureQuery(
        () => supabaseAdmin
          .from('fl_project_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId),
        'getProjectTeamCount'
      )

      if (teamError) {
        handleDatabaseError(teamError)
      }

      return {
        totalReports: totalReports || 0,
        activeReports: activeReports || 0,
        archivedReports: archivedReports || 0,
        bugReports: bugReports || 0,
        initiativeReports: initiativeReports || 0,
        feedbackReports: feedbackReports || 0,
        teamMemberCount: teamMemberCount || 0
      }

    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError(`Failed to get project stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if user can manage project
   */
  async canUserManageProject(projectId: string, userId: string): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: project, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_projects')
          .select('owner_id')
          .eq('id', projectId)
          .single(),
        'checkProjectManagePermission'
      )

      if (error) {
        return false
      }

      return project.owner_id === userId

    } catch (error) {
      return false
    }
  }

  /**
   * Check if user can invite to project
   */
  async canUserInviteToProject(projectId: string, userId: string): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      // Check if user is owner
      const isOwner = await this.canUserManageProject(projectId, userId)
      if (isOwner) {
        return true
      }

      // Check if user is member with invite permissions
      const { data: invitation, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_project_invitations')
          .select('can_invite')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single(),
        'checkProjectInvitePermission'
      )

      if (error) {
        return false
      }

      return invitation.can_invite

    } catch (error) {
      return false
    }
  }

  /**
   * Check if user can manage team
   */
  async canUserManageTeam(projectId: string, userId: string): Promise<boolean> {
    // For now, only project owners can manage team
    return this.canUserManageProject(projectId, userId)
  }

  /**
   * Check if user has access to project
   */
  async hasUserProjectAccess(projectId: string, userId: string): Promise<boolean> {
    if (!supabaseAdmin) {
      throw new DatabaseError('Database connection not available')
    }

    try {
      const { data: invitation, error } = await measureQuery(
        () => supabaseAdmin
          .from('fl_project_invitations')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single(),
        'checkProjectAccess'
      )

      return !error && !!invitation

    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const projectService = ProjectService.getInstance()