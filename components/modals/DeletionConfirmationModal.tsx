/**
 * T015: Deletion Confirmation Modal Component
 * Modal for confirming project deletion with validation
 */

'use client'

import { useState } from 'react'
import {
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import type { DeletionConfirmation } from '@/types/project-settings'

interface DeletionConfirmationModalProps {
  isOpen: boolean
  projectName: string
  onConfirm: (confirmation: DeletionConfirmation) => void
  onCancel: () => void
  loading?: boolean
}

export default function DeletionConfirmationModal({
  isOpen,
  projectName,
  onConfirm,
  onCancel,
  loading = false
}: DeletionConfirmationModalProps) {
  const [formData, setFormData] = useState<DeletionConfirmation>({
    confirmation_text: '',
    understood_consequences: false,
    deletion_reason: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.confirmation_text.trim()) {
      newErrors.confirmation_text = 'Please type the project name to confirm'
    } else if (formData.confirmation_text.trim() !== projectName) {
      newErrors.confirmation_text = 'Project name does not match'
    }

    if (!formData.understood_consequences) {
      newErrors.understood_consequences = 'You must acknowledge the consequences'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onConfirm(formData)
  }

  const handleCancel = () => {
    setFormData({
      confirmation_text: '',
      understood_consequences: false,
      deletion_reason: ''
    })
    setErrors({})
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCancel} />

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={handleCancel}
              disabled={loading}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>

            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Delete Project
              </h3>

              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <strong>{projectName}</strong>?
                  This action cannot be undone and will permanently remove:
                </p>

                <ul className="mt-2 text-sm text-gray-500 list-disc list-inside space-y-1">
                  <li>All reports and feedback</li>
                  <li>All file attachments</li>
                  <li>All team member access</li>
                  <li>All project settings and data</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 sm:mt-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="confirmation_text" className="block text-sm font-medium text-gray-700">
                  Type <strong>{projectName}</strong> to confirm deletion
                </label>
                <input
                  type="text"
                  id="confirmation_text"
                  value={formData.confirmation_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmation_text: e.target.value }))}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm text-gray-900 bg-white ${
                    errors.confirmation_text ? 'border-red-300' : ''
                  }`}
                  placeholder={projectName}
                  disabled={loading}
                  autoComplete="off"
                />
                {errors.confirmation_text && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmation_text}</p>
                )}
              </div>

              <div>
                <label htmlFor="deletion_reason" className="block text-sm font-medium text-gray-700">
                  Reason for deletion (optional)
                </label>
                <textarea
                  id="deletion_reason"
                  rows={3}
                  value={formData.deletion_reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, deletion_reason: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm text-gray-900 bg-white"
                  placeholder="Why are you deleting this project?"
                  disabled={loading}
                />
              </div>

              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="understood_consequences"
                    type="checkbox"
                    checked={formData.understood_consequences}
                    onChange={(e) => setFormData(prev => ({ ...prev, understood_consequences: e.target.checked }))}
                    className={`h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 ${
                      errors.understood_consequences ? 'border-red-300' : ''
                    }`}
                    disabled={loading}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="understood_consequences" className="font-medium text-gray-700">
                    I understand that this action cannot be undone
                  </label>
                  {errors.understood_consequences && (
                    <p className="mt-1 text-sm text-red-600">{errors.understood_consequences}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !formData.confirmation_text.trim() || !formData.understood_consequences}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:bg-red-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>

              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}