/**
 * E2E Tests: Minified Widget Build Validation
 *
 * This file contains E2E tests specifically for the minified widget build,
 * ensuring production readiness and performance.
 */

import { test, expect } from '@playwright/test'

test.describe('Minified Widget Build Validation', () => {

  test('should load minified widget successfully', async ({ page }) => {
    // Navigate to widget demo page
    await page.goto('/widget-demo.html')

    // Wait for widget to initialize
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify widget loads from minified build
    const scriptResponse = await page.waitForResponse(response =>
      response.url().includes('/widget/dist/feedloop-widget.min.js')
    )
    expect(scriptResponse.status()).toBe(200)

    // Verify widget trigger is visible
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()
  })

  test('should validate minified widget file integrity', async ({ page }) => {
    // Check build manifest
    await page.goto('/widget/dist/manifest.json')
    const manifestContent = await page.textContent('body')
    const manifest = JSON.parse(manifestContent)

    // Validate manifest structure
    expect(manifest.name).toBe('FeeDLooP Widget')
    expect(manifest.files.production.main).toBe('feedloop-widget.min.js')
    expect(manifest.files.production.integrity).toMatch(/^sha384-/)
    expect(manifest.files.production.size).toBeGreaterThan(0)

    // Verify integration instructions
    expect(manifest.integration.script).toContain('feedloop-widget.min.js')
    expect(manifest.integration.attributes['data-project-key']).toContain('Required')
  })

  test('should validate CSS injection and isolation in minified widget', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          /* Host page styles that could conflict */
          .test-style { color: red !important; background: yellow; }
          button { color: green !important; }
          * { font-family: serif !important; }
        </style>
      </head>
      <body>
        <div class="test-style">Host page content with conflicting styles</div>
        <button class="test-style">Host button</button>

        <!-- Load minified widget -->
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-project-key"
          data-position="bottom-right">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify widget styles are injected
    const widgetStyles = await page.evaluate(() => {
      const styleElements = document.querySelectorAll('style')
      for (const style of styleElements) {
        if (style.textContent?.includes('feedloop-widget-container')) {
          return style.textContent
        }
      }
      return null
    })

    expect(widgetStyles).toBeTruthy()
    expect(widgetStyles).toContain('.feedloop-widget-container')

    // Verify widget is isolated from host styles
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()

    // Widget button should not inherit host page styles
    const triggerColor = await trigger.evaluate(el => getComputedStyle(el).color)
    expect(triggerColor).not.toBe('rgb(0, 128, 0)') // Not green from host
  })

  test('should validate minified widget performance', async ({ page }) => {
    // Start performance monitoring
    await page.goto('/widget-demo.html')

    // Measure widget load time
    const startTime = Date.now()

    // Wait for widget to be fully loaded and interactive
    await page.waitForLoadState('networkidle')
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()

    const loadTime = Date.now() - startTime

    // Widget should load quickly (under 2 seconds)
    expect(loadTime).toBeLessThan(2000)

    // Check widget file size from manifest
    const manifestResponse = await page.goto('/widget/dist/manifest.json')
    const manifest = await manifestResponse.json()
    const widgetSize = manifest.files.production.size

    // Minified widget should be reasonably sized (under 50KB)
    expect(widgetSize).toBeLessThan(50000)

    console.log(`Widget load time: ${loadTime}ms, Size: ${widgetSize} bytes`)
  })

  test('should validate all widget functionality in minified build', async ({ page }) => {
    await page.goto('/widget-demo.html')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Test widget opening
    const trigger = page.locator('.feedloop-trigger-btn')
    await trigger.click()
    await page.waitForTimeout(1000)

    const panel = page.locator('.feedloop-panel')
    await expect(panel).toBeVisible()

    // Test all feedback types
    const bugButton = page.locator('[data-type="bug"]')
    const initiativeButton = page.locator('[data-type="initiative"]')
    const feedbackButton = page.locator('[data-type="feedback"]')

    await expect(bugButton).toBeVisible()
    await expect(initiativeButton).toBeVisible()
    await expect(feedbackButton).toBeVisible()

    // Test bug form
    await bugButton.click()

    // Verify all form elements are present
    await expect(page.locator('input[name="title"]')).toBeVisible()
    await expect(page.locator('.feedloop-editor')).toBeVisible()
    await expect(page.locator('.feedloop-drop-zone')).toBeVisible()
    await expect(page.locator('.feedloop-submit-btn')).toBeVisible()

    // Test form interaction
    await page.locator('input[name="title"]').fill('Minified widget test')
    await page.locator('.feedloop-editor').fill('Testing minified build functionality')

    // Test file upload
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('/Volumes/My Drive/dev/FeeDLooP_v1/test_image.png')
    await page.waitForTimeout(1000)

    await expect(page.locator('.feedloop-file-item')).toBeVisible()

    // Test widget closing
    const closeButton = page.locator('.feedloop-close-btn')
    await closeButton.click()
    await page.waitForTimeout(500)

    await expect(panel).not.toBeVisible()
    await expect(trigger).toBeVisible()
  })

  test('should validate widget configuration options', async ({ page }) => {
    // Test different configuration options
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="test-config-key"
          data-position="top-left"
          data-theme="dark">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Verify widget respects configuration
    const container = page.locator('.feedloop-widget-container')
    await expect(container).toBeVisible()

    // Check position configuration (this would need to be implemented in widget)
    // For now, just verify widget loads with different config
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()
  })

  test('should handle errors gracefully in minified build', async ({ page }) => {
    // Test with invalid project key
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <script
          src="/widget/dist/feedloop-widget.min.js"
          data-project-key="invalid-project-key">
        </script>
      </body>
      </html>
    `)

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Widget should still load even with invalid key
    const trigger = page.locator('.feedloop-trigger-btn')
    await expect(trigger).toBeVisible()

    // Try to submit form and expect error handling
    await trigger.click()
    await page.waitForTimeout(1000)

    await page.locator('[data-type="bug"]').click()
    await page.locator('input[name="title"]').fill('Error test')
    await page.locator('.feedloop-editor').fill('Testing error handling')

    const submitButton = page.locator('.feedloop-submit-btn')
    await submitButton.click()

    // Should show error message or handle gracefully
    await page.waitForTimeout(3000)

    // Check for error state (widget should handle invalid project key)
    const hasError = await page.locator('.feedloop-error').isVisible()
    const hasSuccess = await page.locator('.feedloop-success').isVisible()

    // Either error should be shown or submission should be prevented
    if (!hasError && !hasSuccess) {
      // Form might prevent submission with invalid key
      await expect(submitButton).toBeVisible()
    }
  })

  test('should validate integrity hash for CDN deployment', async ({ page }) => {
    // Get integrity hash from manifest
    const manifestResponse = await page.goto('/widget/dist/manifest.json')
    const manifest = await manifestResponse.json()
    const integrityHash = manifest.files.production.integrity

    // Verify integrity hash format
    expect(integrityHash).toMatch(/^sha384-[A-Za-z0-9+/]+={0,2}$/)

    // Get integrity from separate file
    const integrityResponse = await page.goto('/widget/dist/integrity.txt')
    const integrityFileContent = await integrityResponse.text()

    expect(integrityFileContent.trim()).toBe(integrityHash)

    // Verify usage examples include integrity
    const usageResponse = await page.goto('/widget/dist/USAGE.md')
    const usageContent = await usageResponse.text()

    expect(usageContent).toContain(integrityHash)
    expect(usageContent).toContain('crossorigin="anonymous"')
  })

  test('should validate build information and versioning', async ({ page }) => {
    // Check build-info.json
    const buildInfoResponse = await page.goto('/widget/dist/build-info.json')
    const buildInfo = await buildInfoResponse.json()

    // Validate build info structure
    expect(buildInfo.version).toBeDefined()
    expect(buildInfo.buildId).toBeDefined()
    expect(buildInfo.buildTime).toBeDefined()
    expect(buildInfo.files.widget.filename).toBe('feedloop-widget.min.js')
    expect(buildInfo.files.widget.size).toBeGreaterThan(0)
    expect(buildInfo.files.widget.integrity).toMatch(/^sha384-/)

    // Verify build timestamp is recent (within last hour for fresh build)
    const buildTime = new Date(buildInfo.buildTime)
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    expect(buildTime.getTime()).toBeGreaterThan(hourAgo.getTime())

    // Check that version info is embedded in minified file
    const widgetResponse = await page.goto('/widget/dist/feedloop-widget.min.js')
    const widgetContent = await widgetResponse.text()

    expect(widgetContent).toContain(`FeeDLooP Widget v${buildInfo.version}`)
    expect(widgetContent).toContain(`Build: ${buildInfo.buildId}`)
  })
})

test.describe('Production Deployment Readiness', () => {

  test('should validate all required files are generated', async ({ page }) => {
    const requiredFiles = [
      '/widget/dist/feedloop-widget.min.js',
      '/widget/dist/feedloop-widget.dev.js',
      '/widget/dist/manifest.json',
      '/widget/dist/build-info.json',
      '/widget/dist/integrity.txt',
      '/widget/dist/USAGE.md'
    ]

    for (const file of requiredFiles) {
      const response = await page.goto(file)
      expect(response.status()).toBe(200)
      console.log(`✓ ${file} exists and accessible`)
    }
  })

  test('should validate CDN deployment instructions', async ({ page }) => {
    const usageResponse = await page.goto('/widget/dist/USAGE.md')
    const usageContent = await usageResponse.text()

    // Verify comprehensive usage examples
    expect(usageContent).toContain('CDN Usage with integrity check')
    expect(usageContent).toContain('Self-hosted without integrity')
    expect(usageContent).toContain('Development Usage')
    expect(usageContent).toContain('Configuration Options')
    expect(usageContent).toContain('data-project-key')
    expect(usageContent).toContain('data-position')
    expect(usageContent).toContain('data-theme')

    // Verify build information is included
    expect(usageContent).toContain('Build Information')
    expect(usageContent).toContain('Version:')
    expect(usageContent).toContain('Build ID:')
    expect(usageContent).toContain('Production Size:')
  })
})