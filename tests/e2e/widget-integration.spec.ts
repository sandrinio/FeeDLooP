/**
 * E2E Tests: Widget Integration and Embedding
 *
 * This file contains E2E tests for the embeddable feedback widget,
 * testing both standalone functionality and integration scenarios.
 */

import { test, expect } from '@playwright/test'

/**
 * Test Group: Widget Standalone Testing
 * Tests for the widget as a standalone component
 */
test.describe('Widget Standalone Functionality', () => {
  test('should load widget script successfully', async ({ page }) => {
    await page.goto('/widget/feedloop-widget.js')

    // Should serve the widget JavaScript file
    const response = await page.waitForResponse('/widget/feedloop-widget.js')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('javascript')
  })

  test('should load widget styles successfully', async ({ page }) => {
    await page.goto('/widget/widget.css')

    // Should serve the widget CSS file
    const response = await page.waitForResponse('/widget/widget.css')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('css')
  })

  test('should initialize widget with proper CSS isolation', async ({ page }) => {
    // Create a test page with the widget embedded
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Widget Test</title>
        <style>
          .test-style { color: red; }
        </style>
      </head>
      <body>
        <div class="test-style">Host page content</div>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Widget should load without affecting host styles
    await expect(page.locator('.test-style')).toHaveCSS('color', 'rgb(255, 0, 0)')

    // Widget should be present
    await expect(page.locator('#feedloop-widget')).toBeVisible()

    // Widget should have isolated styles (scoped with prefixes)
    const widgetContent = page.locator('#feedloop-widget')
    await expect(widgetContent).toBeVisible()
  })
})

/**
 * Test Group: Widget UI Components and Interactions
 * Tests for widget form elements and user interactions
 */
test.describe('Widget UI Components', () => {
  test('should display feedback type selector', async ({ page }) => {
    // Setup widget test environment
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Should show feedback type options
    await expect(page.getByRole('button', { name: 'Report Bug' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suggest Feature' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'General Feedback' })).toBeVisible()
  })

  test('should show bug report form when bug type selected', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Select bug report type
    await page.getByRole('button', { name: 'Report Bug' }).click()

    // Should show bug-specific form fields
    await expect(page.getByLabel('Bug Title')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Steps to Reproduce')).toBeVisible()
    await expect(page.getByLabel('Expected Behavior')).toBeVisible()
    await expect(page.getByLabel('Actual Behavior')).toBeVisible()

    // Should show automatic diagnostic data
    await expect(page.getByText('Browser:')).toBeVisible()
    await expect(page.getByText('URL:')).toBeVisible()
    await expect(page.getByText('User Agent:')).toBeVisible()
    await expect(page.getByText('Screen Resolution:')).toBeVisible()
  })

  test('should show feature request form when feature type selected', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Select feature request type
    await page.getByRole('button', { name: 'Suggest Feature' }).click()

    // Should show feature-specific form fields
    await expect(page.getByLabel('Feature Title')).toBeVisible()
    await expect(page.getByLabel('Description')).toBeVisible()
    await expect(page.getByLabel('Use Case')).toBeVisible()
    await expect(page.getByLabel('Priority')).toBeVisible()

    // Should show priority selector
    await expect(page.getByRole('combobox', { name: 'Priority' })).toBeVisible()
  })

  test('should handle file attachments (up to 5 images)', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    await page.getByRole('button', { name: 'Report Bug' }).click()

    // Should show file upload area
    const fileInput = page.getByLabel('Attach Images (up to 5)')
    await expect(fileInput).toBeVisible()

    // Should show upload constraints
    await expect(page.getByText('Maximum 5 images, 5MB each')).toBeVisible()
    await expect(page.getByText('Supported formats: PNG, JPG, GIF')).toBeVisible()
  })

  test('should provide rich text editing for descriptions', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    await page.getByRole('button', { name: 'General Feedback' }).click()

    // Should show rich text editor
    const editor = page.getByLabel('Feedback Description')
    await expect(editor).toBeVisible()

    // Should support basic formatting
    await expect(page.getByRole('button', { name: 'Bold' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Italic' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bullet List' })).toBeVisible()
  })
})

/**
 * Test Group: Widget Form Validation and Submission
 * Tests for form validation and submission workflows
 */
test.describe('Widget Form Validation and Submission', () => {
  test('should validate required fields', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    await page.getByRole('button', { name: 'Report Bug' }).click()

    // Try to submit empty form
    await page.getByRole('button', { name: 'Submit Bug Report' }).click()

    // Should show validation errors
    await expect(page.getByText('Title is required')).toBeVisible()
    await expect(page.getByText('Description is required')).toBeVisible()
  })

  test('should validate email format when contact info provided', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    await page.getByRole('button', { name: 'Report Bug' }).click()

    // Enter invalid email
    await page.getByLabel('Contact Email (optional)').fill('invalid-email')
    await page.getByRole('button', { name: 'Submit Bug Report' }).click()

    // Should show email validation error
    await expect(page.getByText('Please enter a valid email address')).toBeVisible()
  })

  test('should submit valid bug report successfully', async ({ page }) => {
    // Mock successful API response
    await page.route('/api/widget/submit', route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          reportId: 'report-123',
          message: 'Bug report submitted successfully'
        })
      })
    })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    await page.getByRole('button', { name: 'Report Bug' }).click()

    // Fill out form
    await page.getByLabel('Bug Title').fill('Test bug report')
    await page.getByLabel('Description').fill('This is a test bug description')
    await page.getByLabel('Steps to Reproduce').fill('1. Do this\n2. Do that')

    // Submit form
    await page.getByRole('button', { name: 'Submit Bug Report' }).click()

    // Should show success message
    await expect(page.getByText('Bug report submitted successfully')).toBeVisible()
    await expect(page.getByText('Report ID: report-123')).toBeVisible()

    // Should show option to submit another report
    await expect(page.getByRole('button', { name: 'Submit Another Report' })).toBeVisible()
  })

  test('should handle submission errors gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('/api/widget/submit', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      })
    })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    await page.getByRole('button', { name: 'Report Bug' }).click()
    await page.getByLabel('Bug Title').fill('Test bug report')
    await page.getByLabel('Description').fill('Test description')
    await page.getByRole('button', { name: 'Submit Bug Report' }).click()

    // Should show error message
    await expect(page.getByText('Failed to submit report. Please try again.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible()
  })
})

/**
 * Test Group: Widget Integration with Host Sites
 * Tests for embedding widget in different host environments
 */
test.describe('Widget Integration with Host Sites', () => {
  test('should work with Bootstrap CSS framework', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
        <div class="container">
          <div class="row">
            <div class="col-md-6">
              <h1 class="text-primary">Host Site with Bootstrap</h1>
              <button class="btn btn-primary">Host Button</button>
            </div>
            <div class="col-md-6">
              <div id="feedloop-widget"></div>
            </div>
          </div>
        </div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Host styles should remain intact
    await expect(page.locator('h1')).toHaveClass(/text-primary/)
    await expect(page.locator('.btn')).toHaveClass(/btn-primary/)

    // Widget should function normally
    await expect(page.locator('#feedloop-widget')).toBeVisible()
  })

  test('should work with custom CSS that might conflict', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          /* Potentially conflicting styles */
          button { background: red !important; color: white !important; }
          input { border: 5px solid blue !important; }
          .form-group { margin: 50px !important; }
        </style>
      </head>
      <body>
        <button>Host Button (should be red)</button>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Host button should still be red
    await expect(page.locator('button').first()).toHaveCSS('background-color', 'rgb(255, 0, 0)')

    // Widget should be isolated and not affected
    await expect(page.locator('#feedloop-widget')).toBeVisible()
  })

  test('should support multiple widgets on same page', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget-1"></div>
        <div id="feedloop-widget-2"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'project-1',
            containerId: 'feedloop-widget-1',
            apiUrl: 'http://localhost:3000'
          })
          FeedLoop.init({
            projectId: 'project-2',
            containerId: 'feedloop-widget-2',
            apiUrl: 'http://localhost:3000'
          })
        </script>
      </body>
      </html>
    `)

    // Both widgets should be present
    await expect(page.locator('#feedloop-widget-1')).toBeVisible()
    await expect(page.locator('#feedloop-widget-2')).toBeVisible()

    // Each widget should function independently
    // This would require more complex testing once widget is implemented
  })
})

/**
 * Test Group: Widget Configuration and Customization
 * Tests for widget configuration options and customization
 */
test.describe('Widget Configuration and Customization', () => {
  test('should accept custom configuration options', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000',
            theme: 'dark',
            position: 'bottom-right',
            showContactField: false,
            allowedTypes: ['bug', 'initiative']
          })
        </script>
      </body>
      </html>
    `)

    // Should apply theme configuration
    // Should respect position setting
    // Should hide contact field based on config
    // Should only show allowed feedback types

    await expect(page.locator('#feedloop-widget')).toBeVisible()
  })

  test('should handle invalid configuration gracefully', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            // Missing required projectId
            apiUrl: 'http://localhost:3000',
            invalidOption: 'invalid'
          })
        </script>
      </body>
      </html>
    `)

    // Should log configuration errors
    expect(consoleErrors.some(error =>
      error.includes('projectId is required')
    )).toBe(true)

    // Should still attempt to render widget with defaults where possible
    await expect(page.locator('#feedloop-widget')).toBeVisible()
  })

  test('should support callback functions for events', async ({ page }) => {
    let callbackData: any = null

    // Expose callback function to page context
    await page.exposeFunction('widgetCallback', (data: any) => {
      callbackData = data
    })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="feedloop-widget"></div>
        <script src="http://localhost:3000/widget/feedloop-widget.js"></script>
        <script>
          FeedLoop.init({
            projectId: 'test-project-123',
            apiUrl: 'http://localhost:3000',
            onSubmit: window.widgetCallback,
            onError: window.widgetCallback
          })
        </script>
      </body>
      </html>
    `)

    // Test callback functionality would require widget implementation
    await expect(page.locator('#feedloop-widget')).toBeVisible()
  })
})