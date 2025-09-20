/**
 * Project Detail Page
 * T076: Project detail page implementation
 * Shows project overview, settings, and team management
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  FolderIcon,
  DocumentTextIcon,
  UsersIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  owner_id: string
  integration_key: string
  created_at: string
  members: Array<{
    user_id: string
    email: string
    name: string
    role: string
    can_invite: boolean
  }>
}

interface ReportStats {
  total: number
  new: number
  in_progress: number
  resolved: number
  closed: number
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch project details first
      await fetchProjectDetails()
      // Then fetch stats
      await fetchReportStats()
    } catch (err) {
      console.error('Error fetching project data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectDetails = async () => {
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (response.ok) {
          const data = await response.json()
          setProject(data)
          return // Success, exit the retry loop
        } else if (response.status === 404) {
          throw new Error('Project not found')
        } else {
          throw new Error('Failed to load project details')
        }
      } catch (err) {
        retryCount++
        if (retryCount > maxRetries) {
          throw err // Re-throw after max retries
        }
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  const fetchReportStats = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/reports?limit=1`)
      if (response.ok) {
        const data = await response.json()
        setStats({
          total: data.pagination?.total || 0,
          new: 0, // Would need filtered API calls
          in_progress: 0,
          resolved: 0,
          closed: 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch report stats:', err)
      setStats({ total: 0, new: 0, in_progress: 0, resolved: 0, closed: 0 })
    }
  }

  const copyIntegrationKey = async () => {
    if (project?.integration_key) {
      try {
        await navigator.clipboard.writeText(project.integration_key)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const copyWidgetScript = async () => {
    const script = `<script src="https://feedloop.soula.ge/widget/dist/feedloop-widget.min.js" data-project-key="${project?.integration_key}"></script>`
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading project...</span>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Project not found'}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FolderIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">
                Created {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/dashboard/projects/${projectId}/settings`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link
          href={`/dashboard/projects/${projectId}/reports`}
          className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-500 group-hover:text-blue-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                Reports
              </h3>
              <p className="text-2xl font-bold text-gray-600">
                {stats?.total || 0}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`/dashboard/projects/${projectId}/team`}
          className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-green-500 group-hover:text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">
                Team
              </h3>
              <p className="text-2xl font-bold text-gray-600">
                {project.members.length}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`/dashboard/projects/${projectId}/export`}
          className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <ArrowDownTrayIcon className="h-8 w-8 text-purple-500 group-hover:text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-purple-600">
                Export
              </h3>
              <p className="text-sm text-gray-600">CSV/Excel</p>
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <EyeIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Widget Views
              </h3>
              <p className="text-2xl font-bold text-gray-600">
                {/* This would come from analytics */}
                --
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Project Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integration Setup */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Widget Integration
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Integration Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-md text-sm font-mono">
                      {project.integration_key}
                    </code>
                    <button
                      onClick={copyIntegrationKey}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Widget Script
                  </label>
                  <div className="bg-gray-100 rounded-md p-3">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
{`<script
  src="https://feedloop.soula.ge/widget/dist/feedloop-widget.min.js"
  data-project-key="${project.integration_key}">
</script>`}
                    </pre>
                  </div>
                  <button
                    onClick={copyWidgetScript}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                    Copy Widget Code
                  </button>

                  {/* Implementation Instructions */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">How to Install:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>HTML:</strong> Paste before closing &lt;/body&gt; tag</li>
                      <li>• <strong>React/Next.js:</strong> Add to your main layout component</li>
                      <li>• <strong>WordPress:</strong> Add to footer.php or use a plugin</li>
                      <li>• <strong>Single Page Apps:</strong> Include in your main app component</li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-2">
                      The widget automatically appears as a feedback button in the bottom-right corner.
                    </p>
                  </div>

                  {/* CSP Configuration Guide */}
                  <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <h4 className="text-sm font-medium text-amber-800 mb-3">🔒 Content Security Policy (CSP) Setup</h4>

                    <div className="space-y-3">
                      <div>
                        <h5 className="text-xs font-semibold text-amber-900 mb-1">Option 1: Add Domain (Recommended)</h5>
                        <div className="bg-amber-100 p-2 rounded text-xs font-mono text-amber-900 overflow-x-auto">
                          script-src 'self' https://feedloop.soula.ge;<br/>
                          connect-src 'self' https://feedloop.soula.ge;
                        </div>
                      </div>

                      <div>
                        <h5 className="text-xs font-semibold text-amber-900 mb-1">Option 2: Use Nonce</h5>
                        <div className="bg-amber-100 p-2 rounded text-xs font-mono text-amber-900 overflow-x-auto">
                          &lt;script nonce="SERVER_NONCE"<br/>
                          &nbsp;&nbsp;src="https://feedloop.soula.ge/widget/dist/feedloop-widget.min.js"<br/>
                          &nbsp;&nbsp;data-project-key="{project.integration_key}"&gt;&lt;/script&gt;
                        </div>
                      </div>

                      <p className="text-xs text-amber-700">
                        If you get "CSP violation" errors, add these directives to your Content-Security-Policy header.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Recent Reports
                </h2>
                <Link
                  href={`/dashboard/projects/${projectId}/reports`}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="px-6 py-4">
              {stats?.total === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start collecting feedback by embedding the widget on your site.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    {stats?.total} reports collected
                  </p>
                  <Link
                    href={`/dashboard/projects/${projectId}/reports`}
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View Reports
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Team & Stats */}
        <div className="space-y-6">
          {/* Team Members */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  Team Members
                </h2>
                <Link
                  href={`/dashboard/projects/${projectId}/team`}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Manage
                </Link>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {project.members.slice(0, 5).map((member) => (
                  <div key={member.user_id} className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {member.name || member.email}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
                {project.members.length > 5 && (
                  <p className="text-sm text-gray-500">
                    +{project.members.length - 5} more members
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Project Statistics
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Reports</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats?.total || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Team Members</span>
                  <span className="text-sm font-medium text-gray-900">
                    {project.members.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}