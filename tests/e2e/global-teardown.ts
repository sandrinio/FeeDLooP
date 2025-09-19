import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after E2E tests...')

  // Any cleanup operations can go here
  // For now, we'll just log that tests are complete

  console.log('✅ E2E test cleanup completed')
}

export default globalTeardown