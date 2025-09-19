/**
 * Dashboard Overview Page
 * T072: Project selection and overview
 * Main dashboard showing projects overview and quick stats
 */

'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  PlusIcon,
  FolderIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  owner_id: string
  integration_key: string
  created_at: string
}

interface ProjectStats {
  total_reports: number
  new_reports: number
  in_progress_reports: number
  resolved_reports: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProjects()
    }
  }, [status])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)

        // Fetch stats for each project (in a real app, this would be optimized)
        const statsPromises = data.map(async (project: Project) => {
          try {
            const statsResponse = await fetch(`/api/projects/${project.id}/reports?limit=1`)
            if (statsResponse.ok) {
              const reportsData = await statsResponse.json()
              return {
                projectId: project.id,
                stats: {
                  total_reports: reportsData.pagination?.total || 0,
                  new_reports: 0, // Would need separate API call
                  in_progress_reports: 0,
                  resolved_reports: 0
                }
              }
            }
          } catch (err) {
            console.error('Failed to fetch stats for project:', project.id)
          }
          return {
            projectId: project.id,
            stats: { total_reports: 0, new_reports: 0, in_progress_reports: 0, resolved_reports: 0 }
          }
        })

        const projectStats = await Promise.all(statsPromises)
        const statsMap: Record<string, ProjectStats> = {}
        projectStats.forEach(({ projectId, stats }) => {
          statsMap[projectId] = stats
        })
        setStats(statsMap)
      } else {
        setError('Failed to fetch projects')
      }
    } catch (err) {
      setError('Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to access the dashboard.</p>
      </div>
    )
  }

  const getDisplayName = () => {
    if (session?.user?.first_name && session?.user?.last_name) {
      return `${session.user.first_name} ${session.user.last_name}`
    }
    return session?.user?.email
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {getDisplayName()}!
        </h1>
        <p className="mt-1 text-gray-600">
          Manage your feedback collection projects and track user reports.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Projects
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {projects.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Reports
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Object.values(stats).reduce((sum, stat) => sum + stat.total_reports, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Reports
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Object.values(stats).reduce((sum, stat) => sum + stat.new_reports + stat.in_progress_reports, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Resolved Reports
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {Object.values(stats).reduce((sum, stat) => sum + stat.resolved_reports, 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Your Projects</h2>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </div>
        </div>

        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading projects...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>{error}</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first feedback collection project.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/projects/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const projectStats = stats[project.id] || { total_reports: 0, new_reports: 0, in_progress_reports: 0, resolved_reports: 0 }

                return (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="block group"
                  >
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <FolderIcon className="h-8 w-8 text-blue-500" />
                          <h3 className="ml-3 text-lg font-medium text-gray-900 group-hover:text-blue-600">
                            {project.name}
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Total Reports</span>
                          <span className="font-medium text-gray-900">{projectStats.total_reports}</span>
                        </div>

                        <div className="flex items-center text-sm text-gray-500">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </div>

                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Integration Key</span>
                          </div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block truncate">
                            {project.integration_key}
                          </code>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}