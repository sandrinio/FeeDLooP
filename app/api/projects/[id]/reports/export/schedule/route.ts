/**
 * T023: Export Scheduling API
 * Enhanced Log Visualization - Phase 6: Scheduled export management
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

// Scheduled export validation schema
const ScheduledExportSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  name: z.string().min(1, 'Schedule name is required').max(100, 'Schedule name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  schedule_cron: z.string().regex(
    /^(\*|[0-5]?\d) (\*|[01]?\d|2[0-3]) (\*|[012]?\d|3[01]) (\*|[0]?\d|1[0-2]) (\*|[0-6])$/,
    'Invalid cron expression format'
  ),
  is_active: z.boolean().default(true),
  export_filters: z.object({
    type: z.enum(['bug', 'initiative', 'feedback', 'all']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
    dateRange: z.object({
      from: z.string().datetime().optional().nullable(),
      to: z.string().datetime().optional().nullable()
    }).optional()
  }).optional(),
  notification_emails: z.array(z.string().email('Invalid email address')).optional()
})

const UpdateScheduledExportSchema = ScheduledExportSchema.partial()

/**
 * GET /api/projects/[id]/reports/export/schedule - List scheduled exports
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

    // Check if user has access to this project
    const hasAccess = await ServerSession.hasProjectAccess(projectId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch scheduled exports with template information
    const { data: scheduledExports, error: exportsError } = await supabaseAdmin
      .from('fl_scheduled_exports')
      .select(`
        *,
        fl_export_templates (
          id,
          name,
          format,
          template_type
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (exportsError) {
      console.error('Error fetching scheduled exports:', exportsError)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled exports' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      scheduled_exports: scheduledExports || [],
      total: scheduledExports?.length || 0
    })

  } catch (error) {
    console.error('Scheduled exports API error:', error)

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

/**
 * POST /api/projects/[id]/reports/export/schedule - Create scheduled export
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

    // Check if user has admin access to this project
    const hasAccess = await ServerSession.hasProjectAccess(projectId, ['owner', 'admin'])

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or insufficient permissions' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = ScheduledExportSchema.safeParse(body)

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

    const scheduleData = validation.data

    // Verify template exists and belongs to project
    const { data: template, error: templateError } = await supabaseAdmin
      .from('fl_export_templates')
      .select('id')
      .eq('id', scheduleData.template_id)
      .eq('project_id', projectId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or does not belong to project' },
        { status: 400 }
      )
    }

    // Calculate next run time based on cron expression
    const nextRunAt = calculateNextRun(scheduleData.schedule_cron)

    // Create the scheduled export
    const { data: scheduledExport, error: createError } = await supabaseAdmin
      .from('fl_scheduled_exports')
      .insert({
        ...scheduleData,
        project_id: projectId,
        next_run_at: nextRunAt,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        fl_export_templates (
          id,
          name,
          format,
          template_type
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating scheduled export:', createError)
      return NextResponse.json(
        { error: 'Failed to create scheduled export' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      scheduled_export: scheduledExport,
      message: 'Scheduled export created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create scheduled export API error:', error)

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
 * Calculate next run time for a cron expression
 * This is a simplified implementation - in production, use a proper cron library
 */
function calculateNextRun(cronExpression: string): string {
  // For now, return 1 hour from now as a placeholder
  // In production, you would use a library like 'node-cron' or 'cron-parser'
  const nextRun = new Date()
  nextRun.setHours(nextRun.getHours() + 1)
  return nextRun.toISOString()
}

/**
 * Helper function to validate cron expression format
 */
function isValidCronExpression(cron: string): boolean {
  const cronParts = cron.split(' ')
  if (cronParts.length !== 5) return false

  // Basic validation - in production, use a proper cron validation library
  const patterns = [
    /^(\*|[0-5]?\d)$/, // minutes
    /^(\*|[01]?\d|2[0-3])$/, // hours
    /^(\*|[012]?\d|3[01])$/, // day of month
    /^(\*|[0]?\d|1[0-2])$/, // month
    /^(\*|[0-6])$/ // day of week
  ]

  return cronParts.every((part, index) => patterns[index].test(part))
}