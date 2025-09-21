/**
 * T021: Export Templates Management API
 * Enhanced Log Visualization - Phase 6: Export templates and scheduling
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

// Export template validation schema
const ExportTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  format: z.enum(['csv', 'json', 'excel', 'ndjson']),
  template_type: z.enum(['default', 'jira', 'azure_devops']),
  include_fields: z.object({
    title: z.boolean().default(true),
    description: z.boolean().default(true),
    type: z.boolean().default(true),
    priority: z.boolean().default(true),
    reporter: z.boolean().default(true),
    url: z.boolean().default(true),
    created_at: z.boolean().default(true),
    console_logs: z.boolean().default(false),
    network_requests: z.boolean().default(false),
    performance_metrics: z.boolean().default(false),
    interaction_data: z.boolean().default(false),
    error_context: z.boolean().default(false),
    user_agent: z.boolean().default(false),
    viewport: z.boolean().default(false),
    attachments: z.boolean().default(false)
  }),
  data_format: z.enum(['flattened', 'structured']).default('flattened'),
  compression: z.boolean().default(false),
  filters: z.object({
    type: z.enum(['bug', 'initiative', 'feedback', 'all']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
    dateRange: z.object({
      from: z.string().datetime().optional().nullable(),
      to: z.string().datetime().optional().nullable()
    }).optional()
  }).optional(),
  is_default: z.boolean().default(false)
})

const UpdateTemplateSchema = ExportTemplateSchema.partial()

/**
 * GET /api/projects/[id]/reports/export/templates - List export templates
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

    // Fetch templates for this project
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('fl_export_templates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (templatesError) {
      console.error('Error fetching export templates:', templatesError)
      return NextResponse.json(
        { error: 'Failed to fetch export templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      templates: templates || [],
      total: templates?.length || 0
    })

  } catch (error) {
    console.error('Export templates API error:', error)

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
 * POST /api/projects/[id]/reports/export/templates - Create export template
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

    // Check if user has access to this project
    const hasAccess = await ServerSession.hasProjectAccess(projectId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = ExportTemplateSchema.safeParse(body)

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

    const templateData = validation.data

    // If this is set as default, remove default from other templates
    if (templateData.is_default) {
      await supabaseAdmin
        .from('fl_export_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
    }

    // Create the template
    const { data: template, error: createError } = await supabaseAdmin
      .from('fl_export_templates')
      .insert({
        ...templateData,
        project_id: projectId,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating export template:', createError)
      return NextResponse.json(
        { error: 'Failed to create export template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      template,
      message: 'Export template created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create export template API error:', error)

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