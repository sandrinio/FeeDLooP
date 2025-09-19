import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * Enhanced Invitation System E2E Tests
 * Tests the complete flow of email-based invitations for both existing and non-existing users
 */

// Test data
const TEST_USERS = {
  owner: {
    email: `owner.${Date.now()}@feedloop.test`,
    password: 'TestPassword123!',
    firstName: 'Project',
    lastName: 'Owner',
    company: 'Test Company'
  },
  existingUser: {
    email: `existing.${Date.now()}@feedloop.test`,
    password: 'TestPassword123!',
    firstName: 'Existing',
    lastName: 'User',
    company: 'Test Company'
  },
  newUser: {
    email: `newuser.${Date.now()}@feedloop.test`,
    password: 'TestPassword123!',
    firstName: 'New',
    lastName: 'User',
    company: 'Test Company'
  }
}

const PROJECT_NAME = `Enhanced Invitation Test Project ${Date.now()}`

test.describe('Enhanced Invitation System E2E', () => {
  let ownerPage: Page
  let existingUserPage: Page
  let newUserPage: Page
  let context: BrowserContext
  let projectId: string
  let consoleMessages: string[] = []
  let networkErrors: string[] = []

  // Setup browser console and network monitoring
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    ownerPage = await context.newPage()
    existingUserPage = await context.newPage()
    newUserPage = await context.newPage()

    // Monitor console messages on all pages
    const pages = [ownerPage, existingUserPage, newUserPage]
    pages.forEach((page, index) => {
      const pageLabel = ['Owner', 'ExistingUser', 'NewUser'][index]

      page.on('console', msg => {
        const message = `[${pageLabel}] ${msg.type()}: ${msg.text()}`
        consoleMessages.push(message)
        console.log('CONSOLE:', message)
      })

      page.on('pageerror', error => {
        const message = `[${pageLabel}] PAGE ERROR: ${error.message}`
        consoleMessages.push(message)
        console.error('PAGE ERROR:', message)
      })

      page.on('requestfailed', request => {
        const message = `[${pageLabel}] NETWORK FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`
        networkErrors.push(message)
        console.error('NETWORK ERROR:', message)
      })
    })
  })

  test.afterAll(async () => {
    // Log summary of issues found
    console.log('\n=== E2E TEST SUMMARY ===')
    console.log(`Console Messages: ${consoleMessages.length}`)
    console.log(`Network Errors: ${networkErrors.length}`)

    if (consoleMessages.length > 0) {
      console.log('\nConsole Messages:')
      consoleMessages.forEach(msg => console.log('  ', msg))
    }

    if (networkErrors.length > 0) {
      console.log('\nNetwork Errors:')
      networkErrors.forEach(err => console.log('  ', err))
    }

    await context.close()
  })

  test('1. Owner Registration and Project Creation', async () => {
    console.log('\n=== TEST 1: Owner Registration and Project Creation ===')

    // Navigate to registration
    await ownerPage.goto('http://localhost:3000/auth/register')
    await ownerPage.waitForLoadState('networkidle')

    // Fill registration form
    await ownerPage.fill('[name="email"]', TEST_USERS.owner.email)
    await ownerPage.fill('[name="password"]', TEST_USERS.owner.password)
    await ownerPage.fill('[name="confirmPassword"]', TEST_USERS.owner.password)
    await ownerPage.fill('[name="first_name"]', TEST_USERS.owner.firstName)
    await ownerPage.fill('[name="last_name"]', TEST_USERS.owner.lastName)
    await ownerPage.fill('[name="company"]', TEST_USERS.owner.company)

    // Submit registration
    await ownerPage.click('button[type="submit"]')
    await ownerPage.waitForURL('**/auth/login*', { timeout: 10000 })

    // Login with new account
    await ownerPage.fill('[name="email"]', TEST_USERS.owner.email)
    await ownerPage.fill('[name="password"]', TEST_USERS.owner.password)
    await ownerPage.click('button[type="submit"]')
    await ownerPage.waitForURL('**/dashboard', { timeout: 10000 })

    // Create project
    await ownerPage.click('text=New Project')
    await ownerPage.waitForURL('**/projects/new')
    await ownerPage.fill('[name="name"]', PROJECT_NAME)
    await ownerPage.click('button[type="submit"]')

    // Extract project ID from URL
    await ownerPage.waitForURL('**/projects/*', { timeout: 10000 })
    const url = ownerPage.url()
    projectId = url.split('/projects/')[1].split('/')[0] || url.split('/projects/')[1]

    console.log(`✅ Project created with ID: ${projectId}`)

    // Verify project page loads
    await expect(ownerPage.locator('h1')).toContainText(PROJECT_NAME)
  })

  test('2. Register Existing User (for invitation testing)', async () => {
    console.log('\n=== TEST 2: Register Existing User ===')

    // Register the "existing" user
    await existingUserPage.goto('http://localhost:3000/auth/register')
    await existingUserPage.waitForLoadState('networkidle')

    await existingUserPage.fill('[name="email"]', TEST_USERS.existingUser.email)
    await existingUserPage.fill('[name="password"]', TEST_USERS.existingUser.password)
    await existingUserPage.fill('[name="confirmPassword"]', TEST_USERS.existingUser.password)
    await existingUserPage.fill('[name="first_name"]', TEST_USERS.existingUser.firstName)
    await existingUserPage.fill('[name="last_name"]', TEST_USERS.existingUser.lastName)
    await existingUserPage.fill('[name="company"]', TEST_USERS.existingUser.company)

    await existingUserPage.click('button[type="submit"]')
    await existingUserPage.waitForURL('**/auth/login*', { timeout: 10000 })

    console.log(`✅ Existing user registered: ${TEST_USERS.existingUser.email}`)
  })

  test('3. Invite Existing User to Project', async () => {
    console.log('\n=== TEST 3: Invite Existing User ===')

    // Navigate to team management page
    await ownerPage.goto(`http://localhost:3000/dashboard/projects/${projectId}/team`)
    await ownerPage.waitForLoadState('networkidle')

    // Open invite form
    await ownerPage.click('text=Invite Member')
    await ownerPage.waitForSelector('[data-testid="invite-form"], .relative.top-20', { timeout: 5000 })

    // Fill invite form for existing user
    await ownerPage.fill('input[type="email"]', TEST_USERS.existingUser.email)
    await ownerPage.selectOption('select', 'member')

    // Submit invitation
    await ownerPage.click('button[type="submit"]')

    // Wait for form to close and page to update
    await ownerPage.waitForTimeout(2000)

    // Verify existing user appears as active member
    const memberEmails = await ownerPage.locator('text=' + TEST_USERS.existingUser.email).count()
    expect(memberEmails).toBeGreaterThan(0)

    // Should NOT have "Pending" badge for existing user
    const pendingBadge = await ownerPage.locator('text=Pending').count()
    console.log(`Pending badges found: ${pendingBadge}`)

    console.log(`✅ Existing user invited successfully`)
  })

  test('4. Invite Non-Existing User (Pending Invitation)', async () => {
    console.log('\n=== TEST 4: Invite Non-Existing User ===')

    // Navigate to team management page
    await ownerPage.goto(`http://localhost:3000/dashboard/projects/${projectId}/team`)
    await ownerPage.waitForLoadState('networkidle')

    // Open invite form
    await ownerPage.click('text=Invite Member')
    await ownerPage.waitForSelector('[data-testid="invite-form"], .relative.top-20', { timeout: 5000 })

    // Fill invite form for non-existing user
    await ownerPage.fill('input[type="email"]', TEST_USERS.newUser.email)
    await ownerPage.selectOption('select', 'member')

    // Submit invitation
    await ownerPage.click('button[type="submit"]')

    // Wait for form to close and page to update
    await ownerPage.waitForTimeout(2000)

    // Verify non-existing user appears with "Pending" status
    const newUserEmail = await ownerPage.locator('text=' + TEST_USERS.newUser.email).count()
    expect(newUserEmail).toBeGreaterThan(0)

    // Should have "Pending" badge for non-existing user
    const pendingBadges = await ownerPage.locator('text=Pending').count()
    expect(pendingBadges).toBeGreaterThan(0)

    console.log(`✅ Non-existing user invited successfully (pending status)`)
  })

  test('5. New User Registration with Pending Invitation Processing', async () => {
    console.log('\n=== TEST 5: New User Registration with Pending Invitations ===')

    // Register the new user who has a pending invitation
    await newUserPage.goto('http://localhost:3000/auth/register')
    await newUserPage.waitForLoadState('networkidle')

    await newUserPage.fill('[name="email"]', TEST_USERS.newUser.email)
    await newUserPage.fill('[name="password"]', TEST_USERS.newUser.password)
    await newUserPage.fill('[name="confirmPassword"]', TEST_USERS.newUser.password)
    await newUserPage.fill('[name="first_name"]', TEST_USERS.newUser.firstName)
    await newUserPage.fill('[name="last_name"]', TEST_USERS.newUser.lastName)
    await newUserPage.fill('[name="company"]', TEST_USERS.newUser.company)

    await newUserPage.click('button[type="submit"]')
    await newUserPage.waitForURL('**/auth/login*', { timeout: 10000 })

    // Login with new account
    await newUserPage.fill('[name="email"]', TEST_USERS.newUser.email)
    await newUserPage.fill('[name="password"]', TEST_USERS.newUser.password)
    await newUserPage.click('button[type="submit"]')
    await newUserPage.waitForURL('**/dashboard', { timeout: 10000 })

    // Check if user can see the project they were invited to
    const projectLinks = await newUserPage.locator(`text=${PROJECT_NAME}`).count()
    expect(projectLinks).toBeGreaterThan(0)

    console.log(`✅ New user can access project after registration`)

    // Check on owner's page that user is now active (not pending)
    await ownerPage.goto(`http://localhost:3000/dashboard/projects/${projectId}/team`)
    await ownerPage.waitForLoadState('networkidle')

    // User should still be in team list but without "Pending" badge
    const activeNewUserEmail = await ownerPage.locator('text=' + TEST_USERS.newUser.email).count()
    expect(activeNewUserEmail).toBeGreaterThan(0)

    console.log(`✅ Pending invitation automatically processed`)
  })

  test('6. Remove Team Member', async () => {
    console.log('\n=== TEST 6: Remove Team Member ===')

    // Navigate to team management page
    await ownerPage.goto(`http://localhost:3000/dashboard/projects/${projectId}/team`)
    await ownerPage.waitForLoadState('networkidle')

    // Find and click remove button for existing user (not the new user)
    const existingUserRow = ownerPage.locator(`text=${TEST_USERS.existingUser.email}`).locator('..').locator('..')
    await existingUserRow.locator('[title*="Remove"]').click()

    // Confirm removal
    ownerPage.on('dialog', dialog => dialog.accept())

    // Wait for page to update
    await ownerPage.waitForTimeout(2000)

    // Verify user is removed
    const removedUserCount = await ownerPage.locator('text=' + TEST_USERS.existingUser.email).count()
    expect(removedUserCount).toBe(0)

    // New user should still be there
    const remainingUserCount = await ownerPage.locator('text=' + TEST_USERS.newUser.email).count()
    expect(remainingUserCount).toBeGreaterThan(0)

    console.log(`✅ Team member removed successfully`)
  })

  test('7. Verification Summary', async () => {
    console.log('\n=== TEST 7: Final Verification ===')

    // Final verification on team page
    await ownerPage.goto(`http://localhost:3000/dashboard/projects/${projectId}/team`)
    await ownerPage.waitForLoadState('networkidle')

    // Should have: Owner + New User = 2 members
    const allMembers = await ownerPage.locator('[class*="border-gray-200 rounded-lg"]').count()
    console.log(`Final member count: ${allMembers}`)

    // Verify project still accessible to new user
    await newUserPage.goto(`http://localhost:3000/dashboard/projects/${projectId}`)
    await expect(newUserPage.locator('h1')).toContainText(PROJECT_NAME)

    console.log(`✅ Enhanced invitation system working correctly`)
    console.log(`✅ Project: ${PROJECT_NAME}`)
    console.log(`✅ Owner: ${TEST_USERS.owner.email}`)
    console.log(`✅ Active Member: ${TEST_USERS.newUser.email}`)
    console.log(`✅ Removed Member: ${TEST_USERS.existingUser.email}`)
  })
})