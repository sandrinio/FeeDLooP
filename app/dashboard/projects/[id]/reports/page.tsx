/**
 * Enhanced Reports Dashboard - Redesigned per specs/002-reports-page-modification
 * Table columns: Title, URL, Priority, Submitted (no Status column)
 * Features: Hover tooltips, export functionality, filtering capabilities
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  LightBulbIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  CodeBracketIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

interface Report {
  id: string
  project_id: string
  type: 'bug' | 'initiative' | 'feedback'
  title: string
  description: string
  status: 'active' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical' | null
  reporter_email?: string | null
  reporter_name?: string | null
  url?: string | null
  user_agent?: string | null
  console_logs?: Array<{
    type: 'log' | 'warn' | 'error'
    message: string
    timestamp: string
    stack?: string
    level?: number
  }> | null
  network_requests?: Array<{
    url: string
    method: string
    status: number
    duration: number
    timestamp: string
    size?: number
    headers?: Record<string, string>
  }> | null
  created_at: string
  updated_at: string
  fl_attachments?: Array<{
    id: string
    filename: string
    file_size: number
  }>
}

interface ReportsResponse {
  reports: Report[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  filters: {
    type?: string
    priority?: string
  }
}

export default function ProjectReportsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string

  const [reports, setReports] = useState<Report[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Enhanced filter states per data-model.md
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [exportMode, setExportMode] = useState(false)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (projectId) {
      fetchReports()
    }
  }, [projectId, typeFilter, priorityFilter, pagination.page])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter) params.append('type', typeFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await fetch(`/api/projects/${projectId}/reports?${params}`)
      if (response.ok) {
        const data: ReportsResponse = await response.json()
        setReports(data.reports)
        setPagination(data.pagination)
      } else {
        setError('Failed to load reports')
      }
    } catch (err) {
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'initiative':
        return <LightBulbIcon className="h-5 w-5 text-blue-500" />
      case 'feedback':
        return <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-green-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityBadge = (priority: string | null) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
    switch (priority) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800`
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const clearFilters = () => {
    setTypeFilter('')
    setPriorityFilter('')
    setSearchQuery('')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleExportSelected = async () => {
    if (selectedReports.size === 0) {
      alert('Please select at least one report to export')
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportIds: Array.from(selectedReports),
          format: 'csv'
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `reports-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        setExportMode(false)
        setSelectedReports(new Set())
      } else {
        alert('Export failed. Please try again.')
      }
    } catch (error) {
      alert('Export failed. Please try again.')
    }
  }

  const toggleReportSelection = (reportId: string) => {
    const newSelected = new Set(selectedReports)
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId)
    } else {
      newSelected.add(reportId)
    }
    setSelectedReports(newSelected)
  }

  const filteredReports = reports.filter(report =>
    searchQuery === '' ||
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reporter_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Reports Dashboard</h1>
            <p className="text-gray-600">
              Advanced data table with filtering, hover descriptions, and CSV export capabilities.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {exportMode && selectedReports.size > 0 && (
              <button
                onClick={handleExportSelected}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Export {selectedReports.size} Selected
              </button>
            )}
            <button
              onClick={() => setExportMode(!exportMode)}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                exportMode
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              data-testid="export-button"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {exportMode ? 'Exit Export Mode' : 'Export Reports'}
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            Console Logs Available
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <WifiIcon className="h-4 w-4 mr-1" />
            Network Requests Tracked
          </span>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-white shadow-lg rounded-lg mb-6 border-l-4 border-blue-500" data-testid="filters">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2 text-blue-500" />
              Enhanced Filters & Export
            </h2>
            <div className="flex items-center space-x-3">
              {(typeFilter || priorityFilter || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                  data-testid="clear-filters"
                >
                  Clear filters
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-600 hover:text-gray-500 transition-colors"
                data-testid="toggle-filters"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  name="filter-title"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                name="filter-type"
                data-testid="type-filter"
              >
                <option value="">All Types</option>
                <option value="bug">Bug Report</option>
                <option value="initiative">Initiative</option>
                <option value="feedback">General Feedback</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                name="filter-priority"
                data-testid="priority-filter"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Placeholder for future date filter */}
              <div className="flex items-center text-sm text-gray-400">
                Date range filter (coming soon)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Reports Table */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading reports...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {reports.length === 0
                ? "No reports have been submitted yet."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <>
            {/* Enhanced Reports Table per spec */}
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200" data-testid="reports-table">
                <thead className="bg-gray-50">
                  <tr>
                    {exportMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedReports.size === filteredReports.length && filteredReports.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReports(new Set(filteredReports.map(r => r.id)))
                            } else {
                              setSelectedReports(new Set())
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-column="title">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-column="url">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-column="priority">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-column="created_at">
                      Submitted
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      {exportMode && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedReports.has(report.id)}
                            onChange={() => toggleReportSelection(report.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}

                      {/* Title Column */}
                      <td className="px-6 py-4" data-column="title">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-3 mt-1">
                            {getTypeIcon(report.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/dashboard/projects/${projectId}/reports/${report.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors report-title-link"
                              title={`${report.title}\n\n${report.description}`}
                              data-report-id={report.id}
                            >
                              {report.title.length > 50
                                ? `${report.title.substring(0, 50)}...`
                                : report.title}
                            </Link>
                            {report.reporter_name && (
                              <p className="text-xs text-gray-400 mt-1">
                                by {report.reporter_name}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-900 capitalize font-medium bg-gray-100 px-2 py-1 rounded" data-testid="type-badge">
                                {report.type}
                              </span>
                              {/* Log Count Indicators */}
                              {report.console_logs && report.console_logs.length > 0 && (
                                <span className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded" title={`${report.console_logs.length} console logs`}>
                                  <CodeBracketIcon className="h-3 w-3 mr-1" />
                                  {report.console_logs.length}
                                </span>
                              )}
                              {report.network_requests && report.network_requests.length > 0 && (
                                <span className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded" title={`${report.network_requests.length} network requests`}>
                                  <WifiIcon className="h-3 w-3 mr-1" />
                                  {report.network_requests.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* URL Column */}
                      <td className="px-6 py-4 whitespace-nowrap" data-column="url">
                        {report.url ? (
                          <a
                            href={report.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-900 transition-colors"
                            title={report.url}
                          >
                            {(() => {
                              try {
                                const domain = new URL(report.url).hostname;
                                return domain.length > 30 ? `${domain.substring(0, 30)}...` : domain;
                              } catch {
                                return report.url.length > 30 ? `${report.url.substring(0, 30)}...` : report.url;
                              }
                            })()}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">No URL</span>
                        )}
                      </td>

                      {/* Priority Column */}
                      <td className="px-6 py-4 whitespace-nowrap" data-column="priority">
                        {report.priority ? (
                          <span className={getPriorityBadge(report.priority)} data-testid="priority-badge">
                            {report.priority}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800" data-testid="priority-badge">
                            Not Set
                          </span>
                        )}
                      </td>

                      {/* Submitted Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-column="created_at" title={new Date(report.created_at).toLocaleString()}>
                        {(() => {
                          const date = new Date(report.created_at);
                          const now = new Date();
                          const diffInMs = now.getTime() - date.getTime();
                          const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                          const diffInDays = Math.floor(diffInHours / 24);

                          if (diffInHours < 1) return 'Just now';
                          if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
                          if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
                          return date.toLocaleDateString();
                        })()}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/projects/${projectId}/reports/${report.id}`}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                        <span className="font-medium">{pagination.pages}</span> ({pagination.total} total reports)
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                          disabled={pagination.page === pagination.pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}