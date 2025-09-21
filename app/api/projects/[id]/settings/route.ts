/**
 * Project Settings API Route
 * T013: GET /api/projects/[id]/settings endpoint implementation
 *
 * Provides project settings data including statistics and permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { ServerSession } from '@/lib/auth/session'
import { ProjectSettingsService } from '@/lib/services/project-settings'
import { ProjectSettingsQuerySchema } from '@/lib/validation/project-settings'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/projects/[id]/settings - Get project settings data
 * Returns project settings including statistics and permissions
 * Only accessible to project owners
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authentication
    const user = await ServerSession.requireAuth()

    const { id: projectId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams.entries())

    // Convert string values to booleans for validation
    const queryParams = {
      include_statistics: searchParams.include_statistics === 'false' ? false : true,
      include_permissions: searchParams.include_permissions === 'false' ? false : true
    }

    const validation = ProjectSettingsQuerySchema.safeParse(queryParams)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    // Check if user has settings access (must be project owner)
    const hasAccess = await ProjectSettingsService.validateSettingsAccess(projectId, user.user_id)

    if (!hasAccess) {
      // Check if project exists to provide appropriate error
      const projectExists = await ProjectSettingsService.projectExists(projectId)

      if (!projectExists) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Access denied - only project owners can access settings' },
        { status: 403 }
      )
    }

    // Get project settings data
    const settingsData = await ProjectSettingsService.getProjectSettings(projectId, user.user_id)

    if (!settingsData) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Filter response based on query parameters
    const response: any = {
      project: settingsData.project
    }

    if (validation.data.include_statistics) {
      response.statistics = settingsData.statistics
    }

    if (validation.data.include_permissions) {
      response.permissions = settingsData.permissions
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Project settings API error:', error)

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