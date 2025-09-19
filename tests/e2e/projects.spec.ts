import { test, expect } from '@playwright/test'

test.describe('Project Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sandro.suladze@gmail.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display projects dashboard', async ({ page }) => {
    // Should show dashboard elements
    await expect(page.getByText(/projects/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create new project/i })).toBeVisible()

    // Should show sidebar navigation
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  })

  test('should create a new project successfully', async ({ page }) => {
    const projectName = `Test Project ${Date.now()}`

    // Click create project button
    await page.click('text=Create New Project')
    await expect(page).toHaveURL('/dashboard/projects/new')

    // Fill project form
    await page.fill('[name="name"]', projectName)

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to project detail page
    await expect(page).toHaveURL(/\/dashboard\/projects\/[a-f0-9-]+$/)

    // Should show project name
    await expect(page.getByText(projectName)).toBeVisible()

    // Should show integration key section
    await expect(page.getByText(/integration key/i)).toBeVisible()
    await expect(page.getByText(/widget script/i)).toBeVisible()
  })

  test('should show validation errors for invalid project creation', async ({ page }) => {
    await page.click('text=Create New Project')
    await expect(page).toHaveURL('/dashboard/projects/new')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page.getByText(/project name is required/i)).toBeVisible()

    // Try with too short name
    await page.fill('[name="name"]', 'ab')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/at least 3 characters/i)).toBeVisible()
  })

  test('should navigate to project detail page', async ({ page }) => {
    // Create a project first
    const projectName = `Test Project ${Date.now()}`
    await page.click('text=Create New Project')
    await page.fill('[name="name"]', projectName)
    await page.click('button[type="submit"]')

    // Should be on project detail page
    await expect(page).toHaveURL(/\/dashboard\/projects\/[a-f0-9-]+$/)

    // Should show project overview sections
    await expect(page.getByText(/reports/i)).toBeVisible()
    await expect(page.getByText(/team/i)).toBeVisible()
    await expect(page.getByText(/export/i)).toBeVisible()
    await expect(page.getByText(/widget integration/i)).toBeVisible()
  })

  test('should copy integration key', async ({ page }) => {
    // Create a project first
    const projectName = `Test Project ${Date.now()}`
    await page.click('text=Create New Project')
    await page.fill('[name="name"]', projectName)
    await page.click('button[type="submit"]')

    // Should be on project detail page
    await expect(page).toHaveURL(/\/dashboard\/projects\/[a-f0-9-]+$/)

    // Click copy button for integration key
    await page.click('[data-testid="copy-integration-key"]')

    // Should show success feedback (checkmark icon)
    await expect(page.locator('[data-testid="copy-success-icon"]')).toBeVisible()
  })

  test('should navigate between dashboard sections', async ({ page }) => {
    // Create a project first
    const projectName = `Test Project ${Date.now()}`
    await page.click('text=Create New Project')
    await page.fill('[name="name"]', projectName)
    await page.click('button[type="submit"]')

    const projectUrl = page.url()

    // Navigate to team management
    await page.click('text=Team')
    await expect(page).toHaveURL(`${projectUrl}/team`)
    await expect(page.getByText(/team management/i)).toBeVisible()
    await expect(page.getByText(/invite member/i)).toBeVisible()

    // Navigate to reports
    await page.click('text=Reports')
    await expect(page).toHaveURL(`${projectUrl}/reports`)
    await expect(page.getByText(/project reports/i)).toBeVisible()

    // Navigate back to overview
    await page.click('text=Overview')
    await expect(page).toHaveURL(projectUrl)
  })

  test('should handle project settings access', async ({ page }) => {
    // Create a project first
    const projectName = `Test Project ${Date.now()}`
    await page.click('text=Create New Project')
    await page.fill('[name="name"]', projectName)
    await page.click('button[type="submit"]')

    // Click settings button
    await page.click('text=Settings')

    // Should show settings page or functionality
    // (Implementation depends on settings page structure)
    await expect(page).toHaveURL(/\/settings$/)
  })
})