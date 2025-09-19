/**
 * Password Strength Indicator Component
 * Visual feedback for password complexity
 */

import React from 'react'
import { checkPasswordStrength, PasswordStrength } from '@/lib/validation/form-utils'

interface PasswordStrengthIndicatorProps {
  password: string
  showFeedback?: boolean
}

export function PasswordStrengthIndicator({
  password,
  showFeedback = true
}: PasswordStrengthIndicatorProps) {
  const strength = checkPasswordStrength(password)

  if (!password) return null

  const getStrengthColor = (score: number): string => {
    switch (score) {
      case 0:
        return 'bg-red-500'
      case 1:
        return 'bg-red-500'
      case 2:
        return 'bg-orange-500'
      case 3:
        return 'bg-yellow-500'
      case 4:
      case 5:
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getStrengthText = (score: number): string => {
    switch (score) {
      case 0:
        return 'Very Weak'
      case 1:
        return 'Weak'
      case 2:
        return 'Fair'
      case 3:
        return 'Good'
      case 4:
      case 5:
        return 'Strong'
      default:
        return 'Very Weak'
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded ${
              level <= strength.score
                ? getStrengthColor(strength.score)
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Strength text */}
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${
          strength.score >= 3 ? 'text-green-600' : 'text-gray-500'
        }`}>
          Password strength: {getStrengthText(strength.score)}
        </span>
      </div>

      {/* Feedback */}
      {showFeedback && strength.feedback.length > 0 && (
        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">To strengthen your password:</p>
          <ul className="space-y-0.5">
            {strength.feedback.map((feedback, index) => (
              <li key={index} className="flex items-center">
                <span className="text-red-400 mr-1">•</span>
                {feedback}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}