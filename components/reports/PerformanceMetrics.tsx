/**
 * Performance Metrics Display Component
 * Enhanced Log Visualization - Phase 5: Core Web Vitals visualization
 *
 * Displays Core Web Vitals metrics with color coding, tooltips, and analysis
 */

'use client'

import React, { useState } from 'react'
import {
  ChartBarIcon,
  ClockIcon,
  EyeIcon,
  CursorArrowRippleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import type { PerformanceMetrics as EnhancedPerformanceMetrics } from '@/lib/types/diagnostics'

interface PerformanceMetricsProps {
  performanceMetrics: EnhancedPerformanceMetrics | null
  className?: string
  showRecommendations?: boolean
  showTrends?: boolean
  comparisonData?: EnhancedPerformanceMetrics | null
}

interface MetricConfig {
  key: keyof NonNullable<EnhancedPerformanceMetrics['web_vitals']>
  label: string
  description: string
  unit: string
  icon: React.ComponentType<{ className?: string }>
  thresholds: {
    good: number
    needsImprovement: number
  }
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'fcp',
    label: 'First Contentful Paint',
    description: 'Time until the first text or image is painted',
    unit: 'ms',
    icon: EyeIcon,
    thresholds: { good: 1800, needsImprovement: 3000 }
  },
  {
    key: 'lcp',
    label: 'Largest Contentful Paint',
    description: 'Time until the largest text or image is painted',
    unit: 'ms',
    icon: ChartBarIcon,
    thresholds: { good: 2500, needsImprovement: 4000 }
  },
  {
    key: 'cls',
    label: 'Cumulative Layout Shift',
    description: 'Sum of all unexpected layout shifts',
    unit: '',
    icon: ArrowTrendingUpIcon,
    thresholds: { good: 0.1, needsImprovement: 0.25 }
  },
  {
    key: 'fid',
    label: 'First Input Delay',
    description: 'Time from first user interaction to browser response',
    unit: 'ms',
    icon: CursorArrowRippleIcon,
    thresholds: { good: 100, needsImprovement: 300 }
  },
  {
    key: 'tti',
    label: 'Time to Interactive',
    description: 'Time until the page is fully interactive',
    unit: 'ms',
    icon: ClockIcon,
    thresholds: { good: 3800, needsImprovement: 7300 }
  },
  {
    key: 'ttfb',
    label: 'Time to First Byte',
    description: 'Time until the first byte is received from the server',
    unit: 'ms',
    icon: ArrowTrendingUpIcon,
    thresholds: { good: 800, needsImprovement: 1800 }
  }
]

type MetricStatus = 'good' | 'needs-improvement' | 'poor'

export default function PerformanceMetrics({
  performanceMetrics,
  className = '',
  showRecommendations = true,
  showTrends = false,
  comparisonData = null
}: PerformanceMetricsProps) {
  const [selectedView, setSelectedView] = useState<'summary' | 'detailed' | 'chart'>('summary')
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  if (!performanceMetrics?.web_vitals) {
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}
        data-testid="empty-performance-state"
      >
        <div className="text-center text-gray-500">
          <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No performance metrics available</p>
          <p className="text-sm mt-2">Performance monitoring data will appear here when available</p>
        </div>
      </div>
    )
  }

  const webVitals = performanceMetrics.web_vitals
  const categorization = performanceMetrics.categorization
  const memory = performanceMetrics.memory

  // Calculate metric status
  const getMetricStatus = (value: number, thresholds: { good: number; needsImprovement: number }): MetricStatus => {
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.needsImprovement) return 'needs-improvement'
    return 'poor'
  }

  // Get status color classes
  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'needs-improvement': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  // Format metric value
  const formatMetricValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`
    }
    if (unit === '') {
      return value.toFixed(3)
    }
    return `${Math.round(value)}${unit}`
  }

  // Calculate overall performance score (0-100)
  const calculateOverallScore = (): number => {
    const weights = { lcp: 0.25, fcp: 0.15, cls: 0.25, fid: 0.20, tti: 0.10, ttfb: 0.05 }
    let weightedScore = 0
    let totalWeight = 0

    METRIC_CONFIGS.forEach(config => {
      const value = webVitals[config.key]
      if (value !== undefined) {
        const status = getMetricStatus(value, config.thresholds)
        const score = status === 'good' ? 90 : status === 'needs-improvement' ? 60 : 30
        weightedScore += score * weights[config.key]
        totalWeight += weights[config.key]
      }
    })

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
  }

  const overallScore = calculateOverallScore()

  // Get performance category from score
  const getPerformanceCategory = (score: number): string => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 50) return 'Fair'
    return 'Poor'
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`} data-testid="performance-metrics">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">Core Web Vitals</div>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex space-x-1" data-testid="metrics-view-toggle">
          {(['summary', 'detailed', 'chart'] as const).map(view => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedView === view
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              data-testid={`view-${view}`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Score */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <TrophyIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Overall Performance</span>
            </div>
            <div className="flex items-center space-x-3">
              <div
                className="text-3xl font-bold"
                data-testid="overall-score"
              >
                <span data-testid="score-value">{overallScore}</span>
                <span className="text-lg text-gray-400">/100</span>
              </div>
              <div>
                <div
                  className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                    overallScore >= 75 ? 'bg-green-100 text-green-800' :
                    overallScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}
                  data-testid="performance-category"
                >
                  {categorization?.overall || getPerformanceCategory(overallScore)}
                </div>
                {categorization?.details && (
                  <div className="text-sm text-gray-600 mt-1" data-testid="category-details">
                    {categorization.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Display */}
      <div className="p-6">
        {selectedView === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {METRIC_CONFIGS.map(config => {
              const value = webVitals[config.key]
              if (value === undefined) return null

              const status = getMetricStatus(value, config.thresholds)
              const Icon = config.icon

              return (
                <div
                  key={config.key}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${getStatusColor(status)}`}
                  data-testid={`metric-${config.key}`}
                  data-status={status}
                  onMouseEnter={() => setHoveredMetric(config.key)}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5" />
                    <div className="text-xs font-medium uppercase tracking-wide">
                      {status.replace('-', ' ')}
                    </div>
                  </div>

                  <div className="mb-1">
                    <div className="text-sm font-medium" data-testid="metric-label">
                      {config.label}
                    </div>
                    <div className="text-2xl font-bold" data-testid="metric-value">
                      {formatMetricValue(value, config.unit)}
                    </div>
                  </div>

                  {/* Comparison if available */}
                  {comparisonData?.web_vitals?.[config.key] && (
                    <div className="flex items-center space-x-1 text-xs">
                      {(() => {
                        const prevValue = comparisonData.web_vitals![config.key]!
                        const change = value - prevValue
                        const isImprovement = (config.key === 'cls' ? change < 0 : change < 0)

                        return (
                          <>
                            {isImprovement ? (
                              <ArrowTrendingDownIcon className="w-3 h-3 text-green-500" />
                            ) : change > 0 ? (
                              <ArrowTrendingUpIcon className="w-3 h-3 text-red-500" />
                            ) : (
                              <MinusIcon className="w-3 h-3 text-gray-400" />
                            )}
                            <span className={isImprovement ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-600'}>
                              {Math.abs(change) < 1 ? '±0' : `${change > 0 ? '+' : ''}${Math.round(change)}${config.unit}`}
                            </span>
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {selectedView === 'detailed' && (
          <div className="space-y-4" data-testid="detailed-metrics">
            {METRIC_CONFIGS.map(config => {
              const value = webVitals[config.key]
              if (value === undefined) return null

              const status = getMetricStatus(value, config.thresholds)
              const Icon = config.icon

              return (
                <div key={config.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{config.label}</h4>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(status)}`}>
                      {formatMetricValue(value, config.unit)}
                    </div>
                  </div>

                  {/* Threshold visualization */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Good</span>
                      <span>Needs Improvement</span>
                      <span>Poor</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div className="bg-green-400 flex-1"></div>
                        <div className="bg-yellow-400 flex-1"></div>
                        <div className="bg-red-400 flex-1"></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{formatMetricValue(config.thresholds.good, config.unit)}</span>
                      <span>{formatMetricValue(config.thresholds.needsImprovement, config.unit)}</span>
                      <span>∞</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selectedView === 'chart' && (
          <div className="text-center py-8" data-testid="performance-chart">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Chart view coming soon</p>
          </div>
        )}
      </div>

      {/* Memory Usage */}
      {memory && (
        <div className="p-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3" data-testid="memory-usage">Memory Usage</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Used Heap Size</div>
              <div className="font-semibold" data-testid="used-heap-size">
                {formatBytes(memory.used_js_heap_size)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Heap Size</div>
              <div className="font-semibold" data-testid="total-heap-size">
                {formatBytes(memory.total_js_heap_size)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Usage</div>
              <div className="font-semibold" data-testid="memory-usage-percentage">
                {Math.round((memory.used_js_heap_size / memory.total_js_heap_size) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && categorization?.recommendations && (
        <div className="p-6 border-t border-gray-200 bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-3" data-testid="performance-recommendations">
            Performance Recommendations
          </h4>
          <div className="space-y-2">
            {categorization.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="flex items-start space-x-2" data-testid="recommendation-item">
                <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium" data-testid="recommendation-description">{rec.description}</div>
                  <div className="text-blue-600" data-testid="recommendation-impact">
                    Impact: {rec.impact}
                  </div>
                  {rec.estimated_savings && (
                    <div className="text-green-600" data-testid="estimated-savings">
                      Potential savings: {rec.estimated_savings}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tooltip for hovered metric */}
      {hoveredMetric && (
        <div className="absolute z-10 p-3 bg-gray-900 text-white rounded shadow-lg text-sm max-w-xs" data-testid="metric-tooltip">
          {(() => {
            const config = METRIC_CONFIGS.find(c => c.key === hoveredMetric)!
            const value = webVitals[config.key]!
            const status = getMetricStatus(value, config.thresholds)

            return (
              <div>
                <div className="font-medium mb-1">{config.label}</div>
                <div className="mb-2">{config.description}</div>
                <div className="space-y-1 text-xs">
                  <div>Current: {formatMetricValue(value, config.unit)}</div>
                  <div>Good: ≤ {formatMetricValue(config.thresholds.good, config.unit)}</div>
                  <div>Needs Improvement: ≤ {formatMetricValue(config.thresholds.needsImprovement, config.unit)}</div>
                  <div>Poor: {'>'} {formatMetricValue(config.thresholds.needsImprovement, config.unit)}</div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Export button */}
      <div className="px-6 pb-6">
        <button
          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
          data-testid="export-performance"
        >
          <DocumentArrowDownIcon className="w-4 h-4" />
          <span>Export Performance Data</span>
        </button>
      </div>
    </div>
  )
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}