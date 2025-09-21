/**
 * T016: Project Statistics Component
 * Displays project statistics including member count, reports, attachments, and storage usage
 */

'use client'

import {
  UsersIcon,
  DocumentTextIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import type { ProjectStatistics } from '@/types/project-settings'

interface ProjectStatisticsProps {
  statistics: ProjectStatistics
  loading?: boolean
}

export default function ProjectStatistics({
  statistics,
  loading = false
}: ProjectStatisticsProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const statisticsItems = [
    {
      name: 'Team Members',
      value: statistics.member_count,
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total team members including owner'
    },
    {
      name: 'Reports',
      value: statistics.report_count,
      icon: DocumentTextIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Total feedback reports submitted'
    },
    {
      name: 'Attachments',
      value: statistics.attachment_count,
      icon: PaperClipIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Total file attachments uploaded'
    },
    {
      name: 'Storage Used',
      value: formatFileSize(statistics.total_storage_usage),
      icon: CloudArrowUpIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Total storage space used by attachments'
    }
  ]

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Project Statistics</h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-gray-50 overflow-hidden shadow rounded-lg animate-pulse">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-gray-200 rounded-md" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                    <div className="h-6 bg-gray-200 rounded w-12" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-4">
        <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Project Statistics</h3>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statisticsItems.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-md ${item.bgColor}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {statistics.export_template_count > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">
              {statistics.export_template_count} export template{statistics.export_template_count !== 1 ? 's' : ''} configured
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Statistics are updated in real-time and reflect the current state of your project.
        </p>
      </div>
    </div>
  )
}