/**
 * Reusable Form Field Component
 * Integrated with React Hook Form for consistent validation and styling
 */

import React, { forwardRef } from 'react'
import { FieldError } from 'react-hook-form'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: FieldError | string
  helperText?: string
  showLabel?: boolean
  required?: boolean
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({
    label,
    error,
    helperText,
    showLabel = false,
    required = false,
    className = '',
    ...props
  }, ref) => {
    const errorMessage = typeof error === 'string' ? error : error?.message
    const hasError = !!errorMessage

    const inputClasses = `
      relative block w-full px-3 py-2 border rounded-md
      placeholder-gray-500 text-gray-900
      focus:outline-none focus:z-10 sm:text-sm
      ${hasError
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
      }
      ${className}
    `.trim()

    return (
      <div className="space-y-1">
        {showLabel && (
          <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div>
          <label htmlFor={props.id} className="sr-only">
            {label}
          </label>
          <input
            ref={ref}
            className={inputClasses}
            placeholder={label}
            aria-invalid={hasError}
            aria-describedby={
              errorMessage ? `${props.id}-error` :
              helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />
        </div>

        {errorMessage && (
          <p id={`${props.id}-error`} className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        {helperText && !errorMessage && (
          <p id={`${props.id}-helper`} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'