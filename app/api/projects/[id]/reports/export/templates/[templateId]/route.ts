/**
 * T022: Individual Export Template Management API
 * Enhanced Log Visualization - Phase 6: Template CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
    templateId: string
  }>
}

// Update template validation schema
const UpdateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  format: z.enum(['csv', 'json', 'excel', 'ndjson']).optional(),
  template_type: z.enum(['default', 'jira', 'azure_devops']).optional(),
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
  }).optional(),
  data_format: z.enum(['flattened', 'structured']).optional(),
  compression: z.boolean().optional(),
  filters: z.object({
    type: z.enum(['bug', 'initiative', 'feedback', 'all']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical', 'all']).optional(),
    dateRange: z.object({
      from: z.string().datetime().optional().nullable(),
      to: z.string().datetime().optional().nullable()
    }).optional()
  }).optional(),
  is_default: z.boolean().optional()
})

/**
 * GET /api/projects/[id]/reports/export/templates/[templateId] - Get specific template
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

    const { id: projectId, templateId } = await params

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId) || !uuidRegex.test(templateId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Fetch the specific template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('fl_export_templates')
      .select('*')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })

  } catch (error) {
    console.error('Get export template API error:', error)

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
 * PUT /api/projects/[id]/reports/export/templates/[templateId] - Update template
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

    const { id: projectId, templateId } = await params

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId) || !uuidRegex.test(templateId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Check if template exists and belongs to project
    const { data: existingTemplate, error: checkError } = await supabaseAdmin
      .from('fl_export_templates')
      .select('id')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single()

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = UpdateTemplateSchema.safeParse(body)

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

    const updateData = validation.data

    // If this is set as default, remove default from other templates
    if (updateData.is_default) {
      await supabaseAdmin
        .from('fl_export_templates')
        .update({ is_default: false })
        .eq('project_id', projectId)
        .neq('id', templateId)
    }

    // Update the template
    const { data: template, error: updateError } = await supabaseAdmin
      .from('fl_export_templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('project_id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating export template:', updateError)
      return NextResponse.json(
        { error: 'Failed to update export template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      template,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Update export template API error:', error)

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
 * DELETE /api/projects/[id]/reports/export/templates/[templateId] - Delete template
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

    const { id: projectId, templateId } = await params

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId) || !uuidRegex.test(templateId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Check if template exists and belongs to project
    const { data: existingTemplate, error: checkError } = await supabaseAdmin
      .from('fl_export_templates')
      .select('id, is_default')
      .eq('id', templateId)
      .eq('project_id', projectId)
      .single()

    if (checkError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of default template if it's the only one
    if (existingTemplate.is_default) {
      const { data: allTemplates, error: countError } = await supabaseAdmin
        .from('fl_export_templates')
        .select('id')
        .eq('project_id', projectId)

      if (!countError && allTemplates && allTemplates.length === 1) {
        return NextResponse.json(
          { error: 'Cannot delete the only remaining template' },
          { status: 400 }
        )
      }
    }

    // Delete the template
    const { error: deleteError } = await supabaseAdmin
      .from('fl_export_templates')
      .delete()
      .eq('id', templateId)
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Error deleting export template:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete export template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Delete export template API error:', error)

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