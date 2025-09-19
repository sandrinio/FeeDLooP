/**
 * E2E Tests: Authentication System
 *
 * This file contains comprehensive end-to-end tests for the FeeDLooP authentication system
 * using Playwright. Tests cover both error states and expected functionality.
 */

import { test, expect } from '@playwright/test'

/**
 * Test Group: Environment Configuration Error States
 * Tests the application's behavior when environment variables are missing
 */
test.describe('Environment Configuration Errors', () => {
  test('should display environment error when SUPABASE_URL is missing', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login')

    // Should show Next.js runtime error dialog
    await expect(page.locator('[data-testid="runtime-error"]')).toBeVisible()

    // Should display the specific SUPABASE_URL error message
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()

    // Should show error location in source code
    await expect(page.getByText('lib/database/supabase.ts (15:9)')).toBeVisible()

    // Should provide helpful UI elements
    await expect(page.getByRole('button', { name: 'Copy Error Info' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open in editor' })).toBeVisible()
  })

  test('should display environment error on dashboard routes', async ({ page }) => {
    // Navigate to protected dashboard route
    await page.goto('/dashboard')

    // Should show the same environment error (not redirect to login)
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()
  })

  test('should display environment error on API routes', async ({ page }) => {
    // Navigate to API endpoint
    await page.goto('/api/auth/register')

    // Should show environment error for API routes too
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()
  })

  test('should show development tools and error overlay', async ({ page }) => {
    await page.goto('/auth/login')

    // Should show Next.js development tools
    await expect(page.getByRole('button', { name: 'Open Next.js Dev Tools' })).toBeVisible()

    // Should show issues overlay with error count
    const issuesButton = page.getByRole('button', { name: 'Open issues overlay' })
    await expect(issuesButton).toBeVisible()

    // Should show error count (1 error)
    await expect(page.locator('[data-testid="error-count"]').or(page.getByText('1'))).toBeVisible()
  })
})

/**
 * Test Group: Authentication Flow (Expected Functionality)
 * Tests for when environment is properly configured
 */
test.describe('Authentication Flow - Functional Tests', () => {
  // These tests will run when environment variables are properly configured

  test.describe('User Registration', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/auth/register')

      // Should show registration form elements
      await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByLabel('First Name')).toBeVisible()
      await expect(page.getByLabel('Last Name')).toBeVisible()
      await expect(page.getByLabel('Company')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/auth/register')

      // Try to submit empty form
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show validation errors
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
      await expect(page.getByText('First name is required')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/auth/register')

      // Enter invalid email
      await page.getByLabel('Email').fill('invalid-email')
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show email validation error
      await expect(page.getByText('Please enter a valid email address')).toBeVisible()
    })

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/auth/register')

      // Enter weak password
      await page.getByLabel('Password').fill('weak')
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show password validation errors
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
      await expect(page.getByText('Password must contain uppercase, lowercase, number, and special character')).toBeVisible()
    })

    test('should successfully register new user', async ({ page }) => {
      await page.goto('/auth/register')

      // Fill out valid registration form
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByLabel('First Name').fill('John')
      await page.getByLabel('Last Name').fill('Doe')
      await page.getByLabel('Company').fill('Test Company')

      // Submit form
      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should redirect to login or dashboard
      await expect(page.url()).toMatch(/\/(auth\/login|dashboard)/)

      // Should show success message
      await expect(page.getByText('Account created successfully')).toBeVisible()
    })

    test('should handle duplicate email registration', async ({ page }) => {
      await page.goto('/auth/register')

      // Try to register with existing email
      await page.getByLabel('Email').fill('existing@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByLabel('First Name').fill('John')
      await page.getByLabel('Last Name').fill('Doe')
      await page.getByLabel('Company').fill('Test Company')

      await page.getByRole('button', { name: 'Create Account' }).click()

      // Should show error message
      await expect(page.getByText('Email address already in use')).toBeVisible()
    })
  })

  test.describe('User Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login')

      // Should show login form elements
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible()
    })

    test('should validate login fields', async ({ page }) => {
      await page.goto('/auth/login')

      // Try to submit empty form
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show validation errors
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
    })

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/auth/login')

      // Enter invalid credentials
      await page.getByLabel('Email').fill('wrong@example.com')
      await page.getByLabel('Password').fill('wrongpassword')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show error message
      await expect(page.getByText('Invalid email or password')).toBeVisible()
    })

    test('should successfully log in valid user', async ({ page }) => {
      await page.goto('/auth/login')

      // Enter valid credentials
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should redirect to dashboard
      await expect(page.url()).toMatch(/\/dashboard/)

      // Should show user info in dashboard
      await expect(page.getByText('Welcome, John!')).toBeVisible()
    })

    test('should handle unverified email', async ({ page }) => {
      await page.goto('/auth/login')

      // Try to login with unverified email
      await page.getByLabel('Email').fill('unverified@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should show verification required message
      await expect(page.getByText('Email verification required')).toBeVisible()
    })
  })

  test.describe('Route Protection', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard')

      // Should redirect to login page
      await expect(page.url()).toMatch(/\/auth\/login/)

      // Should include callback URL parameter
      await expect(page.url()).toContain('callbackUrl=%2Fdashboard')
    })

    test('should redirect unauthenticated users from project pages', async ({ page }) => {
      // Try to access project page without authentication
      await page.goto('/dashboard/projects/123')

      // Should redirect to login page
      await expect(page.url()).toMatch(/\/auth\/login/)
    })

    test('should allow access to public routes', async ({ page }) => {
      // Should allow access to login page
      await page.goto('/auth/login')
      await expect(page.url()).toMatch(/\/auth\/login/)

      // Should allow access to registration page
      await page.goto('/auth/register')
      await expect(page.url()).toMatch(/\/auth\/register/)
    })

    test('should return to intended page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/dashboard/projects/123')

      // Should redirect to login with callback
      await expect(page.url()).toMatch(/\/auth\/login/)
      await expect(page.url()).toContain('callbackUrl=')

      // Login with valid credentials
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Should redirect to originally requested page
      await expect(page.url()).toMatch(/\/dashboard\/projects\/123/)
    })
  })

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Verify logged in
      await expect(page.url()).toMatch(/\/dashboard/)

      // Reload page
      await page.reload()

      // Should still be logged in
      await expect(page.url()).toMatch(/\/dashboard/)
      await expect(page.getByText('Welcome, John!')).toBeVisible()
    })

    test('should handle session expiry', async ({ page }) => {
      // Mock expired session by clearing cookies
      await page.context().clearCookies()

      // Try to access protected page
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page.url()).toMatch(/\/auth\/login/)
    })

    test('should successfully log out user', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.getByLabel('Email').fill('test@example.com')
      await page.getByLabel('Password').fill('SecurePass123!')
      await page.getByRole('button', { name: 'Sign In' }).click()

      // Logout
      await page.getByRole('button', { name: 'Sign Out' }).click()

      // Should redirect to login page
      await expect(page.url()).toMatch(/\/auth\/login/)

      // Should not be able to access protected pages
      await page.goto('/dashboard')
      await expect(page.url()).toMatch(/\/auth\/login/)
    })
  })
})

/**
 * Test Group: API Endpoint Testing
 * Tests for authentication API endpoints
 */
test.describe('Authentication API Endpoints', () => {
  test('POST /api/auth/register should handle valid registration', async ({ page }) => {
    const response = await page.request.post('/api/auth/register', {
      data: {
        email: 'api-test@example.com',
        password: 'SecurePass123!',
        first_name: 'API',
        last_name: 'Test',
        company: 'Test Company'
      }
    })

    expect(response.status()).toBe(201)

    const data = await response.json()
    expect(data.message).toBe('Account created successfully')
    expect(data.user.email).toBe('api-test@example.com')
  })

  test('POST /api/auth/register should reject invalid data', async ({ page }) => {
    const response = await page.request.post('/api/auth/register', {
      data: {
        email: 'invalid-email',
        password: 'weak'
      }
    })

    expect(response.status()).toBe(400)

    const data = await response.json()
    expect(data.error).toContain('validation')
  })

  test('POST /api/auth/login should authenticate valid credentials', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'SecurePass123!'
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.message).toBe('Login successful')
    expect(data.user.email).toBe('test@example.com')
    expect(data.session.access_token).toBeDefined()
  })

  test('POST /api/auth/login should reject invalid credentials', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      }
    })

    expect(response.status()).toBe(401)

    const data = await response.json()
    expect(data.error).toContain('Invalid')
  })

  test('GET /api/auth/login should return current session', async ({ page }) => {
    // First login to get session
    await page.request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'SecurePass123!'
      }
    })

    // Then check session
    const response = await page.request.get('/api/auth/login')

    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data.authenticated).toBe(true)
    expect(data.user.email).toBe('test@example.com')
  })
})

/**
 * Test Group: Error Handling and Edge Cases
 */
test.describe('Error Handling and Edge Cases', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('/api/auth/login', route => route.abort())

    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('SecurePass123!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Should show network error message
    await expect(page.getByText('Network error. Please try again.')).toBeVisible()
  })

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock server error
    await page.route('/api/auth/login', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' })
    }))

    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('SecurePass123!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Should show server error message
    await expect(page.getByText('Server error. Please try again later.')).toBeVisible()
  })

  test('should handle slow responses with loading states', async ({ page }) => {
    // Mock slow response
    await page.route('/api/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Login successful', user: { email: 'test@example.com' } })
      })
    })

    await page.goto('/auth/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('SecurePass123!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // Should show loading state
    await expect(page.getByText('Signing in...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeDisabled()
  })
})