/**
 * Error Correlation API Routes
 * Enhanced Log Visualization - Phase 4: Intelligent error correlation and pattern detection
 *
 * GET /api/projects/[id]/reports/correlations - Get error correlations analysis
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

// Correlation analysis schema
const CorrelationFiltersSchema = z.object({
  // Report ID to analyze correlations for
  report_id: z.string().uuid().optional(),

  // Correlation types to include
  types: z.array(z.enum(['Error-Network', 'Performance-Resource', 'Timing-Sequence', 'Pattern-Match'])).optional(),

  // Minimum confidence threshold (0-100)
  min_confidence: z.number().min(0).max(100).default(50),

  // Time window for correlation analysis (hours)
  time_window: z.number().min(1).max(720).default(24), // Default 24 hours

  // Time range
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20)
})

type CorrelationType = 'Error-Network' | 'Performance-Resource' | 'Timing-Sequence' | 'Pattern-Match'

interface ErrorCorrelation {
  id: string
  type: CorrelationType
  confidence: number
  description: string
  evidence: any[]
  timeline: any[]
  related_reports: string[]
  pattern: string | null
  first_seen: string
  last_seen: string
  frequency: number
}

/**
 * GET /api/projects/[id]/reports/correlations - Error correlation analysis
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
      report_id: searchParams.get('report_id') || undefined,
      types: searchParams.get('types')?.split(',') as CorrelationType[] || undefined,
      min_confidence: parseInt(searchParams.get('min_confidence') || '50'),
      time_window: parseInt(searchParams.get('time_window') || '24'),
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    }

    // Validate filters
    const validation = CorrelationFiltersSchema.safeParse(filterParams)
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

    // Get reports with error context data for analysis
    const reportsData = await getReportsForCorrelation(projectId, filters)

    if (!reportsData || reportsData.length === 0) {
      return NextResponse.json({
        correlations: [],
        summary: {
          total_correlations: 0,
          confidence_score: 0,
          types_found: [],
          analysis_window: `${filters.time_window} hours`
        },
        patterns: [],
        insights: [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      })
    }

    // Perform correlation analysis
    const correlations = await analyzeErrorCorrelations(reportsData, filters)

    // Detect patterns across multiple reports
    const patterns = await detectErrorPatterns(reportsData, filters)

    // Generate insights and recommendations
    const insights = await generateCorrelationInsights(correlations, patterns)

    // Apply pagination to correlations
    const offset = (filters.page - 1) * filters.limit
    const paginatedCorrelations = correlations.slice(offset, offset + filters.limit)

    // Calculate summary statistics
    const summary = {
      total_correlations: correlations.length,
      confidence_score: correlations.length > 0
        ? Math.round(correlations.reduce((sum, c) => sum + c.confidence, 0) / correlations.length)
        : 0,
      types_found: [...new Set(correlations.map(c => c.type))],
      analysis_window: `${filters.time_window} hours`
    }

    return NextResponse.json({
      correlations: paginatedCorrelations,
      summary,
      patterns,
      insights,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: correlations.length,
        total_pages: Math.ceil(correlations.length / filters.limit),
        has_next: filters.page < Math.ceil(correlations.length / filters.limit),
        has_prev: filters.page > 1
      }
    })

  } catch (error) {
    console.error('Error correlation API error:', error)

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
 * Get reports data for correlation analysis
 */
async function getReportsForCorrelation(projectId: string, filters: any) {
  let query = supabaseAdmin!
    .from('fl_reports')
    .select(`
      id,
      title,
      description,
      type,
      created_at,
      url,
      console_logs,
      network_requests,
      performance_metrics,
      error_context
    `)
    .eq('project_id', projectId)

  // Filter by specific report if provided
  if (filters.report_id) {
    query = query.eq('id', filters.report_id)
  }

  // Apply date filters
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to)
  } else {
    // Default to time window from now
    const windowStart = new Date()
    windowStart.setHours(windowStart.getHours() - filters.time_window)
    query = query.gte('created_at', windowStart.toISOString())
  }

  // Order by creation time for temporal analysis
  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching reports for correlation:', error)
    return []
  }

  return data || []
}

/**
 * Analyze error correlations across reports
 */
async function analyzeErrorCorrelations(reports: any[], filters: any): Promise<ErrorCorrelation[]> {
  const correlations: ErrorCorrelation[] = []

  // Error-Network correlations
  const errorNetworkCorrelations = analyzeErrorNetworkCorrelations(reports)
  correlations.push(...errorNetworkCorrelations)

  // Performance-Resource correlations
  const performanceResourceCorrelations = analyzePerformanceResourceCorrelations(reports)
  correlations.push(...performanceResourceCorrelations)

  // Timing-Sequence correlations
  const timingSequenceCorrelations = analyzeTimingSequenceCorrelations(reports)
  correlations.push(...timingSequenceCorrelations)

  // Pattern-Match correlations
  const patternMatchCorrelations = analyzePatternMatchCorrelations(reports)
  correlations.push(...patternMatchCorrelations)

  // Filter by confidence threshold
  const filteredCorrelations = correlations.filter(c => c.confidence >= filters.min_confidence)

  // Filter by types if specified
  if (filters.types && filters.types.length > 0) {
    return filteredCorrelations.filter(c => filters.types.includes(c.type))
  }

  return filteredCorrelations.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Analyze Error-Network correlations
 */
function analyzeErrorNetworkCorrelations(reports: any[]): ErrorCorrelation[] {
  const correlations: ErrorCorrelation[] = []

  for (const report of reports) {
    if (!report.error_context?.unhandled_errors || !report.network_requests) continue

    const errors = report.error_context.unhandled_errors
    const networkRequests = report.network_requests

    // Find errors that occur close in time to failed network requests
    for (const error of errors) {
      const errorTime = new Date(error.timestamp).getTime()

      for (const request of networkRequests) {
        if (!request.name || !request.duration) continue

        const requestTime = new Date(request.startTime || report.created_at).getTime()
        const timeDiff = Math.abs(errorTime - requestTime)

        // Correlation if error occurs within 5 seconds of network request
        if (timeDiff < 5000) {
          const confidence = Math.max(50, 90 - (timeDiff / 1000) * 5) // Higher confidence for closer timing

          correlations.push({
            id: `error-network-${report.id}-${errors.indexOf(error)}`,
            type: 'Error-Network',
            confidence: Math.round(confidence),
            description: `Error "${error.message}" correlates with network request to ${request.name}`,
            evidence: [
              {
                type: 'error',
                message: error.message,
                timestamp: error.timestamp,
                stack: error.stack
              },
              {
                type: 'network_request',
                url: request.name,
                duration: request.duration,
                timestamp: request.startTime
              }
            ],
            timeline: [
              {
                timestamp: request.startTime || report.created_at,
                event: 'Network request started',
                type: 'network'
              },
              {
                timestamp: error.timestamp,
                event: 'Error occurred',
                type: 'error'
              }
            ],
            related_reports: [report.id],
            pattern: null,
            first_seen: error.timestamp,
            last_seen: error.timestamp,
            frequency: 1
          })
        }
      }
    }
  }

  return correlations
}

/**
 * Analyze Performance-Resource correlations
 */
function analyzePerformanceResourceCorrelations(reports: any[]): ErrorCorrelation[] {
  const correlations: ErrorCorrelation[] = []

  for (const report of reports) {
    if (!report.performance_metrics?.web_vitals || !report.network_requests) continue

    const webVitals = report.performance_metrics.web_vitals
    const networkRequests = report.network_requests

    // Analyze LCP correlation with resource loading
    if (webVitals.lcp > 4000) { // Poor LCP threshold
      const largeResources = networkRequests.filter(req => req.duration > 1000)

      if (largeResources.length > 0) {
        const confidence = Math.min(95, 60 + largeResources.length * 10)

        correlations.push({
          id: `perf-resource-${report.id}-lcp`,
          type: 'Performance-Resource',
          confidence: Math.round(confidence),
          description: `Poor LCP (${webVitals.lcp}ms) correlates with ${largeResources.length} slow resource(s)`,
          evidence: [
            {
              type: 'performance_metric',
              metric: 'lcp',
              value: webVitals.lcp,
              threshold: 4000
            },
            ...largeResources.map(resource => ({
              type: 'slow_resource',
              url: resource.name,
              duration: resource.duration
            }))
          ],
          timeline: largeResources.map(resource => ({
            timestamp: resource.startTime || report.created_at,
            event: `Slow resource: ${resource.name} (${resource.duration}ms)`,
            type: 'resource'
          })),
          related_reports: [report.id],
          pattern: 'slow-resources-poor-lcp',
          first_seen: report.created_at,
          last_seen: report.created_at,
          frequency: 1
        })
      }
    }
  }

  return correlations
}

/**
 * Analyze Timing-Sequence correlations
 */
function analyzeTimingSequenceCorrelations(reports: any[]): ErrorCorrelation[] {
  const correlations: ErrorCorrelation[] = []

  for (const report of reports) {
    if (!report.console_logs) continue

    const logs = report.console_logs
    const errorLogs = logs.filter(log => log.level === 'error')

    // Look for error sequences (multiple errors within short timeframe)
    for (let i = 0; i < errorLogs.length - 1; i++) {
      const currentError = errorLogs[i]
      const nextError = errorLogs[i + 1]

      const timeDiff = new Date(nextError.timestamp).getTime() - new Date(currentError.timestamp).getTime()

      // Correlation if errors occur within 2 seconds of each other
      if (timeDiff < 2000) {
        const confidence = Math.max(60, 85 - (timeDiff / 1000) * 10)

        correlations.push({
          id: `timing-sequence-${report.id}-${i}`,
          type: 'Timing-Sequence',
          confidence: Math.round(confidence),
          description: `Error sequence detected: "${currentError.message}" followed by "${nextError.message}"`,
          evidence: [
            {
              type: 'error_sequence',
              first_error: currentError.message,
              second_error: nextError.message,
              time_difference: timeDiff
            }
          ],
          timeline: [
            {
              timestamp: currentError.timestamp,
              event: `First error: ${currentError.message}`,
              type: 'error'
            },
            {
              timestamp: nextError.timestamp,
              event: `Second error: ${nextError.message}`,
              type: 'error'
            }
          ],
          related_reports: [report.id],
          pattern: 'error-cascade',
          first_seen: currentError.timestamp,
          last_seen: nextError.timestamp,
          frequency: 1
        })
      }
    }
  }

  return correlations
}

/**
 * Analyze Pattern-Match correlations
 */
function analyzePatternMatchCorrelations(reports: any[]): ErrorCorrelation[] {
  const correlations: ErrorCorrelation[] = []

  // Common error patterns to detect
  const errorPatterns = [
    {
      pattern: /Cannot read property .* of undefined/,
      name: 'undefined-property-access',
      description: 'Undefined property access pattern'
    },
    {
      pattern: /TypeError: .* is not a function/,
      name: 'not-a-function',
      description: 'Function call on non-function pattern'
    },
    {
      pattern: /ReferenceError: .* is not defined/,
      name: 'undefined-reference',
      description: 'Undefined variable reference pattern'
    },
    {
      pattern: /NetworkError|Failed to fetch|ERR_NETWORK/,
      name: 'network-error',
      description: 'Network connectivity error pattern'
    }
  ]

  // Group errors by pattern across all reports
  const patternMatches = new Map<string, any[]>()

  for (const report of reports) {
    if (!report.error_context?.unhandled_errors) continue

    for (const error of report.error_context.unhandled_errors) {
      for (const pattern of errorPatterns) {
        if (pattern.pattern.test(error.message)) {
          const key = pattern.name
          if (!patternMatches.has(key)) {
            patternMatches.set(key, [])
          }
          patternMatches.get(key)!.push({
            ...error,
            report_id: report.id,
            report_created_at: report.created_at,
            pattern_info: pattern
          })
        }
      }
    }
  }

  // Create correlations for patterns that appear multiple times
  for (const [patternName, matches] of patternMatches) {
    if (matches.length > 1) {
      const confidence = Math.min(95, 50 + matches.length * 15)
      const patternInfo = matches[0].pattern_info

      correlations.push({
        id: `pattern-match-${patternName}`,
        type: 'Pattern-Match',
        confidence: Math.round(confidence),
        description: `${patternInfo.description} detected in ${matches.length} report(s)`,
        evidence: matches.map(match => ({
          type: 'pattern_match',
          message: match.message,
          timestamp: match.timestamp,
          report_id: match.report_id,
          frequency: match.frequency || 1
        })),
        timeline: matches.map(match => ({
          timestamp: match.timestamp,
          event: `Pattern match: ${match.message}`,
          type: 'error',
          report_id: match.report_id
        })),
        related_reports: [...new Set(matches.map(m => m.report_id))],
        pattern: patternName,
        first_seen: matches.reduce((earliest, match) =>
          match.timestamp < earliest ? match.timestamp : earliest, matches[0].timestamp),
        last_seen: matches.reduce((latest, match) =>
          match.timestamp > latest ? match.timestamp : latest, matches[0].timestamp),
        frequency: matches.length
      })
    }
  }

  return correlations
}

/**
 * Detect error patterns across multiple reports
 */
async function detectErrorPatterns(reports: any[], filters: any) {
  const patterns = []

  // URL-based patterns
  const urlPatterns = new Map<string, any[]>()
  for (const report of reports) {
    if (report.url && report.error_context?.total_error_count > 0) {
      const urlKey = new URL(report.url).pathname
      if (!urlPatterns.has(urlKey)) {
        urlPatterns.set(urlKey, [])
      }
      urlPatterns.get(urlKey)!.push(report)
    }
  }

  // Find URLs with multiple error reports
  for (const [urlPath, urlReports] of urlPatterns) {
    if (urlReports.length > 1) {
      patterns.push({
        type: 'url-error-frequency',
        description: `Multiple error reports from URL path: ${urlPath}`,
        occurrences: urlReports.length,
        affected_reports: urlReports.map(r => r.id),
        first_seen: urlReports.reduce((earliest, r) =>
          r.created_at < earliest ? r.created_at : earliest, urlReports[0].created_at),
        last_seen: urlReports.reduce((latest, r) =>
          r.created_at > latest ? r.created_at : latest, urlReports[0].created_at)
      })
    }
  }

  return patterns
}

/**
 * Generate insights and recommendations from correlations
 */
async function generateCorrelationInsights(correlations: ErrorCorrelation[], patterns: any[]) {
  const insights = []

  // Performance-related insights
  const performanceCorrelations = correlations.filter(c => c.type === 'Performance-Resource')
  if (performanceCorrelations.length > 0) {
    insights.push({
      type: 'Performance',
      title: 'Resource Loading Issues Detected',
      description: `${performanceCorrelations.length} correlations found between poor performance metrics and slow resource loading`,
      impact: 'High',
      recommendation: 'Optimize resource loading by implementing code splitting, lazy loading, and CDN usage',
      affected_reports: performanceCorrelations.length
    })
  }

  // Error pattern insights
  const patternCorrelations = correlations.filter(c => c.type === 'Pattern-Match')
  if (patternCorrelations.length > 0) {
    insights.push({
      type: 'Error Pattern',
      title: 'Recurring Error Patterns Found',
      description: `${patternCorrelations.length} error patterns detected across multiple reports`,
      impact: 'Medium',
      recommendation: 'Implement defensive programming practices and add null checks for common error patterns',
      affected_reports: patternCorrelations.reduce((sum, c) => sum + c.frequency, 0)
    })
  }

  // Network-related insights
  const networkCorrelations = correlations.filter(c => c.type === 'Error-Network')
  if (networkCorrelations.length > 0) {
    insights.push({
      type: 'Network Issue',
      title: 'Network-Related Errors Detected',
      description: `${networkCorrelations.length} correlations found between errors and network requests`,
      impact: 'Medium',
      recommendation: 'Implement proper error handling for network requests and add retry mechanisms',
      affected_reports: networkCorrelations.length
    })
  }

  // User experience insights
  const highConfidenceCorrelations = correlations.filter(c => c.confidence > 80)
  if (highConfidenceCorrelations.length > 0) {
    insights.push({
      type: 'User Experience',
      title: 'High-Confidence Error Correlations',
      description: `${highConfidenceCorrelations.length} high-confidence correlations may significantly impact user experience`,
      impact: 'High',
      recommendation: 'Prioritize fixing these high-confidence correlations to improve user experience',
      affected_reports: highConfidenceCorrelations.length
    })
  }

  return insights
}