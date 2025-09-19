/**
 * Dashboard Sidebar Component
 * T071: Navigation and sidebar components
 * Left sidebar navigation with project selection and main menu
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  HomeIcon,
  FolderIcon,
  DocumentTextIcon,
  UsersIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  FolderIcon as FolderIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  UsersIcon as UsersIconSolid
} from '@heroicons/react/24/solid'

interface Project {
  id: string
  name: string
  owner_id: string
  integration_key: string
  created_at: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Extract project ID from current path
  useEffect(() => {
    const match = pathname.match(/\/dashboard\/projects\/([^\/]+)/)
    if (match) {
      setSelectedProject(match[1])
    } else {
      setSelectedProject(null)
    }
  }, [pathname])

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        } else {
          setError('Failed to load projects')
        }
      } catch (err) {
        setError('Failed to load projects')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const navigation = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
      current: pathname === '/dashboard'
    }
  ]

  const projectNavigation = selectedProject ? [
    {
      name: 'Project Details',
      href: `/dashboard/projects/${selectedProject}`,
      icon: FolderIcon,
      iconSolid: FolderIconSolid,
      current: pathname === `/dashboard/projects/${selectedProject}`
    },
    {
      name: 'Reports',
      href: `/dashboard/projects/${selectedProject}/reports`,
      icon: DocumentTextIcon,
      iconSolid: DocumentTextIconSolid,
      current: pathname.startsWith(`/dashboard/projects/${selectedProject}/reports`)
    },
    {
      name: 'Team',
      href: `/dashboard/projects/${selectedProject}/team`,
      icon: UsersIcon,
      iconSolid: UsersIconSolid,
      current: pathname === `/dashboard/projects/${selectedProject}/team`
    },
    {
      name: 'Export',
      href: `/dashboard/projects/${selectedProject}/export`,
      icon: ArrowDownTrayIcon,
      iconSolid: ArrowDownTrayIcon,
      current: pathname === `/dashboard/projects/${selectedProject}/export`
    }
  ] : []

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-4">
          {/* Overview Section */}
          <div className="space-y-1">
            {navigation.map((item) => {
              const IconComponent = item.current ? item.iconSolid : item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent
                    className={`mr-3 h-5 w-5 ${
                      item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Projects Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </h3>
              <Link
                href="/dashboard/projects/new"
                className="p-1 rounded text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Create new project"
              >
                <PlusIcon className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="px-3 py-2">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ) : error ? (
              <div className="px-3 py-2 text-sm text-red-600 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                {error}
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedProject === project.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <FolderIcon
                      className={`mr-3 h-4 w-4 flex-shrink-0 ${
                        selectedProject === project.id
                          ? 'text-blue-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <span className="flex-1 truncate">{project.name}</span>
                    {selectedProject === project.id && (
                      <ChevronRightIcon className="h-4 w-4 text-blue-500" />
                    )}
                  </Link>
                ))}

                {projects.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    <FolderIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No projects yet</p>
                    <Link
                      href="/dashboard/projects/new"
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Create your first project
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Project-specific Navigation */}
          {selectedProject && projectNavigation.length > 0 && (
            <div className="mt-8">
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Project Menu
              </h3>
              <div className="space-y-1">
                {projectNavigation.map((item) => {
                  const IconComponent = item.current ? item.iconSolid : item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent
                        className={`mr-3 h-5 w-5 ${
                          item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500">
          <p className="font-medium">FeeDLooP v1.0</p>
          <p>Feedback Collection Service</p>
        </div>
      </div>
    </div>
  )
}