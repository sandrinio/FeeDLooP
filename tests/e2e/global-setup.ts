import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')

  // Setup test database with verified user for E2E tests
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Navigate to test endpoint to setup verified user
    await page.goto('http://localhost:3000/api/test-verify-user', {
      waitUntil: 'networkidle'
    })

    // Wait for user verification
    await page.waitForTimeout(1000)

    console.log('✅ Test user verified and ready for E2E tests')
  } catch (error) {
    console.error('❌ Error setting up test user:', error)
  } finally {
    await browser.close()
  }
}

export default globalSetup