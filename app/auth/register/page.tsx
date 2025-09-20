'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { RegisterFormSchema, type RegisterForm } from '@/lib/models/user'
import { createFormResolver, handleFormSubmission } from '@/lib/validation/form-utils'
import { FormField } from '@/components/forms/FormField'
import { PasswordStrengthIndicator } from '@/components/forms/PasswordStrengthIndicator'

function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError
  } = useForm<RegisterForm>({
    resolver: createFormResolver(RegisterFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      company: '',
    }
  })
  const watchedPassword = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    setSubmitError('')
    setSuccessMessage('')

    await handleFormSubmission(
      data,
      async (formData) => {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            first_name: formData.first_name,
            last_name: formData.last_name,
            company: formData.company,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          // Check if there are field-specific validation errors
          if (result.details && Array.isArray(result.details)) {
            // Set field-specific errors
            result.details.forEach((detail: { field: string; message: string }) => {
              if (detail.field) {
                setError(detail.field as keyof RegisterForm, {
                  type: 'server',
                  message: detail.message
                })
              }
            })
            setIsLoading(false)
            // Exit without throwing error since we handled it with field-specific errors
            return
          }
          // Only throw error if we don't have field-specific errors
          throw new Error(result.error || 'Registration failed')
        }

        setSuccessMessage(result.message || 'Registration successful!')

        // Redirect to login after short delay to show success message
        setTimeout(() => {
          router.push('/auth/login?message=Registration successful. Please log in.')
        }, 1500)
      },
      (error) => {
        setSubmitError(error.message)
        setIsLoading(false)
      },
      () => {
        // Success handled in the submit function
      }
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-8">
            <img
              src="/logo_with_text.png"
              alt="FeeDLooP"
              className="h-12 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                {...register('first_name')}
                id="first_name"
                type="text"
                label="First Name"
                error={errors.first_name}
                autoComplete="given-name"
              />
              <FormField
                {...register('last_name')}
                id="last_name"
                type="text"
                label="Last Name"
                error={errors.last_name}
                autoComplete="family-name"
              />
            </div>

            {/* Email field */}
            <FormField
              {...register('email')}
              id="email"
              type="email"
              label="Email address"
              error={errors.email}
              autoComplete="email"
            />

            {/* Company field */}
            <FormField
              {...register('company')}
              id="company"
              type="text"
              label="Company"
              error={errors.company}
              autoComplete="organization"
            />

            {/* Password field with strength indicator */}
            <div>
              <FormField
                {...register('password')}
                id="password"
                type="password"
                label="Password"
                error={errors.password}
                autoComplete="new-password"
              />
              <PasswordStrengthIndicator
                password={watchedPassword || ''}
                showFeedback={!!watchedPassword && !errors.password}
              />
            </div>

            {/* Confirm password field */}
            <FormField
              {...register('confirmPassword')}
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-800 text-sm text-center">{successMessage}</p>
            </div>
          )}

          {/* Error message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm text-center">{submitError}</p>
            </div>
          )}

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          {/* Login link */}
          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}