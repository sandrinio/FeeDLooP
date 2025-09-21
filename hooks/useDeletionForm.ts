/**
 * T018: Deletion Form Hook
 * Custom hook for managing project deletion form state and validation
 */

'use client'

import { useState, useCallback } from 'react'
import type { DeletionConfirmation, UseDeletionFormResult } from '@/types/project-settings'

interface UseDeletionFormOptions {
  projectName: string
  onSubmit?: (data: DeletionConfirmation) => void
}

export function useDeletionForm({
  projectName,
  onSubmit
}: UseDeletionFormOptions): UseDeletionFormResult {
  const [formData, setFormData] = useState<DeletionConfirmation>({
    confirmation_text: '',
    understood_consequences: false,
    deletion_reason: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate confirmation text
    if (!formData.confirmation_text.trim()) {
      newErrors.confirmation_text = 'Please type the project name to confirm'
    } else if (formData.confirmation_text.trim() !== projectName) {
      newErrors.confirmation_text = 'Project name does not match'
    }

    // Validate consequences acknowledgment
    if (!formData.understood_consequences) {
      newErrors.understood_consequences = 'You must acknowledge the consequences'
    }

    // Validate deletion reason (optional, but if provided should not be empty)
    if (formData.deletion_reason && !formData.deletion_reason.trim()) {
      newErrors.deletion_reason = 'Please provide a reason or leave this field empty'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, projectName])

  const updateField = useCallback((field: keyof DeletionConfirmation, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  const reset = useCallback(() => {
    setFormData({
      confirmation_text: '',
      understood_consequences: false,
      deletion_reason: ''
    })
    setErrors({})
  }, [])

  const validate = useCallback((): boolean => {
    return validateForm()
  }, [validateForm])

  const isValid = formData.confirmation_text.trim() === projectName && formData.understood_consequences

  return {
    formData,
    isValid,
    errors,
    updateField,
    reset,
    validate
  }
}