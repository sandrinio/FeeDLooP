/**
 * Error Correlation Visualization Component
 * Enhanced Log Visualization - Phase 5: Error correlation and pattern display
 *
 * Displays intelligent error correlations with filtering, pattern detection,
 * and actionable insights.
 */

'use client'

import React, { useState, useMemo } from 'react'
import {
  ExclamationTriangleIcon,
  LinkIcon,
  ClockIcon,
  FunnelIcon,
  ChartBarIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// Types for error correlation data
interface ErrorCorrelation {
  id: string
  type: 'Error-Network' | 'Performance-Resource' | 'Timing-Sequence' | 'Pattern-Match'
  confidence: number
  description: string
  evidence: any[]
  timeline: TimelineEvent[]
  related_reports: string[]
  pattern: string | null
  first_seen: string
  last_seen: string
  frequency: number
}

interface TimelineEvent {
  timestamp: string
  event: string
  type: 'error' | 'network' | 'resource' | 'performance'
  report_id?: string
}

interface ErrorPattern {
  type: string
  description: string
  occurrences: number
  affected_reports: string[]
  first_seen: string
  last_seen: string
}

interface CorrelationInsight {
  type: 'Performance' | 'Error Pattern' | 'Network Issue' | 'User Experience'
  title: string
  description: string
  impact: 'High' | 'Medium' | 'Low'
  recommendation: string
  affected_reports: number
}

interface ErrorCorrelationProps {
  correlations: ErrorCorrelation[]
  patterns: ErrorPattern[]
  insights: CorrelationInsight[]
  summary: {
    total_correlations: number
    confidence_score: number
    types_found: string[]
    analysis_window: string
  }
  loading?: boolean
  onCorrelationClick?: (correlation: ErrorCorrelation) => void
  onPatternClick?: (pattern: ErrorPattern) => void
  className?: string
}

export default function ErrorCorrelation({
  correlations,
  patterns,
  insights,
  summary,
  loading = false,
  onCorrelationClick,
  onPatternClick,
  className = ''
}: ErrorCorrelationProps) {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState<string>('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all')
  const [expandedCorrelation, setExpandedCorrelation] = useState<string | null>(null)
  const [showPatterns, setShowPatterns] = useState(true)
  const [showInsights, setShowInsights] = useState(true)

  // Filter correlations based on selected filters
  const filteredCorrelations = useMemo(() => {
    return correlations.filter(correlation => {
      // Type filter
      if (selectedTypeFilter !== 'all' && correlation.type !== selectedTypeFilter) {
        return false
      }

      // Confidence filter
      if (selectedConfidenceFilter === 'high' && correlation.confidence <= 80) return false
      if (selectedConfidenceFilter === 'medium' && (correlation.confidence <= 50 || correlation.confidence > 80)) return false
      if (selectedConfidenceFilter === 'low' && correlation.confidence > 50) return false

      // Time range filter would be applied server-side in real implementation
      return true
    })
  }, [correlations, selectedTypeFilter, selectedConfidenceFilter])

  // Get correlation strength visualization
  const getCorrelationStrength = (confidence: number) => {
    if (confidence >= 90) return { level: 'very-high', color: 'bg-red-500', width: '100%' }
    if (confidence >= 80) return { level: 'high', color: 'bg-orange-500', width: '80%' }
    if (confidence >= 60) return { level: 'medium', color: 'bg-yellow-500', width: '60%' }
    if (confidence >= 40) return { level: 'low', color: 'bg-blue-500', width: '40%' }
    return { level: 'very-low', color: 'bg-gray-400', width: '20%' }
  }

  // Get type icon and color
  const getTypeDisplay = (type: ErrorCorrelation['type']) => {
    switch (type) {
      case 'Error-Network':
        return { icon: LinkIcon, color: 'text-red-600 bg-red-50', label: 'Error-Network' }
      case 'Performance-Resource':
        return { icon: ChartBarIcon, color: 'text-orange-600 bg-orange-50', label: 'Performance-Resource' }
      case 'Timing-Sequence':
        return { icon: ClockIcon, color: 'text-blue-600 bg-blue-50', label: 'Timing-Sequence' }
      case 'Pattern-Match':
        return { icon: MagnifyingGlassIcon, color: 'text-purple-600 bg-purple-50', label: 'Pattern-Match' }
    }
  }

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4" data-testid="correlation-analysis-loading">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500" data-testid="analysis-progress">
              Analyzing error correlations...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (correlations.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} data-testid="error-correlation">
        <div className="text-center py-8" data-testid="empty-correlation-state">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No error correlations detected</h3>
          <p className="text-gray-500 mb-2">
            No correlation analysis patterns were found in the current data set.
          </p>
          <p className="text-sm text-gray-400">
            Correlations appear when there are more data points available for analysis.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`} data-testid="error-correlation">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Error Correlation Analysis</h3>
          <button
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
            data-testid="export-correlations"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4" data-testid="correlation-summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Correlations</div>
              <div className="text-2xl font-semibold text-gray-900" data-testid="total-correlations">
                {summary.total_correlations}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Confidence Score</div>
              <div className="text-2xl font-semibold text-gray-900" data-testid="confidence-score">
                {summary.confidence_score}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Types Found</div>
              <div className="text-sm text-gray-900">
                {summary.types_found.join(', ') || 'None'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Analysis Window</div>
              <div className="text-sm text-gray-900">{summary.analysis_window}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4" data-testid="correlation-filters">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              data-testid="filter-by-type"
            >
              <option value="all">All Types</option>
              <option value="Error-Network">Error-Network</option>
              <option value="Performance-Resource">Performance-Resource</option>
              <option value="Timing-Sequence">Timing-Sequence</option>
              <option value="Pattern-Match">Pattern-Match</option>
            </select>
          </div>

          <select
            value={selectedConfidenceFilter}
            onChange={(e) => setSelectedConfidenceFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
            data-testid="filter-by-confidence"
          >
            <option value="all">All Confidence</option>
            <option value="high">High (&gt;80%)</option>
            <option value="medium">Medium (50-80%)</option>
            <option value="low">Low (&lt;50%)</option>
          </select>

          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
            data-testid="correlation-time-range"
          >
            <option value="all">All Time</option>
            <option value="last-24h">Last 24 Hours</option>
            <option value="last-7d">Last 7 Days</option>
            <option value="last-30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Correlations List */}
      <div className="p-6">
        <div className="space-y-4" data-testid="correlations-list">
          {filteredCorrelations.map((correlation) => {
            const typeDisplay = getTypeDisplay(correlation.type)
            const TypeIcon = typeDisplay.icon
            const strength = getCorrelationStrength(correlation.confidence)
            const isExpanded = expandedCorrelation === correlation.id

            return (
              <div
                key={correlation.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                data-testid="correlation-item"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${typeDisplay.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className="font-medium text-gray-900"
                          data-testid="correlation-type"
                        >
                          {typeDisplay.label}
                        </span>
                        <span
                          className="text-sm font-semibold text-blue-600"
                          data-testid="correlation-confidence"
                        >
                          {correlation.confidence}%
                        </span>
                      </div>

                      <p
                        className="text-gray-700 mb-2"
                        data-testid="correlation-description"
                      >
                        {correlation.description}
                      </p>

                      {/* Correlation strength visualization */}
                      <div className="mb-2" data-testid="correlation-strength">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs text-gray-500">Strength:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32" data-testid="strength-bar">
                            <div
                              className={`h-2 rounded-full ${strength.color}`}
                              style={{ width: strength.width }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Reports: {correlation.related_reports.length}</span>
                        <span>Frequency: {correlation.frequency}</span>
                        {correlation.pattern && <span>Pattern: {correlation.pattern}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCorrelation(isExpanded ? null : correlation.id)}
                    className="ml-4 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 border-t border-gray-200 pt-4" data-testid="correlation-detail-modal">
                    {/* Evidence */}
                    <div className="mb-4" data-testid="correlation-evidence">
                      <h4 className="font-medium text-gray-900 mb-2">Evidence</h4>
                      <div className="space-y-2">
                        {correlation.evidence.map((evidence, index) => (
                          <div key={index} className="bg-gray-50 rounded p-3 text-sm">
                            <div className="font-medium">{evidence.type}</div>
                            <div className="text-gray-600">
                              {typeof evidence === 'string' ? evidence : JSON.stringify(evidence, null, 2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div data-testid="correlation-timeline">
                      <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                      <div className="space-y-2">
                        {correlation.timeline.map((event, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3"
                            data-testid="timeline-event"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span
                                  className="text-sm text-gray-500"
                                  data-testid="event-timestamp"
                                >
                                  {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  event.type === 'error' ? 'bg-red-100 text-red-700' :
                                  event.type === 'network' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {event.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-900" data-testid="event-details">
                                {event.event}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Patterns Section */}
        {showPatterns && patterns.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6" data-testid="correlation-patterns">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Error Patterns</h4>
              <button
                onClick={() => setShowPatterns(!showPatterns)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showPatterns ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="space-y-3">
              {patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onPatternClick?.(pattern)}
                  data-testid="pattern-item"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900" data-testid="pattern-description">
                        {pattern.description}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span data-testid="pattern-occurrences">{pattern.occurrences}</span> occurrences across{' '}
                        <span data-testid="affected-reports-link">{pattern.affected_reports.length}</span> reports
                      </div>
                    </div>
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights Section */}
        {showInsights && insights.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6" data-testid="correlation-insights">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Insights & Recommendations</h4>
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showInsights ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg"
                  data-testid="insight-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <LightBulbIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900" data-testid="insight-type">
                          {insight.type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          insight.impact === 'High' ? 'bg-red-100 text-red-700' :
                          insight.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`} data-testid="insight-impact">
                          {insight.impact} Impact
                        </span>
                      </div>
                      <h5 className="font-medium text-blue-900 mb-1">{insight.title}</h5>
                      <p className="text-blue-800 text-sm mb-2">{insight.description}</p>
                      <div className="bg-white bg-opacity-50 rounded p-2">
                        <div className="font-medium text-blue-900 text-sm">Recommendation:</div>
                        <div className="text-blue-800 text-sm" data-testid="insight-recommendation">
                          {insight.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}