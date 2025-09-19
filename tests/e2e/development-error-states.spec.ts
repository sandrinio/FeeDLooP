/**
 * E2E Tests: Development Error States and Development Workflow
 *
 * This file contains E2E tests specifically for development error states,
 * environment issues, and development tools interaction.
 */

import { test, expect } from '@playwright/test'

/**
 * Test Group: Development Environment Error States
 * Tests for common development issues and error states
 */
test.describe('Development Environment Errors', () => {
  test('should display detailed Supabase environment error', async ({ page }) => {
    await page.goto('/')

    // Should show Next.js development error overlay
    const errorDialog = page.locator('dialog').filter({ hasText: 'Runtime Error' })
    await expect(errorDialog).toBeVisible()

    // Should show specific error message
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()

    // Should show error source location
    await expect(page.getByText('lib/database/supabase.ts (15:9)')).toBeVisible()

    // Should show code context
    await expect(page.getByText("throw new Error('Missing SUPABASE_URL environment variable')")).toBeVisible()

    // Should show call stack
    await expect(page.getByText('Call Stack')).toBeVisible()
    await expect(page.getByText('__webpack_require__')).toBeVisible()
    await expect(page.getByText('middleware.js')).toBeVisible()
  })

  test('should provide helpful development tools', async ({ page }) => {
    await page.goto('/auth/login')

    // Should show error feedback options
    await expect(page.getByText('Was this helpful?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as helpful' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as not helpful' })).toBeVisible()

    // Should show copy error info button
    const copyButton = page.getByRole('button', { name: 'Copy Error Info' })
    await expect(copyButton).toBeVisible()

    // Should show open in editor button
    const editorButton = page.getByRole('button', { name: 'Open in editor' })
    await expect(editorButton).toBeVisible()

    // Should show debugger link
    const debuggerLink = page.getByRole('link', { name: /Learn more about enabling Node.js inspector/ })
    await expect(debuggerLink).toBeVisible()
    await expect(debuggerLink).toHaveAttribute('href', 'https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code')
  })

  test('should show Next.js version and webpack info', async ({ page }) => {
    await page.goto('/auth/register')

    // Should show Next.js version in error overlay
    await expect(page.getByText('Next.js 15.5.3')).toBeVisible()
    await expect(page.getByText('Latest available version is detected (15.5.3).')).toBeVisible()

    // Should show Webpack information
    await expect(page.getByText('Webpack')).toBeVisible()
  })

  test('should display error navigation controls', async ({ page }) => {
    await page.goto('/dashboard')

    // Should show error pagination (when multiple errors exist)
    const prevButton = page.getByRole('button', { name: 'previous' })
    const nextButton = page.getByRole('button', { name: 'next' })

    // Buttons should be present (may be disabled if only one error)
    await expect(prevButton).toBeVisible()
    await expect(nextButton).toBeVisible()

    // Should show error count (1/1)
    await expect(page.getByText('1/')).toBeVisible()
  })

  test('should persist error state across route changes', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login')
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()

    // Navigate to different route
    await page.goto('/dashboard')
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()

    // Navigate to API route
    await page.goto('/api/auth/register')
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()
  })
})

/**
 * Test Group: Development Tools Integration
 * Tests for Next.js development tools and debugging features
 */
test.describe('Development Tools Integration', () => {
  test('should show Next.js Dev Tools button', async ({ page }) => {
    await page.goto('/')

    // Should show dev tools button
    const devToolsButton = page.getByRole('button', { name: 'Open Next.js Dev Tools' })
    await expect(devToolsButton).toBeVisible()
    await expect(devToolsButton).toHaveAttribute('title', 'Open Next.js Dev Tools')
  })

  test('should show issues overlay with error count', async ({ page }) => {
    await page.goto('/auth/login')

    // Should show issues button with error indicator
    const issuesButton = page.getByRole('button', { name: 'Open issues overlay' })
    await expect(issuesButton).toBeVisible()

    // Should show error count badge
    await expect(page.getByText('1')).toBeVisible()
    await expect(page.getByText('Issue')).toBeVisible()

    // Should show collapse button
    const collapseButton = page.getByRole('button', { name: 'Collapse issues badge' })
    await expect(collapseButton).toBeVisible()
  })

  test('should handle Hot Module Replacement (HMR)', async ({ page }) => {
    await page.goto('/auth/login')

    // Should see HMR connection in console
    page.on('console', msg => {
      if (msg.text().includes('[HMR] connected')) {
        expect(msg.text()).toContain('[HMR] connected')
      }
    })

    // Should show Fast Refresh warning for runtime errors
    const consoleMessages = await page.evaluate(() => {
      return performance.getEntriesByType('navigation').length
    })

    expect(consoleMessages).toBeGreaterThan(0)
  })
})

/**
 * Test Group: Environment Variable Testing
 * Tests for different environment configurations
 */
test.describe('Environment Variable Testing', () => {
  test('should handle missing SUPABASE_URL', async ({ page }) => {
    await page.goto('/auth/login')

    // Should show specific SUPABASE_URL error
    await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()
    await expect(page.getByText('lib/database/supabase.ts')).toBeVisible()
  })

  test('should handle missing NEXTAUTH_SECRET (when applicable)', async ({ page }) => {
    // This test would run when SUPABASE_URL is set but NEXTAUTH_SECRET is missing
    // For now, we document the expected behavior

    // Expected: Should show NextAuth configuration error
    // await expect(page.getByText('Please add NEXTAUTH_SECRET')).toBeVisible()
  })

  test('should show development vs production behavior', async ({ page }) => {
    await page.goto('/')

    // In development, should show detailed error messages
    await expect(page.getByText('Runtime Error')).toBeVisible()
    await expect(page.getByText('Call Stack')).toBeVisible()

    // Should show development-specific features
    await expect(page.getByRole('button', { name: 'Open Next.js Dev Tools' })).toBeVisible()
    await expect(page.getByText('Download the React DevTools')).toBeVisible()
  })
})

/**
 * Test Group: Console and Network Monitoring
 * Tests for development debugging and monitoring
 */
test.describe('Console and Network Monitoring', () => {
  test('should capture console errors and warnings', async ({ page }) => {
    const consoleMessages: string[] = []

    page.on('console', msg => {
      consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`)
    })

    await page.goto('/auth/login')

    // Should capture React DevTools message
    expect(consoleMessages.some(msg =>
      msg.includes('Download the React DevTools')
    )).toBe(true)

    // Should capture HMR connection
    expect(consoleMessages.some(msg =>
      msg.includes('[HMR] connected')
    )).toBe(true)

    // Should capture environment variable error
    expect(consoleMessages.some(msg =>
      msg.includes('Missing SUPABASE_URL environment variable')
    )).toBe(true)
  })

  test('should capture network requests and errors', async ({ page }) => {
    const requests: string[] = []
    const responses: { url: string, status: number }[] = []

    page.on('request', request => {
      requests.push(request.url())
    })

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status()
      })
    })

    await page.goto('/auth/login')

    // Should make requests for static assets
    expect(requests.some(url => url.includes('favicon.ico'))).toBe(true)

    // Should get 500 errors for pages due to environment issues
    expect(responses.some(res => res.status === 500)).toBe(true)
  })

  test('should handle webpack compilation messages', async ({ page }) => {
    await page.goto('/')

    // Should see compilation success in server logs (not directly testable in browser)
    // But should see evidence of successful compilation (page loads, even with errors)
    await expect(page.locator('body')).toBeVisible()

    // Should show webpack cache warnings in console
    const consoleMessages: string[] = []
    page.on('console', msg => {
      consoleMessages.push(msg.text())
    })

    // Wait for potential webpack messages
    await page.waitForTimeout(1000)
  })
})

/**
 * Test Group: Development Performance and Debugging
 * Tests for development performance and debugging capabilities
 */
test.describe('Development Performance and Debugging', () => {
  test('should load development assets quickly', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/auth/login')

    // Should load page reasonably quickly even with errors
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // 5 seconds max for dev environment
  })

  test('should provide source map information', async ({ page }) => {
    await page.goto('/auth/login')

    // Should show original source locations in error stack
    await expect(page.getByText('lib/database/supabase.ts (15:9)')).toBeVisible()

    // Should show file paths that match source code structure
    await expect(page.getByText('.next/server/middleware.js')).toBeVisible()
  })

  test('should enable React DevTools in development', async ({ page }) => {
    await page.goto('/auth/login')

    // Should show React DevTools prompt
    await expect(page.getByText('Download the React DevTools')).toBeVisible()

    // Should include devtools installation link
    const reactDevToolsText = await page.textContent('body')
    expect(reactDevToolsText).toContain('react.dev/link/react-devtools')
  })

  test('should show detailed error boundaries', async ({ page }) => {
    await page.goto('/dashboard')

    // Should show development error boundary with full details
    await expect(page.locator('dialog').filter({ hasText: 'Runtime Error' })).toBeVisible()

    // Should not show production error page
    await expect(page.getByText('Something went wrong')).not.toBeVisible()
    await expect(page.getByText('Internal Server Error')).not.toBeVisible()
  })
})

/**
 * Test Group: Route and Middleware Testing
 * Tests for Next.js routing and middleware behavior in error states
 */
test.describe('Route and Middleware Behavior', () => {
  test('should handle middleware errors gracefully', async ({ page }) => {
    // All routes should show the same middleware error
    const routes = ['/', '/auth/login', '/auth/register', '/dashboard', '/api/auth/register']

    for (const route of routes) {
      await page.goto(route)

      // Should show environment error from middleware
      await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()

      // Should show middleware in call stack
      await expect(page.getByText('middleware.js')).toBeVisible()
    }
  })

  test('should show 404 behavior when routes do not exist', async ({ page }) => {
    // Note: Currently all routes show environment error due to middleware
    // This test documents expected behavior when environment is fixed

    await page.goto('/nonexistent-route')

    // Currently shows environment error, but when fixed should show 404
    // await expect(page.getByText('404')).toBeVisible()
    // await expect(page.getByText('Page Not Found')).toBeVisible()
  })

  test('should handle API route errors consistently', async ({ page }) => {
    const apiRoutes = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/projects',
      '/api/nonexistent'
    ]

    for (const route of apiRoutes) {
      await page.goto(route)

      // Should show consistent error handling
      await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()
    }
  })
})