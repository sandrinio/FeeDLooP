/**
 * Project Detail API Routes
 * T051: GET /api/projects/[id] endpoint implementation
 * T052: PUT /api/projects/[id] endpoint implementation
 * T053: DELETE /api/projects/[id] endpoint implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/projects/[id] - Get project details
 * Returns project details including team members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { id: projectId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Check if user has access to this project (either owner or team member)
    const hasAccess = await ServerSession.hasProjectAccess(projectId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Get project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('fl_projects')
      .select(`
        id,
        name,
        owner_id,
        integration_key,
        created_at,
        updated_at
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Error fetching project:', projectError)
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get project team members (including owner)
    const { data: teamMembers, error: membersError } = await supabaseAdmin
      .from('fl_project_invitations')
      .select(`
        user_id,
        role,
        can_invite,
        fl_users!inner(
          email,
          first_name,
          last_name
        )
      `)
      .eq('project_id', projectId)

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      // Continue without team members if there's an error
    }

    // Get pending invitations
    const { data: pendingInvitations, error: pendingError } = await supabaseAdmin
      .from('fl_pending_invitations')
      .select(`
        id,
        email,
        role,
        can_invite,
        expires_at,
        created_at
      `)
      .eq('project_id', projectId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    if (pendingError) {
      console.error('Error fetching pending invitations:', pendingError)
      // Continue without pending invitations if there's an error
    }

    // Get owner details
    const { data: ownerData, error: ownerError } = await supabaseAdmin
      .from('fl_users')
      .select('email, first_name, last_name')
      .eq('id', project.owner_id)
      .single()

    if (ownerError) {
      console.error('Error fetching owner details:', ownerError)
    }

    // Build members array
    const members = []

    // Add owner
    if (ownerData) {
      members.push({
        user_id: project.owner_id,
        email: ownerData.email,
        name: `${ownerData.first_name} ${ownerData.last_name}`.trim(),
        role: 'owner',
        can_invite: true,
        status: 'active'
      })
    }

    // Add team members (excluding owner to avoid duplication)
    if (teamMembers) {
      teamMembers.forEach(member => {
        if (member.user_id !== project.owner_id && member.fl_users) {
          members.push({
            user_id: member.user_id,
            email: member.fl_users.email,
            name: `${member.fl_users.first_name} ${member.fl_users.last_name}`.trim(),
            role: member.role,
            can_invite: member.can_invite,
            status: 'active'
          })
        }
      })
    }

    // Add pending invitations
    if (pendingInvitations) {
      pendingInvitations.forEach(pending => {
        members.push({
          invitation_id: pending.id,
          user_id: null,
          email: pending.email,
          name: null,
          role: pending.role,
          can_invite: pending.can_invite,
          status: 'pending',
          expires_at: pending.expires_at,
          created_at: pending.created_at
        })
      })
    }

    // Return project details with team members
    return NextResponse.json({
      id: project.id,
      name: project.name,
      owner_id: project.owner_id,
      integration_key: project.integration_key,
      created_at: project.created_at,
      members
    })

  } catch (error) {
    console.error('Project detail API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validation schema for project updates
const UpdateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .trim()
    .optional()
})

/**
 * PUT /api/projects/[id] - Update project
 * Updates project details (currently only name)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { id: projectId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateProjectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    // Check if user is the project owner (only owners can update projects)
    const { data: project, error: projectError } = await supabaseAdmin
      .from('fl_projects')
      .select('owner_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.owner_id !== user.user_id) {
      return NextResponse.json(
        { error: 'Only project owners can update projects' },
        { status: 403 }
      )
    }

    const updateData = validation.data

    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Update the project
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('fl_projects')
      .update(updatePayload)
      .eq('id', projectId)
      .select(`
        id,
        name,
        owner_id,
        integration_key,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating project:', updateError)

      // Handle duplicate name or other database errors
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'Project name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      )
    }

    // Return the updated project
    return NextResponse.json({
      id: updatedProject.id,
      name: updatedProject.name,
      owner_id: updatedProject.owner_id,
      integration_key: updatedProject.integration_key,
      created_at: updatedProject.created_at
    })

  } catch (error) {
    console.error('Project update API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id] - Delete project with enhanced storage cleanup
 * Deletes the project, all associated data, and storage files
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    const { id: projectId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Parse and validate request body if present (for enhanced deletion)
    let deletionRequest = null
    let isEnhancedDeletion = false

    try {
      const body = await request.text()
      if (body.trim()) {
        deletionRequest = JSON.parse(body)
        isEnhancedDeletion = true
      }
    } catch (parseError) {
      if (request.headers.get('content-type')?.includes('application/json')) {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }
      // If no JSON content-type, treat as simple deletion
    }

    // Get project details for validation
    const { data: project, error: projectError } = await supabaseAdmin
      .from('fl_projects')
      .select('owner_id, name')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    if (project.owner_id !== user.user_id) {
      return NextResponse.json(
        { error: 'Only project owners can delete projects' },
        { status: 403 }
      )
    }

    // Enhanced deletion with validation
    if (isEnhancedDeletion && deletionRequest) {
      const { ProjectDeletionRequestSchema, validateDeletionForm } = await import('@/lib/validation/project-settings')

      // Validate deletion request schema
      const validation = ProjectDeletionRequestSchema.safeParse(deletionRequest)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validation.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message
            }))
          },
          { status: 400 }
        )
      }

      // Validate deletion form with project name confirmation
      const formValidation = validateDeletionForm(validation.data, project.name)

      if (!formValidation.isValid) {
        const errorMessages = Object.values(formValidation.errors)
        return NextResponse.json(
          { error: errorMessages[0] || 'Validation failed' },
          { status: 400 }
        )
      }
    }

    // Enhanced deletion with storage cleanup
    if (isEnhancedDeletion) {
      const { StorageCleanupService } = await import('@/lib/storage/cleanup')

      // Count database records before deletion for reporting
      const { count: reportCount } = await supabaseAdmin
        .from('fl_reports')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      const { count: attachmentCount } = await supabaseAdmin
        .from('fl_attachments')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      const { count: invitationCount } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Perform storage cleanup first (before database deletion)
      console.log('Starting storage cleanup for project:', projectId)
      const cleanupSummary = await StorageCleanupService.gracefulCleanup(projectId)

      // Delete the project (cascade delete will handle related records)
      const { error: deleteError } = await supabaseAdmin
        .from('fl_projects')
        .delete()
        .eq('id', projectId)

      if (deleteError) {
        console.error('Error deleting project from database:', deleteError)
        return NextResponse.json(
          {
            error: 'Failed to delete project',
            error_details: {
              code: 'DATABASE_DELETE_ERROR',
              message: 'Project deletion failed during database operation',
              recoverable: true
            }
          },
          { status: 500 }
        )
      }

      // Calculate total database records deleted
      const totalDbRecords = 1 + (reportCount || 0) + (attachmentCount || 0) + (invitationCount || 0)
      cleanupSummary.database_records_deleted = totalDbRecords

      // Prepare enhanced response
      const response: any = {
        success: true,
        message: 'Project deleted successfully',
        cleanup_summary: cleanupSummary
      }

      // Include error details if there were storage cleanup failures
      if (cleanupSummary.storage_cleanup_failures.length > 0) {
        response.error_details = {
          code: 'PARTIAL_STORAGE_CLEANUP_FAILURE',
          message: `Storage cleanup completed with ${cleanupSummary.storage_cleanup_failures.length} failures`,
          recoverable: false
        }
      }

      return NextResponse.json(response)
    }

    // Simple deletion (backward compatibility)
    const { error: deleteError } = await supabaseAdmin
      .from('fl_projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error('Error deleting project:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    // Return 204 No Content for simple deletion (backward compatibility)
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Project delete API error:', error)

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}