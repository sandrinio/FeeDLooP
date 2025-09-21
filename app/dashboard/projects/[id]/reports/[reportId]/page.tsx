/**
 * Enhanced Report Detail Page with Syntax Highlighting
 * Shows individual report with formatted console logs and network requests
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-javascript'
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
  DevicePhoneMobileIcon,
  CodeBracketIcon,
  WifiIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

interface ConsoleLog {
  level: 'error' | 'warn' | 'info' | 'log'
  message: string
  timestamp: string
  stack?: string
}

interface NetworkRequest {
  url: string
  method: string
  status: number
  response_time: number
  request_headers?: Record<string, string>
  response_headers?: Record<string, string>
  request_body?: string
  response_body?: string
}

interface Report {
  id: string
  title: string
  description: string
  type: 'bug' | 'initiative' | 'feedback'
  priority: 'low' | 'medium' | 'high' | 'critical'
  user_email?: string
  user_name?: string
  created_at: string
  updated_at: string
  url?: string
  user_agent?: string
  console_logs?: ConsoleLog[]
  network_requests?: NetworkRequest[]
  fl_attachments?: Array<{
    id: string
    filename: string
    file_size: number
    url?: string
  }>
}

export default function EnhancedReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const reportId = params.reportId as string

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consoleLogsExpanded, setConsoleLogsExpanded] = useState(false)
  const [networkRequestsExpanded, setNetworkRequestsExpanded] = useState(false)

  useEffect(() => {
    if (projectId && reportId) {
      fetchReport()
    }
  }, [projectId, reportId])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/reports/${reportId}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      } else {
        setError('Failed to load report')
      }
    } catch (err) {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
      case 'initiative':
        return <LightBulbIcon className="h-6 w-6 text-blue-500" />
      case 'feedback':
        return <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-green-500" />
      default:
        return <DocumentTextIcon className="h-6 w-6 text-gray-500" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
    switch (priority) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800 border border-red-200`
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warn':
        return 'text-yellow-600 bg-yellow-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600 bg-green-50'
    if (status >= 300 && status < 400) return 'text-blue-600 bg-blue-50'
    if (status >= 400 && status < 500) return 'text-orange-600 bg-orange-50'
    if (status >= 500) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const highlightCode = (code: string, language: string = 'javascript') => {
    try {
      const highlighted = Prism.highlight(code, Prism.languages[language] || Prism.languages.javascript, language)
      return highlighted
    } catch (error) {
      return code
    }
  }

  const formatLogMessage = (message: string) => {
    // Try to parse as JSON for better formatting
    try {
      const parsed = JSON.parse(message)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return message
    }
  }

  const detectContentType = (content: string) => {
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      return 'json'
    }
    return 'javascript'
  }

  useEffect(() => {
    // Highlight code after component mounts
    Prism.highlightAll()
  }, [report])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading report details...</span>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12 text-red-600">
          <p>{error || 'Report not found'}</p>
          <Link
            href={`/dashboard/projects/${projectId}/reports`}
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/projects/${projectId}/reports`}
          className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Enhanced Reports Dashboard
        </Link>

        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            {getTypeIcon(report.type)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className={getPriorityBadge(report.priority)}>
                {report.priority}
              </span>
              <span className="text-sm text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                {report.type}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
            </div>
          </div>

          {/* Enhanced Console Logs Section */}
          {report.console_logs && report.console_logs.length > 0 && (
            <div className="bg-white shadow-lg rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <CodeBracketIcon className="h-5 w-5 mr-2 text-blue-500" />
                    Console Logs ({report.console_logs.length})
                  </h2>
                  <button
                    onClick={() => setConsoleLogsExpanded(!consoleLogsExpanded)}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                  >
                    {consoleLogsExpanded ? (
                      <>
                        <EyeSlashIcon className="h-4 w-4 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Expand
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className={`space-y-3 ${consoleLogsExpanded ? '' : 'max-h-96 overflow-y-auto'}`}>
                  {report.console_logs.map((log, index) => {
                    const formattedMessage = formatLogMessage(log.message)
                    const contentType = detectContentType(formattedMessage)
                    return (
                      <div key={index} className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(formattedMessage)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Copy log message"
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <pre className={`language-${contentType} text-sm overflow-x-auto`}>
                            <code
                              className={`language-${contentType}`}
                              dangerouslySetInnerHTML={{
                                __html: highlightCode(formattedMessage, contentType)
                              }}
                            />
                          </pre>
                          {log.stack && (
                            <details className="mt-3 border-t border-gray-700 pt-3">
                              <summary className="text-yellow-400 cursor-pointer text-sm mb-2">
                                Stack Trace
                              </summary>
                              <pre className="text-red-400 text-xs whitespace-pre-wrap bg-gray-800 p-3 rounded border-l-4 border-red-500">
                                {log.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Network Requests Section */}
          {report.network_requests && report.network_requests.length > 0 && (
            <div className="bg-white shadow-lg rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center">
                    <WifiIcon className="h-5 w-5 mr-2 text-green-500" />
                    Network Requests ({report.network_requests.length})
                  </h2>
                  <button
                    onClick={() => setNetworkRequestsExpanded(!networkRequestsExpanded)}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                  >
                    {networkRequestsExpanded ? (
                      <>
                        <EyeSlashIcon className="h-4 w-4 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Expand
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className={`space-y-4 ${networkRequestsExpanded ? '' : 'max-h-96 overflow-y-auto'}`}>
                  {report.network_requests.map((request, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {request.method}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {request.response_time}ms
                          </span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(request.url)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy URL"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="text-sm text-gray-900 font-mono break-all mb-4 bg-gray-100 p-3 rounded">
                          {request.url}
                        </div>
                        {networkRequestsExpanded && (
                          <div className="space-y-4">
                            {request.request_body && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  Request Body
                                  <button
                                    onClick={() => copyToClipboard(request.request_body || '')}
                                    className="ml-2 text-gray-400 hover:text-gray-600"
                                    title="Copy request body"
                                  >
                                    <ClipboardDocumentIcon className="h-3 w-3" />
                                  </button>
                                </h4>
                                <pre className="language-json text-xs bg-gray-900 text-white p-3 rounded max-h-32 overflow-y-auto">
                                  <code
                                    className="language-json"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightCode(formatLogMessage(request.request_body), 'json')
                                    }}
                                  />
                                </pre>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {request.request_headers && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    Request Headers
                                    <button
                                      onClick={() => copyToClipboard(JSON.stringify(request.request_headers, null, 2))}
                                      className="ml-2 text-gray-400 hover:text-gray-600"
                                      title="Copy request headers"
                                    >
                                      <ClipboardDocumentIcon className="h-3 w-3" />
                                    </button>
                                  </h4>
                                  <pre className="language-json text-xs bg-gray-900 text-white p-3 rounded max-h-32 overflow-y-auto">
                                    <code
                                      className="language-json"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightCode(JSON.stringify(request.request_headers, null, 2), 'json')
                                      }}
                                    />
                                  </pre>
                                </div>
                              )}
                              {request.response_headers && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    Response Headers
                                    <button
                                      onClick={() => copyToClipboard(JSON.stringify(request.response_headers, null, 2))}
                                      className="ml-2 text-gray-400 hover:text-gray-600"
                                      title="Copy response headers"
                                    >
                                      <ClipboardDocumentIcon className="h-3 w-3" />
                                    </button>
                                  </h4>
                                  <pre className="language-json text-xs bg-gray-900 text-white p-3 rounded max-h-32 overflow-y-auto">
                                    <code
                                      className="language-json"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightCode(JSON.stringify(request.response_headers, null, 2), 'json')
                                      }}
                                    />
                                  </pre>
                                </div>
                              )}
                            </div>
                            {request.response_body && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  Response Body
                                  <button
                                    onClick={() => copyToClipboard(request.response_body || '')}
                                    className="ml-2 text-gray-400 hover:text-gray-600"
                                    title="Copy response body"
                                  >
                                    <ClipboardDocumentIcon className="h-3 w-3" />
                                  </button>
                                </h4>
                                <pre className="language-json text-xs bg-gray-900 text-white p-3 rounded max-h-40 overflow-y-auto">
                                  <code
                                    className="language-json"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightCode(formatLogMessage(request.response_body), 'json')
                                    }}
                                  />
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Attachments */}
          {report.fl_attachments && report.fl_attachments.length > 0 && (
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <PaperClipIcon className="h-5 w-5 mr-2" />
                Attachments ({report.fl_attachments.length})
              </h2>
              <div className="space-y-3">
                {report.fl_attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(attachment.file_size / 1024)} KB
                        </p>
                      </div>
                    </div>
                    {attachment.url && (
                      <a
                        href={attachment.url}
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
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reporter Info */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reporter Information</h3>
            <div className="space-y-3">
              {report.user_name && (
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-900">{report.user_name}</span>
                </div>
              )}
              {report.user_email && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="text-sm text-gray-900 ml-2">{report.user_email}</span>
                </div>
              )}
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm text-gray-900">
                  {new Date(report.created_at).toLocaleDateString()} at{' '}
                  {new Date(report.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Details</h3>
            <div className="space-y-3">
              {report.url && (
                <div>
                  <div className="flex items-center mb-1">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-700">Page URL</span>
                  </div>
                  <p className="text-xs text-gray-600 break-all ml-8">{report.url}</p>
                </div>
              )}
              {report.user_agent && (
                <div>
                  <div className="flex items-center mb-1">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-700">User Agent</span>
                  </div>
                  <p className="text-xs text-gray-600 break-all ml-8">{report.user_agent}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700">Report ID</span>
                <p className="text-xs text-gray-600 font-mono ml-0 mt-1">{report.id}</p>
              </div>
            </div>
          </div>

          {/* Diagnostic Summary */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Diagnostic Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Console Logs</span>
                <span className="text-sm font-medium text-gray-900">
                  {report.console_logs?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Network Requests</span>
                <span className="text-sm font-medium text-gray-900">
                  {report.network_requests?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Attachments</span>
                <span className="text-sm font-medium text-gray-900">
                  {report.fl_attachments?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}