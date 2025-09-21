/**
 * T082: CSV export component
 * Reusable component for exporting data to CSV format
 */

'use client'

import { useState } from 'react'
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

interface ExportFilters {
  status?: string[]
  type?: string[]
  priority?: string[]
  dateRange?: {
    start: string
    end: string
  }
}

interface ExportControlsProps {
  projectId: string
  totalRecords?: number
  onExportStart?: () => void
  onExportComplete?: (url: string) => void
  onExportError?: (error: string) => void
  showFilters?: boolean
  defaultFilters?: ExportFilters
}

export default function ExportControls({
  projectId,
  totalRecords = 0,
  onExportStart,
  onExportComplete,
  onExportError,
  showFilters = true,
  defaultFilters = {}
}: ExportControlsProps) {
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [filters, setFilters] = useState<ExportFilters>(defaultFilters)
  const [includeAttachments, setIncludeAttachments] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setExportProgress(0)

    if (onExportStart) {
      onExportStart()
    }

    try {
      // Build query parameters
      const params = new URLSearchParams()
      params.append('format', exportFormat)
      params.append('include_attachments', includeAttachments.toString())

      // Add filters
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(status => params.append('status', status))
      }
      if (filters.type && filters.type.length > 0) {
        filters.type.forEach(type => params.append('type', type))
      }
      if (filters.priority && filters.priority.length > 0) {
        filters.priority.forEach(priority => params.append('priority', priority))
      }
      if (filters.dateRange?.start) {
        params.append('start_date', filters.dateRange.start)
      }
      if (filters.dateRange?.end) {
        params.append('end_date', filters.dateRange.end)
      }

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`/api/projects/${projectId}/export?${params}`)

      clearInterval(progressInterval)
      setExportProgress(100)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const filename = `feedloop-reports-${projectId}-${new Date().toISOString().split('T')[0]}.${exportFormat}`

        // Trigger download
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setLastExportUrl(url)

        if (onExportComplete) {
          onExportComplete(url)
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
      if (onExportError) {
        onExportError(errorMessage)
      }
    } finally {
      setExporting(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }

  const updateFilter = (key: keyof ExportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.values(filters).some(value =>
    Array.isArray(value) ? value.length > 0 : !!value
  )

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DocumentArrowDownIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">Export Data</h2>
              <p className="text-sm text-gray-500">
                Export reports to CSV or Excel format for external tools
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {totalRecords} record{totalRecords !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="csv">CSV (Comma-separated values)</option>
              <option value="xlsx">Excel (XLSX format)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              CSV is compatible with most tools. Excel format preserves formatting.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeAttachments}
                  onChange={(e) => setIncludeAttachments(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include attachment URLs
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                Add columns with file download links
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FunnelIcon className="h-5 w-5 mr-2" />
                Export Filters
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  multiple
                  value={filters.status || []}
                  onChange={(e) => updateFilter('status', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  size={4}
                >
                  <option value="active">Active</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  multiple
                  value={filters.type || []}
                  onChange={(e) => updateFilter('type', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  size={3}
                >
                  <option value="bug">Bug Report</option>
                  <option value="initiative">Feature Request</option>
                  <option value="feedback">General Feedback</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  multiple
                  value={filters.priority || []}
                  onChange={(e) => updateFilter('priority', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  size={4}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => updateFilter('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Export Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Progress */}
        {exporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  Exporting data... {exportProgress}%
                </p>
                <div className="mt-2 bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {hasActiveFilters && (
              <span>Filters applied • </span>
            )}
            Export will include all visible columns
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || totalRecords === 0}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>

        {/* Success Message */}
        {lastExportUrl && !exporting && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex">
              <CheckIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Export Complete</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your export has been downloaded successfully.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Info */}
        <div className="bg-gray-50 rounded-md p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Export Information</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Compatibility:</strong> CSV files work with Excel, Google Sheets, and most project management tools</div>
            <div><strong>Jira Import:</strong> Use CSV format with standard field mapping</div>
            <div><strong>Azure DevOps:</strong> Compatible with work item import tools</div>
            <div><strong>Data Included:</strong> Report details, status, priority, dates, and user information</div>
          </div>
        </div>
      </div>
    </div>
  )
}