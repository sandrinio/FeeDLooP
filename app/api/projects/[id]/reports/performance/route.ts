/**
 * Performance Metrics API Routes
 * Enhanced Log Visualization - Phase 4: Performance filtering and analysis
 *
 * GET /api/projects/[id]/reports/performance - Get performance metrics analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/database/supabase'
import { ServerSession } from '@/lib/auth/session'
import { z } from 'zod'
import { categorizePerformance, getPerformanceRecommendations } from '@/lib/utils/performance'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Performance filter schema
const PerformanceFiltersSchema = z.object({
  // Performance thresholds
  lcp_max: z.number().optional(), // Largest Contentful Paint max (ms)
  fcp_max: z.number().optional(), // First Contentful Paint max (ms)
  cls_max: z.number().optional(), // Cumulative Layout Shift max
  fid_max: z.number().optional(), // First Input Delay max (ms)
  tti_max: z.number().optional(), // Time to Interactive max (ms)
  ttfb_max: z.number().optional(), // Time to First Byte max (ms)

  // Performance categories
  category: z.enum(['critical', 'high', 'medium', 'low']).optional(),

  // Time range
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),

  // Sorting
  sort_by: z.enum(['lcp', 'fcp', 'cls', 'fid', 'tti', 'ttfb', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
})

/**
 * GET /api/projects/[id]/reports/performance - Performance metrics analysis
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const filterParams = {
      lcp_max: searchParams.get('lcp_max') ? parseFloat(searchParams.get('lcp_max')!) : undefined,
      fcp_max: searchParams.get('fcp_max') ? parseFloat(searchParams.get('fcp_max')!) : undefined,
      cls_max: searchParams.get('cls_max') ? parseFloat(searchParams.get('cls_max')!) : undefined,
      fid_max: searchParams.get('fid_max') ? parseFloat(searchParams.get('fid_max')!) : undefined,
      tti_max: searchParams.get('tti_max') ? parseFloat(searchParams.get('tti_max')!) : undefined,
      ttfb_max: searchParams.get('ttfb_max') ? parseFloat(searchParams.get('ttfb_max')!) : undefined,
      category: searchParams.get('category') as any,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      sort_by: (searchParams.get('sort_by') || 'created_at') as any,
      sort_order: (searchParams.get('sort_order') || 'desc') as any
    }

    // Validate filters
    const validation = PerformanceFiltersSchema.safeParse(filterParams)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid filter parameters',
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    const filters = validation.data
    const offset = (filters.page - 1) * filters.limit

    // Build base query for reports with performance metrics
    let query = supabaseAdmin
      .from('fl_reports')
      .select(`
        id,
        title,
        description,
        type,
        priority,
        reporter_email,
        reporter_name,
        url,
        created_at,
        updated_at,
        performance_metrics,
        error_context
      `)
      .eq('project_id', projectId)
      .not('performance_metrics', 'is', null) // Only reports with performance data

    // Apply performance metric filters using JSON operators
    if (filters.lcp_max !== undefined) {
      query = query.lte('performance_metrics->web_vitals->>lcp', filters.lcp_max.toString())
    }
    if (filters.fcp_max !== undefined) {
      query = query.lte('performance_metrics->web_vitals->>fcp', filters.fcp_max.toString())
    }
    if (filters.cls_max !== undefined) {
      query = query.lte('performance_metrics->web_vitals->>cls', filters.cls_max.toString())
    }
    if (filters.fid_max !== undefined) {
      query = query.lte('performance_metrics->web_vitals->>fid', filters.fid_max.toString())
    }
    if (filters.tti_max !== undefined) {
      query = query.lte('performance_metrics->web_vitals->>tti', filters.tti_max.toString())
    }
    if (filters.ttfb_max !== undefined) {
      query = query.lte('performance_metrics->web_vitals->>ttfb', filters.ttfb_max.toString())
    }

    // Apply category filter
    if (filters.category) {
      query = query.eq('performance_metrics->categorization->>overall', filters.category)
    }

    // Apply date filters
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    // Apply sorting - handle performance metrics sorting
    if (['lcp', 'fcp', 'cls', 'fid', 'tti', 'ttfb'].includes(filters.sort_by)) {
      // For performance metrics, we need to cast to numeric for proper sorting
      query = query.order(`performance_metrics->web_vitals->>${filters.sort_by}`, {
        ascending: filters.sort_order === 'asc'
      })
    } else {
      query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' })
    }

    // Apply pagination
    query = query.range(offset, offset + filters.limit - 1)

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching performance reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch performance reports' },
        { status: 500 }
      )
    }

    // Process reports to add performance analysis
    const processedReports = (reports || []).map(report => {
      const performanceMetrics = report.performance_metrics
      const webVitals = performanceMetrics?.web_vitals

      let analysis = null
      if (webVitals) {
        const category = categorizePerformance(webVitals)
        const recommendations = getPerformanceRecommendations(webVitals, category)

        analysis = {
          category: category.overall,
          score: category.score,
          details: category.details,
          recommendations: recommendations.slice(0, 3) // Top 3 recommendations
        }
      }

      return {
        ...report,
        performance_analysis: analysis,
        web_vitals: webVitals || null
      }
    })

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('fl_reports')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .not('performance_metrics', 'is', null)

    // Apply same filters to count query
    if (filters.lcp_max !== undefined) {
      countQuery = countQuery.lte('performance_metrics->web_vitals->>lcp', filters.lcp_max.toString())
    }
    if (filters.fcp_max !== undefined) {
      countQuery = countQuery.lte('performance_metrics->web_vitals->>fcp', filters.fcp_max.toString())
    }
    if (filters.cls_max !== undefined) {
      countQuery = countQuery.lte('performance_metrics->web_vitals->>cls', filters.cls_max.toString())
    }
    if (filters.fid_max !== undefined) {
      countQuery = countQuery.lte('performance_metrics->web_vitals->>fid', filters.fid_max.toString())
    }
    if (filters.tti_max !== undefined) {
      countQuery = countQuery.lte('performance_metrics->web_vitals->>tti', filters.tti_max.toString())
    }
    if (filters.ttfb_max !== undefined) {
      countQuery = countQuery.lte('performance_metrics->web_vitals->>ttfb', filters.ttfb_max.toString())
    }
    if (filters.category) {
      countQuery = countQuery.eq('performance_metrics->categorization->>overall', filters.category)
    }
    if (filters.date_from) {
      countQuery = countQuery.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      countQuery = countQuery.lte('created_at', filters.date_to)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting performance reports:', countError)
    }

    // Calculate performance statistics across all matching reports
    const stats = await calculatePerformanceStats(projectId, filters)

    return NextResponse.json({
      reports: processedReports,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / filters.limit),
        has_next: filters.page < Math.ceil((count || 0) / filters.limit),
        has_prev: filters.page > 1
      },
      statistics: stats,
      filters: filters
    })

  } catch (error) {
    console.error('Performance metrics API error:', error)

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
 * Calculate performance statistics for the project
 */
async function calculatePerformanceStats(projectId: string, filters: any) {
  try {
    // Get all performance metrics for statistical analysis
    let statsQuery = supabaseAdmin!
      .from('fl_reports')
      .select('performance_metrics, created_at')
      .eq('project_id', projectId)
      .not('performance_metrics', 'is', null)

    // Apply same filters
    if (filters.date_from) {
      statsQuery = statsQuery.gte('created_at', filters.date_from)
    }
    if (filters.date_to) {
      statsQuery = statsQuery.lte('created_at', filters.date_to)
    }

    const { data: performanceData } = await statsQuery

    if (!performanceData || performanceData.length === 0) {
      return {
        total_reports: 0,
        averages: null,
        distribution: null,
        trends: null
      }
    }

    // Calculate averages
    const webVitalsData = performanceData
      .map(d => d.performance_metrics?.web_vitals)
      .filter(Boolean)

    const averages = {
      lcp: calculateAverage(webVitalsData.map(wv => wv.lcp).filter(Boolean)),
      fcp: calculateAverage(webVitalsData.map(wv => wv.fcp).filter(Boolean)),
      cls: calculateAverage(webVitalsData.map(wv => wv.cls).filter(Boolean)),
      fid: calculateAverage(webVitalsData.map(wv => wv.fid).filter(Boolean)),
      tti: calculateAverage(webVitalsData.map(wv => wv.tti).filter(Boolean)),
      ttfb: calculateAverage(webVitalsData.map(wv => wv.ttfb).filter(Boolean))
    }

    // Calculate category distribution
    const categories = performanceData
      .map(d => d.performance_metrics?.categorization?.overall)
      .filter(Boolean)

    const distribution = {
      critical: categories.filter(c => c === 'critical').length,
      high: categories.filter(c => c === 'high').length,
      medium: categories.filter(c => c === 'medium').length,
      low: categories.filter(c => c === 'low').length
    }

    return {
      total_reports: performanceData.length,
      averages,
      distribution,
      trends: null // TODO: Implement trend analysis in future iterations
    }

  } catch (error) {
    console.error('Error calculating performance stats:', error)
    return {
      total_reports: 0,
      averages: null,
      distribution: null,
      trends: null,
      error: 'Failed to calculate statistics'
    }
  }
}

/**
 * Calculate average of an array of numbers
 */
function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sum = numbers.reduce((acc, num) => acc + num, 0)
  return Math.round((sum / numbers.length) * 100) / 100 // Round to 2 decimal places
}