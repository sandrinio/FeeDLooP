/**
 * Project Team Management API Routes
 * T054: POST /api/projects/[id]/invitations endpoint implementation
 * T055: DELETE /api/projects/[id]/invitations endpoint implementation
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

// Validation schema for team invitation
const InviteUserSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .trim()
    .toLowerCase(),
  role: z.enum(['member', 'admin']),
  can_invite: z.boolean().optional().default(false)
})

/**
 * POST /api/projects/[id]/invitations - Invite user to project
 * Adds a user to the project team with specified role
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const validation = InviteUserSchema.safeParse(body)

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

    // Check if user has permission to invite others to this project
    const hasInvitePermission = await ServerSession.canInviteToProject(projectId)

    if (!hasInvitePermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to invite users to this project' },
        { status: 403 }
      )
    }

    const { email, role, can_invite } = validation.data

    // Check if the target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('fl_users')
      .select('id, email, first_name, last_name')
      .eq('email', email)
      .single()

    // If user exists, handle as existing user invitation
    if (targetUser && !userError) {
      // Check if user is already a member of this project
      const { data: existingInvite, error: inviteCheckError } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', targetUser.id)
        .single()

      if (existingInvite) {
        return NextResponse.json(
          { error: 'User is already a member of this project' },
          { status: 409 }
        )
      }

      // Check if user is the project owner (owners don't need invitations)
      const { data: project, error: projectError } = await supabaseAdmin
        .from('fl_projects')
        .select('owner_id')
        .eq('id', projectId)
        .single()

      if (projectError) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      if (project.owner_id === targetUser.id) {
        return NextResponse.json(
          { error: 'Project owner cannot be invited as a team member' },
          { status: 400 }
        )
      }

      // Create the invitation for existing user
      const { data: invitation, error: createError } = await supabaseAdmin
        .from('fl_project_invitations')
        .insert({
          project_id: projectId,
          user_id: targetUser.id,
          role,
          can_invite
        })
        .select(`
          id,
          project_id,
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
        .single()

      if (createError) {
        console.error('Error creating invitation:', createError)
        return NextResponse.json(
          { error: 'Failed to invite user to project' },
          { status: 500 }
        )
      }

      // Return the invitation details for existing user
      return NextResponse.json({
        id: invitation.id,
        project_id: invitation.project_id,
        user_id: invitation.user_id,
        email: invitation.fl_users.email,
        name: `${invitation.fl_users.first_name} ${invitation.fl_users.last_name}`.trim(),
        role: invitation.role,
        can_invite: invitation.can_invite,
        status: 'active',
        created_at: invitation.created_at
      }, { status: 201 })
    }

    // User doesn't exist - create pending invitation

    // First check if there's already a pending invitation for this email
    const { data: existingPendingInvite, error: pendingCheckError } = await supabaseAdmin
      .from('fl_pending_invitations')
      .select('id')
      .eq('project_id', projectId)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingPendingInvite) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email address' },
        { status: 409 }
      )
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('fl_projects')
      .select('id, name')
      .eq('id', projectId)
      .single()

    if (projectError) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Create pending invitation
    const { data: pendingInvitation, error: pendingCreateError } = await supabaseAdmin
      .from('fl_pending_invitations')
      .insert({
        project_id: projectId,
        email,
        role,
        can_invite,
        invited_by: user.user_id
      })
      .select(`
        id,
        project_id,
        email,
        role,
        can_invite,
        invitation_token,
        expires_at,
        created_at
      `)
      .single()

    if (pendingCreateError) {
      console.error('Error creating pending invitation:', pendingCreateError)
      return NextResponse.json(
        { error: 'Failed to send invitation' },
        { status: 500 }
      )
    }

    // Return the pending invitation details
    return NextResponse.json({
      id: pendingInvitation.id,
      project_id: pendingInvitation.project_id,
      email: pendingInvitation.email,
      role: pendingInvitation.role,
      can_invite: pendingInvitation.can_invite,
      status: 'pending',
      expires_at: pendingInvitation.expires_at,
      created_at: pendingInvitation.created_at,
      message: `Invitation sent to ${email}. They will be added to the project when they register.`
    }, { status: 201 })

  } catch (error) {
    console.error('Project invitation API error:', error)

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

// Validation schema for removing team member or canceling pending invitation
const RemoveMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format').optional(),
  invitation_id: z.string().uuid('Invalid invitation ID format').optional(),
  is_pending: z.boolean().optional().default(false)
}).refine(data => data.user_id || data.invitation_id, {
  message: "Either user_id or invitation_id must be provided"
})

/**
 * DELETE /api/projects/[id]/invitations - Remove user from project
 * Removes a user from the project team
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

    // Parse and validate request body
    const body = await request.json()
    const validation = RemoveMemberSchema.safeParse(body)

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

    const { user_id: targetUserId, invitation_id: pendingInvitationId, is_pending } = validation.data

    // Check if user has permission to remove members from this project
    const hasRemovePermission = await ServerSession.canInviteToProject(projectId)

    if (!hasRemovePermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove users from this project' },
        { status: 403 }
      )
    }

    if (is_pending && pendingInvitationId) {
      // Handle pending invitation cancellation
      const { data: pendingInvitation, error: pendingError } = await supabaseAdmin
        .from('fl_pending_invitations')
        .select('id, email')
        .eq('project_id', projectId)
        .eq('id', pendingInvitationId)
        .is('accepted_at', null)
        .single()

      if (pendingError || !pendingInvitation) {
        return NextResponse.json(
          { error: 'Pending invitation not found' },
          { status: 404 }
        )
      }

      // Delete the pending invitation
      const { error: deleteError } = await supabaseAdmin
        .from('fl_pending_invitations')
        .delete()
        .eq('id', pendingInvitationId)

      if (deleteError) {
        console.error('Error canceling pending invitation:', deleteError)
        return NextResponse.json(
          { error: 'Failed to cancel invitation' },
          { status: 500 }
        )
      }
    } else if (targetUserId) {
      // Handle active member removal
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('fl_project_invitations')
        .select('id, user_id')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .single()

      if (inviteError || !invitation) {
        return NextResponse.json(
          { error: 'User is not a member of this project' },
          { status: 404 }
        )
      }

      // Users cannot remove themselves (they should use a leave project endpoint instead)
      if (targetUserId === user.user_id) {
        return NextResponse.json(
          { error: 'Cannot remove yourself from the project' },
          { status: 400 }
        )
      }

      // Remove the invitation/membership
      const { error: deleteError } = await supabaseAdmin
        .from('fl_project_invitations')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)

      if (deleteError) {
        console.error('Error removing user from project:', deleteError)
        return NextResponse.json(
          { error: 'Failed to remove user from project' },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid request: missing user_id or invitation_id' },
        { status: 400 }
      )
    }

    // Return 204 No Content for successful removal
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Project member removal API error:', error)

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