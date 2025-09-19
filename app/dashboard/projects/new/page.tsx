/**
 * Create New Project Page
 * T073: Project creation form component
 * Form for creating new feedback collection projects
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  FolderPlusIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function NewProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be less than 100 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim()
        }),
      })

      if (response.ok) {
        const project = await response.json()
        router.push(`/dashboard/projects/${project.id}`)
      } else {
        const errorData = await response.json()
        if (response.status === 409) {
          setErrors({ name: 'A project with this name already exists' })
        } else if (errorData.details) {
          // Handle validation errors from server
          const serverErrors: Record<string, string> = {}
          errorData.details.forEach((error: any) => {
            serverErrors[error.field] = error.message
          })
          setErrors(serverErrors)
        } else {
          setErrors({ general: 'Failed to create project. Please try again.' })
        }
      }
    } catch (err) {
      setErrors({ general: 'Network error. Please check your connection.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        <div className="flex items-center">
          <FolderPlusIcon className="h-8 w-8 text-blue-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
            <p className="text-gray-600">
              Set up a new feedback collection project for your application.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="px-6 py-8 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error creating project
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errors.general}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Project Name *
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., My Website Feedback, Mobile App Beta Testing"
                className={`block w-full border rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                disabled={loading}
                maxLength={100}
              />
            </div>
            {errors.name && (
              <p className="mt-2 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Choose a descriptive name for your project. This will help you identify it later.
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What happens after creation?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>A unique integration key will be generated for your project</li>
                    <li>You'll receive widget code to embed on your website</li>
                    <li>You can invite team members to collaborate</li>
                    <li>Start collecting feedback, bug reports, and feature requests</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Additional Info */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Next Steps After Creation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">1. Widget Integration</h4>
            <p className="text-sm text-gray-600">
              Copy the provided widget code and embed it on your website to start collecting feedback.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">2. Team Collaboration</h4>
            <p className="text-sm text-gray-600">
              Invite team members to help manage and respond to user feedback.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">3. Report Management</h4>
            <p className="text-sm text-gray-600">
              Organize reports by status, priority, and type to streamline your workflow.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">4. Export & Integration</h4>
            <p className="text-sm text-gray-600">
              Export reports to CSV for integration with tools like Jira or Azure DevOps.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}