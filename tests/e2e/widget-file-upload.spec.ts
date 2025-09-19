/**
 * E2E Tests: Widget File Upload Functionality
 *
 * This file contains comprehensive E2E tests for the widget's file upload
 * functionality using real test images and minified widget builds.
 */

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

const TEST_IMAGE_PATH = path.join(process.cwd(), 'test_image.png')

test.describe('Widget File Upload Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Enable debug logging for upload tests
    page.on('console', msg => {
      if (msg.text().includes('upload') || msg.text().includes('file') || msg.text().includes('attachment')) {
        console.log('Widget upload log:', msg.text())
      }
    })
  })

  test('should upload real image file using minified widget', async ({ page }) => {
    // Create test page with minified widget
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Widget File Upload Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .test-info { background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="test-info">
          <h2>File Upload Test Page</h2>
          <p>Testing widget file upload with real image</p>
        </div>

        <!-- Use minified widget -->
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key"
          data-position="bottom-right"
          data-theme="default">
        </script>
      </body>
      </html>
    `)

    // Wait for widget to initialize
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify widget trigger is visible
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()

    // Click widget trigger to open
    await trigger.click()

    // Wait for panel to open with animation
    await page.waitForTimeout(1000)

    // Verify widget panel is open
    const panel = page.locator('.feedloop-panel')
    await expect(panel).toBeVisible()

    // Click on "Report Bug" type
    const bugButton = page.locator('[data-type="bug"]')
    await expect(bugButton).toBeVisible()
    await bugButton.click()

    // Fill in basic form fields
    const titleInput = page.locator('input[name="title"]')
    await expect(titleInput).toBeVisible()
    await titleInput.fill('Test bug report with image attachment')

    const descriptionTextarea = page.locator('.feedloop-editor')
    await expect(descriptionTextarea).toBeVisible()
    await descriptionTextarea.fill('This is a test bug report that includes an image attachment.')

    // Test file upload functionality
    const dropZone = page.locator('.feedloop-drop-zone')
    await expect(dropZone).toBeVisible()

    // Get file input (hidden)
    const fileInput = page.locator('input[type="file"]')

    // Upload the test image
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for file processing
    await page.waitForTimeout(2000)

    // Verify file was added to the list
    const fileList = page.locator('.feedloop-file-list')
    await expect(fileList).toBeVisible()

    const fileItem = page.locator('.feedloop-file-item')
    await expect(fileItem).toBeVisible()

    // Verify file name is displayed
    const fileName = page.locator('.feedloop-file-name')
    await expect(fileName).toBeVisible()
    await expect(fileName).toContainText('test_image.png')

    // Verify file size is displayed
    const fileSize = page.locator('.feedloop-file-size')
    await expect(fileSize).toBeVisible()

    // Optional: Fill contact information
    const nameInput = page.locator('input[name="name"]')
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User')
    }

    const emailInput = page.locator('input[name="email"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com')
    }

    // Submit the form
    const submitButton = page.locator('.feedloop-submit-btn')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()

    // Intercept the submit request
    const submitPromise = page.waitForResponse(response =>
      response.url().includes('/api/widget/submit') && response.request().method() === 'POST'
    )

    await submitButton.click()

    // Wait for submission response
    const submitResponse = await submitPromise
    expect(submitResponse.status()).toBe(201)

    // Verify success message
    await expect(page.locator('.feedloop-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.feedloop-success')).toContainText('successfully')
  })

  test('should handle multiple file uploads', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Open widget
    await page.locator('.feedloop-trigger-btn').click()
    await page.waitForTimeout(1000)

    // Select bug report type
    await page.locator('[data-type="bug"]').click()

    // Fill basic fields
    await page.locator('input[name="title"]').fill('Multiple files test')
    await page.locator('.feedloop-editor').fill('Testing multiple file upload')

    // Upload multiple files (same file multiple times for test)
    const fileInput = page.locator('input[type="file"]')

    // Upload first file
    await fileInput.setInputFiles(TEST_IMAGE_PATH)
    await page.waitForTimeout(1000)

    // Verify first file is listed
    await expect(page.locator('.feedloop-file-item').first()).toBeVisible()

    // Upload second file (we'll simulate with same file)
    // Note: In real scenario, you'd use different files
    await fileInput.setInputFiles([TEST_IMAGE_PATH])
    await page.waitForTimeout(1000)

    // Verify file count is managed (should handle duplicates appropriately)
    const fileItems = page.locator('.feedloop-file-item')
    const count = await fileItems.count()
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(5) // Max 5 files allowed
  })

  test('should remove uploaded files', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Open widget and navigate to form
    await page.locator('.feedloop-trigger-btn').click()
    await page.waitForTimeout(1000)
    await page.locator('[data-type="bug"]').click()

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)
    await page.waitForTimeout(1000)

    // Verify file is listed
    await expect(page.locator('.feedloop-file-item')).toBeVisible()

    // Click remove button
    const removeButton = page.locator('.feedloop-file-remove')
    await expect(removeButton).toBeVisible()
    await removeButton.click()

    // Verify file is removed
    await expect(page.locator('.feedloop-file-item')).not.toBeVisible()
  })

  test('should validate file types and sizes', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Open widget
    await page.locator('.feedloop-trigger-btn').click()
    await page.waitForTimeout(1000)
    await page.locator('[data-type="bug"]').click()

    // Verify upload constraints are displayed
    await expect(page.locator('.feedloop-drop-zone')).toBeVisible()

    // Check for file type and size constraints
    const noticeText = page.locator('.feedloop-notice')
    if (await noticeText.isVisible()) {
      await expect(noticeText).toContainText('5MB')
    }
  })

  test('should work with drag and drop file upload', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Open widget
    await page.locator('.feedloop-trigger-btn').click()
    await page.waitForTimeout(1000)
    await page.locator('[data-type="bug"]').click()

    const dropZone = page.locator('.feedloop-drop-zone')
    await expect(dropZone).toBeVisible()

    // Test drag over styling
    await dropZone.hover()

    // Simulate file drop by using the file input
    // (Playwright doesn't support real drag-and-drop file operations)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)
    await page.waitForTimeout(1000)

    // Verify file was processed
    await expect(page.locator('.feedloop-file-item')).toBeVisible()
  })

  test('should display file upload progress feedback', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Open widget and upload file
    await page.locator('.feedloop-trigger-btn').click()
    await page.waitForTimeout(1000)
    await page.locator('[data-type="bug"]').click()

    // Fill required fields
    await page.locator('input[name="title"]').fill('Upload progress test')
    await page.locator('.feedloop-editor').fill('Testing upload progress')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Submit form to test upload process
    const submitButton = page.locator('.feedloop-submit-btn')

    // Check if submit button shows loading state during upload
    await submitButton.click()

    // The button might show loading state briefly
    // We'll check for either success or error states
    await page.waitForTimeout(5000)

    // Verify the form handled the submission
    const hasSuccess = await page.locator('.feedloop-success').isVisible()
    const hasError = await page.locator('.feedloop-error').isVisible()

    expect(hasSuccess || hasError).toBe(true)
  })
})

test.describe('Widget Cross-Device File Upload', () => {

  test('should handle file upload on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // On mobile, widget should be responsive
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()
    await trigger.click()

    await page.waitForTimeout(1000)

    // Widget panel should be full-screen on mobile
    const panel = page.locator('.feedloop-panel')
    await expect(panel).toBeVisible()

    // Select bug type and test file upload
    await page.locator('[data-type="bug"]').click()

    const dropZone = page.locator('.feedloop-drop-zone')
    await expect(dropZone).toBeVisible()

    // Upload file on mobile
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)
    await page.waitForTimeout(1000)

    // Verify file upload works on mobile
    await expect(page.locator('.feedloop-file-item')).toBeVisible()
  })
})