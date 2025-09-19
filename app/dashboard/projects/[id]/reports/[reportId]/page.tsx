/**
 * Report Detail Page
 * T078: Report detail view component
 * Shows individual report with status management and attachments
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  LightBulbIcon,
  DocumentTextIcon,
  PaperClipIcon,
  CalendarIcon,
  UserIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

interface Report {
  id: string
  title: string
  description: string
  type: 'bug' | 'feature' | 'feedback'
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  user_email?: string
  user_name?: string
  browser_info?: {
    user_agent?: string
    screen_resolution?: string
    viewport_size?: string
    browser_language?: string
    platform?: string
  }
  page_url?: string
  created_at: string
  updated_at: string
  creator?: {
    email: string
    name: string
  }
  fl_attachments?: Array<{
    id: string
    filename: string
    file_size: number
    mime_type: string
    file_url?: string
    created_at: string
  }>
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const reportId = params.reportId as string

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectId && reportId) {
      fetchReportDetail()
    }
  }, [projectId, reportId])

  const fetchReportDetail = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      } else {
        setError('Failed to load report details')
      }
    } catch (err) {
      setError('Failed to load report details')
    } finally {
      setLoading(false)
    }
  }

  const updateReportStatus = async (newStatus: string) => {
    if (!report) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedReport = await response.json()
        setReport(updatedReport)
      } else {
        alert('Failed to update report status')
      }
    } catch (err) {
      alert('Failed to update report status')
    } finally {
      setUpdating(false)
    }
  }

  const updateReportPriority = async (newPriority: string) => {
    if (!report) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (response.ok) {
        const updatedReport = await response.json()
        setReport(updatedReport)
      } else {
        alert('Failed to update report priority')
      }
    } catch (err) {
      alert('Failed to update report priority')
    } finally {
      setUpdating(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
      case 'feature':
        return <LightBulbIcon className="h-6 w-6 text-blue-500" />
      case 'feedback':
        return <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-green-500" />
      default:
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    switch (status) {
      case 'new':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'in_progress':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'resolved':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'closed':
        return `${baseClasses} bg-gray-100 text-gray-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading report...</span>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Report not found'}</p>
        <Link
          href={`/dashboard/projects/${projectId}/reports`}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Reports
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/projects/${projectId}/reports`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Reports
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              {getTypeIcon(report.type)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {report.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {new Date(report.created_at).toLocaleDateString()}
                </div>
                {report.user_name && (
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    {report.user_name}
                  </div>
                )}
                <span className="text-gray-300">•</span>
                <span className="capitalize">{report.type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Description</h2>
            </div>
            <div className="px-6 py-4">
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {report.fl_attachments && report.fl_attachments.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <PaperClipIcon className="h-5 w-5 mr-2" />
                  Attachments ({report.fl_attachments.length})
                </h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-3">
                  {report.fl_attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <PaperClipIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(attachment.file_size)} • {attachment.mime_type}
                          </p>
                        </div>
                      </div>
                      {attachment.file_url && (
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Technical Info */}
          {(report.browser_info || report.page_url) && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
                  Technical Information
                </h2>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {report.page_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Page URL
                      </label>
                      <div className="flex items-center">
                        <GlobeAltIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <a
                          href={report.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 text-sm truncate"
                        >
                          {report.page_url}
                        </a>
                      </div>
                    </div>
                  )}

                  {report.browser_info && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.browser_info.user_agent && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Browser
                          </label>
                          <p className="text-sm text-gray-600 truncate">
                            {report.browser_info.user_agent}
                          </p>
                        </div>
                      )}

                      {report.browser_info.screen_resolution && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Screen Resolution
                          </label>
                          <p className="text-sm text-gray-600">
                            {report.browser_info.screen_resolution}
                          </p>
                        </div>
                      )}

                      {report.browser_info.viewport_size && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Viewport Size
                          </label>
                          <p className="text-sm text-gray-600">
                            {report.browser_info.viewport_size}
                          </p>
                        </div>
                      )}

                      {report.browser_info.browser_language && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Language
                          </label>
                          <p className="text-sm text-gray-600">
                            {report.browser_info.browser_language}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Status</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Status
                  </label>
                  <span className={getStatusBadge(report.status)}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={report.status}
                    onChange={(e) => updateReportStatus(e.target.value)}
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Management */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Priority</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Priority
                  </label>
                  <span className={getPriorityBadge(report.priority)}>
                    {report.priority}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Priority
                  </label>
                  <select
                    value={report.priority}
                    onChange={(e) => updateReportPriority(e.target.value)}
                    disabled={updating}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Report Information</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Report ID
                  </label>
                  <p className="text-sm text-gray-600 font-mono">{report.id}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created
                  </label>
                  <p className="text-sm text-gray-600">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-600">
                    {new Date(report.updated_at).toLocaleString()}
                  </p>
                </div>

                {report.user_email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Submitted by
                    </label>
                    <p className="text-sm text-gray-600">{report.user_email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}