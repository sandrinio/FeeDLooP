/**
 * Projects API Routes
 * T049: GET /api/projects endpoint implementation
 * T050: POST /api/projects endpoint implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'

/**
 * GET /api/projects - List user's projects
 * Returns all projects where the user is either the owner or a team member
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Get projects where user is owner or team member
    // First get projects where user is owner
    const { data: ownedProjects, error: ownedError } = await supabaseAdmin
      .from('fl_projects')
      .select(`
        id,
        name,
        owner_id,
        integration_key,
        created_at,
        updated_at
      `)
      .eq('owner_id', user.user_id)

    if (ownedError) {
      console.error('Error fetching owned projects:', ownedError)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    // Then get projects where user is a team member
    const { data: memberProjects, error: memberError } = await supabaseAdmin
      .from('fl_project_invitations')
      .select(`
        project_id,
        fl_projects!inner(
          id,
          name,
          owner_id,
          integration_key,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.user_id)

    if (memberError) {
      console.error('Error fetching member projects:', memberError)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    // Combine and deduplicate projects
    const allProjects = new Map()

    // Add owned projects
    if (ownedProjects) {
      ownedProjects.forEach(project => {
        allProjects.set(project.id, {
          id: project.id,
          name: project.name,
          owner_id: project.owner_id,
          integration_key: project.integration_key,
          created_at: project.created_at
        })
      })
    }

    // Add member projects (avoid duplicates)
    if (memberProjects) {
      memberProjects.forEach(membership => {
        const project = membership.fl_projects
        if (project && !allProjects.has(project.id)) {
          allProjects.set(project.id, {
            id: project.id,
            name: project.name,
            owner_id: project.owner_id,
            integration_key: project.integration_key,
            created_at: project.created_at
          })
        }
      })
    }

    // Convert to array and sort by created_at descending
    const projects = Array.from(allProjects.values()).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json(projects)

  } catch (error) {
    console.error('Projects API error:', error)

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

// Validation schema for project creation
const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .trim()
})

/**
 * POST /api/projects - Create new project
 * Creates a new project with the authenticated user as owner
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateProjectSchema.safeParse(body)

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

    const { name } = validation.data

    // Generate a unique integration key
    const generateIntegrationKey = (): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }

    // Create the project
    const { data: project, error: createError } = await supabaseAdmin
      .from('fl_projects')
      .insert({
        name,
        owner_id: user.user_id,
        integration_key: generateIntegrationKey()
      })
      .select(`
        id,
        name,
        owner_id,
        integration_key,
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('Error creating project:', createError)

      // Handle duplicate name or other database errors
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Project name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
    }

    // Return the created project matching the API contract
    return NextResponse.json({
      id: project.id,
      name: project.name,
      owner_id: project.owner_id,
      integration_key: project.integration_key,
      created_at: project.created_at
    }, { status: 201 })

  } catch (error) {
    console.error('Projects POST API error:', error)

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