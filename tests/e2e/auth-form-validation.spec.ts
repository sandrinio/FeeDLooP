/**
 * Authentication Form Validation E2E Tests
 * Tests the registration and login forms with comprehensive validation scenarios
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test isolation
    await page.goto('/')
  })

  test.describe('Registration Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register')
    })

    test('should display registration form with all required fields', async ({ page }) => {
      // Check that all form fields are present
      await expect(page.locator('#first_name')).toBeVisible()
      await expect(page.locator('#last_name')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#company')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#confirmPassword')).toBeVisible()

      // Check submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeEnabled()
    })

    test('should show validation errors for empty fields', async ({ page }) => {
      // Try to submit empty form
      await page.locator('#first_name').focus()
      await page.locator('#last_name').focus()

      // Check for validation errors
      await expect(page.locator('text=First name is required')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      // Test invalid email
      await page.locator('#email').fill('invalid-email')
      await page.locator('#first_name').focus() // Trigger onBlur

      await expect(page.locator('text=Please enter a valid email address')).toBeVisible()

      // Test valid email
      await page.locator('#email').fill('test@example.com')
      await page.locator('#first_name').focus()

      await expect(page.locator('text=Please enter a valid email address')).not.toBeVisible()
    })

    test('should validate name fields for special characters', async ({ page }) => {
      // Test invalid characters in first name
      await page.locator('#first_name').fill('John123')
      await page.locator('#last_name').focus()

      await expect(page.locator('text=First name can only contain letters, spaces, hyphens, and apostrophes')).toBeVisible()

      // Test valid name
      await page.locator('#first_name').fill("John O'Connor-Smith")
      await page.locator('#last_name').focus()

      await expect(page.locator('text=First name can only contain letters, spaces, hyphens, and apostrophes')).not.toBeVisible()
    })

    test('should show password strength indicator', async ({ page }) => {
      // Test weak password
      await page.locator('#password').fill('weak')

      // Check for password strength indicator
      await expect(page.locator('text=Password strength:')).toBeVisible()
      await expect(page.locator('text=Weak')).toBeVisible()

      // Test strong password
      await page.locator('#password').fill('StrongPass123!')

      await expect(page.locator('text=Strong')).toBeVisible()
    })

    test('should validate password requirements', async ({ page }) => {
      // Test password too short
      await page.locator('#password').fill('short')
      await page.locator('#confirmPassword').focus()

      await expect(page.locator('text=Password must be at least 8 characters long')).toBeVisible()

      // Test password without uppercase
      await page.locator('#password').fill('lowercaseonly123!')
      await page.locator('#confirmPassword').focus()

      await expect(page.locator('text=Password must contain at least one uppercase letter')).toBeVisible()

      // Test password without special character
      await page.locator('#password').fill('NoSpecialChar123')
      await page.locator('#confirmPassword').focus()

      await expect(page.locator('text=Password must contain at least one special character')).toBeVisible()
    })

    test('should validate password confirmation', async ({ page }) => {
      await page.locator('#password').fill('ValidPass123!')
      await page.locator('#confirmPassword').fill('DifferentPass123!')
      await page.locator('#email').focus()

      await expect(page.locator('text=Passwords don\'t match')).toBeVisible()

      // Test matching passwords
      await page.locator('#confirmPassword').fill('ValidPass123!')
      await page.locator('#email').focus()

      await expect(page.locator('text=Passwords don\'t match')).not.toBeVisible()
    })

    test('should enable submit button when form is valid', async ({ page }) => {
      // Fill form with valid data
      await page.locator('#first_name').fill('John')
      await page.locator('#last_name').fill('Doe')
      await page.locator('#email').fill('john.doe@example.com')
      await page.locator('#company').fill('Test Company')
      await page.locator('#password').fill('ValidPass123!')
      await page.locator('#confirmPassword').fill('ValidPass123!')

      // Submit button should be enabled
      await expect(page.locator('button[type="submit"]')).toBeEnabled()
    })

    test('should show loading state on form submission', async ({ page }) => {
      // Fill form with valid data
      await page.locator('#first_name').fill('John')
      await page.locator('#last_name').fill('Doe')
      await page.locator('#email').fill('john.doe@test.com')
      await page.locator('#company').fill('Test Company')
      await page.locator('#password').fill('ValidPass123!')
      await page.locator('#confirmPassword').fill('ValidPass123!')

      // Click submit and check for loading state
      await page.locator('button[type="submit"]').click()

      await expect(page.locator('text=Creating account...')).toBeVisible()
    })

    test('should handle validation errors from server', async ({ page }) => {
      // Fill form with duplicate email (assuming test@example.com exists)
      await page.locator('#first_name').fill('John')
      await page.locator('#last_name').fill('Doe')
      await page.locator('#email').fill('existing@example.com')
      await page.locator('#company').fill('Test Company')
      await page.locator('#password').fill('ValidPass123!')
      await page.locator('#confirmPassword').fill('ValidPass123!')

      await page.locator('button[type="submit"]').click()

      // Should show server error (will depend on actual server response)
      await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Login Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login')
    })

    test('should display login form with required fields', async ({ page }) => {
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeEnabled()
    })

    test('should validate email format on login', async ({ page }) => {
      await page.locator('#email').fill('invalid-email')
      await page.locator('#password').focus()

      await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
    })

    test('should require password field', async ({ page }) => {
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').focus()
      await page.locator('#email').focus()

      await expect(page.locator('text=Password is required')).toBeVisible()
    })

    test('should enable submit button when both fields are valid', async ({ page }) => {
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('anypassword')

      await expect(page.locator('button[type="submit"]')).toBeEnabled()
    })

    test('should show loading state on login submission', async ({ page }) => {
      await page.locator('#email').fill('test@example.com')
      await page.locator('#password').fill('password123')

      await page.locator('button[type="submit"]').click()

      await expect(page.locator('text=Signing in...')).toBeVisible()
    })

    test('should handle login errors gracefully', async ({ page }) => {
      await page.locator('#email').fill('nonexistent@example.com')
      await page.locator('#password').fill('wrongpassword')

      await page.locator('button[type="submit"]').click()

      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Form Navigation', () => {
    test('should navigate between login and register forms', async ({ page }) => {
      // Start at login
      await page.goto('/auth/login')

      // Navigate to register
      await page.locator('text=Don\'t have an account? Sign up').click()
      await expect(page).toHaveURL('/auth/register')

      // Navigate back to login
      await page.locator('text=Already have an account? Sign in').click()
      await expect(page).toHaveURL('/auth/login')
    })

    test('should show success message from registration to login', async ({ page }) => {
      // Simulate successful registration redirect
      await page.goto('/auth/login?message=Registration successful. Please log in.')

      await expect(page.locator('.bg-green-50')).toBeVisible()
      await expect(page.locator('text=Registration successful. Please log in.')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/auth/register')

      // Check for proper labels
      await expect(page.locator('label[for="first_name"]')).toBeVisible()
      await expect(page.locator('label[for="email"]')).toBeVisible()

      // Check ARIA attributes for errors
      await page.locator('#email').fill('invalid')
      await page.locator('#password').focus()

      const emailInput = page.locator('#email')
      await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      await expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
    })

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/register')

      // Tab through form fields
      await page.keyboard.press('Tab')
      await expect(page.locator('#first_name')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('#last_name')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('#email')).toBeFocused()
    })
  })

  test.describe('Rate Limiting', () => {
    test('should handle rate limiting on registration attempts', async ({ page }) => {
      const invalidData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        company: 'Test Co',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      }

      // Make multiple registration attempts
      for (let i = 0; i < 4; i++) {
        await page.goto('/auth/register')

        await page.locator('#first_name').fill(invalidData.first_name)
        await page.locator('#last_name').fill(invalidData.last_name)
        await page.locator('#email').fill(`test${i}@example.com`)
        await page.locator('#company').fill(invalidData.company)
        await page.locator('#password').fill(invalidData.password)
        await page.locator('#confirmPassword').fill(invalidData.confirmPassword)

        await page.locator('button[type="submit"]').click()

        // Wait for response
        await page.waitForTimeout(2000)
      }

      // The 4th attempt should show rate limiting
      await expect(page.locator('text=Too many registration attempts')).toBeVisible({ timeout: 10000 })
    })
  })
})