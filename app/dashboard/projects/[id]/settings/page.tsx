/**
 * T017: Project Settings Page
 * Settings page for project owners to manage project and delete projects
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

import { useProjectSettings } from '@/hooks/useProjectSettings'
import { useDeletionForm } from '@/hooks/useDeletionForm'
import ProjectStatistics from '@/components/projects/ProjectStatistics'
import DeletionConfirmationModal from '@/components/modals/DeletionConfirmationModal'
import type { DeletionConfirmation, ProjectDeletionResponse } from '@/types/project-settings'

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: settings, loading, error, refetch } = useProjectSettings({
    projectId,
    includeStatistics: true,
    includePermissions: true
  })

  const [showDeletionModal, setShowDeletionModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    formData: deletionForm,
    isValid: isDeletionValid,
    errors: deletionErrors,
    updateField: updateDeletionField,
    reset: resetDeletionForm,
    validate: validateDeletion
  } = useDeletionForm({
    projectName: settings?.project.name || '',
  })

  // Redirect to project page if not owner
  useEffect(() => {
    if (settings && settings.permissions && !settings.permissions.can_delete) {
      router.push(`/dashboard/projects/${projectId}`)
    }
  }, [settings, projectId, router])

  const handleDeleteProject = async (confirmation: DeletionConfirmation) => {
    if (!settings?.project) return

    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(confirmation)
      })

      const result: ProjectDeletionResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete project')
      }

      // Project deleted successfully
      setShowDeletionModal(false)
      resetDeletionForm()

      // Show success message and redirect
      alert('Project deleted successfully')
      router.push('/dashboard')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project'
      setDeleteError(errorMessage)
      console.error('Error deleting project:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  const openDeletionModal = () => {
    setDeleteError(null)
    setShowDeletionModal(true)
  }

  const closeDeletionModal = () => {
    setShowDeletionModal(false)
    resetDeletionForm()
    setDeleteError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
            <div className="bg-white shadow rounded-lg p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Settings</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => refetch()}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">Project settings not found</p>
          </div>
        </div>
      </div>
    )
  }

  const { project, statistics, permissions } = settings

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href={`/dashboard/projects/${projectId}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Cog6ToothIcon className="h-8 w-8 text-gray-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name} Settings</h1>
              <p className="text-sm text-gray-500">
                Manage project settings and view statistics
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Project Statistics */}
          <ProjectStatistics statistics={statistics} />

          {/* Project Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name</label>
                <p className="mt-1 text-sm text-gray-900">{project.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Integration Key</label>
                <p className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border">
                  {project.integration_key}
                </p>
              </div>
            </div>
          </div>

          {/* Access Control */}
          {permissions && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-medium text-gray-900">Access Control</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Can modify project</span>
                  <span className={`text-sm ${permissions.can_modify ? 'text-green-600' : 'text-red-600'}`}>
                    {permissions.can_modify ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700">Can delete project</span>
                  <span className={`text-sm ${permissions.can_delete ? 'text-green-600' : 'text-red-600'}`}>
                    {permissions.can_delete ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {permissions?.can_delete && (
            <div className="bg-white shadow rounded-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center space-x-2 mb-4">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
              </div>

              <div className="bg-red-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-red-800 mb-2">Delete Project</h4>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete this project and all associated data. This action cannot be undone.
                </p>

                <button
                  onClick={openDeletionModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Delete Project
                </button>

                {deleteError && (
                  <div className="mt-3 text-sm text-red-600">
                    {deleteError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      <DeletionConfirmationModal
        isOpen={showDeletionModal}
        projectName={project.name}
        onConfirm={handleDeleteProject}
        onCancel={closeDeletionModal}
        loading={deleteLoading}
      />
    </div>
  )
}