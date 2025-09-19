/**
 * Form Validation Utilities
 * React Hook Form + Zod integration helpers
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UseFormProps, UseFormReturn } from 'react-hook-form'

/**
 * Creates a resolver for React Hook Form with Zod schema
 */
export function createFormResolver<T extends z.ZodType<any, any, any>>(schema: T) {
  return zodResolver(schema)
}

/**
 * Default form configuration for consistent behavior
 */
export const defaultFormConfig: Partial<UseFormProps> = {
  mode: 'onBlur',
  reValidateMode: 'onChange',
  shouldFocusError: true,
  shouldUseNativeValidation: false,
}

/**
 * Helper to extract field errors for display
 */
export function getFieldError(
  form: UseFormReturn<any>,
  fieldName: string
): string | undefined {
  const error = form.formState.errors[fieldName]
  return error?.message as string | undefined
}

/**
 * Helper to check if a field has an error
 */
export function hasFieldError(
  form: UseFormReturn<any>,
  fieldName: string
): boolean {
  return !!form.formState.errors[fieldName]
}

/**
 * Helper to get field state classes for styling
 */
export function getFieldStateClasses(
  form: UseFormReturn<any>,
  fieldName: string,
  baseClasses: string = '',
  errorClasses: string = 'border-red-500 focus:border-red-500 focus:ring-red-500',
  successClasses: string = 'border-green-500 focus:border-green-500 focus:ring-green-500'
): string {
  const hasError = hasFieldError(form, fieldName)
  const isDirty = form.formState.dirtyFields[fieldName]
  const isValid = !hasError && isDirty

  if (hasError) {
    return `${baseClasses} ${errorClasses}`.trim()
  }

  if (isValid) {
    return `${baseClasses} ${successClasses}`.trim()
  }

  return baseClasses
}

/**
 * Form submission helper with error handling
 */
export async function handleFormSubmission<T>(
  data: T,
  submitFn: (data: T) => Promise<void>,
  onError?: (error: Error) => void,
  onSuccess?: () => void
): Promise<void> {
  try {
    await submitFn(data)
    onSuccess?.()
  } catch (error) {
    console.error('Form submission error:', error)
    onError?.(error as Error)
  }
}

/**
 * Password strength checker
 */
export interface PasswordStrength {
  score: number // 0-4 (weak to strong)
  feedback: string[]
  isValid: boolean
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('At least 8 characters long')
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include lowercase letters')
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include uppercase letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Include numbers')
  }

  if (/[@$!%*?&]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include special characters (@$!%*?&)')
  }

  return {
    score,
    feedback,
    isValid: score >= 4
  }
}

/**
 * Common input validation patterns
 */
export const validationPatterns = {
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  phone: /^\+?[\d\s-()]+$/,
  url: /^https?:\/\/.+\..+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericSpaces: /^[a-zA-Z0-9\s]+$/,
  nameChars: /^[a-zA-Z\s'-]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
}

/**
 * Debounced validation helper for real-time validation
 */
export function createDebouncedValidator<T>(
  validator: (value: T) => Promise<boolean>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout | null = null

  return (value: T): Promise<boolean> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        try {
          const result = await validator(value)
          resolve(result)
        } catch {
          resolve(false)
        }
      }, delay)
    })
  }
}