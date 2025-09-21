import { test, expect } from '@playwright/test'

test.describe('Reports Management', () => {
  let projectUrl: string

  // Setup: Login and create a project before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sandro.suladze@gmail.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')

    // Create a new project
    const projectName = `Reports Test Project ${Date.now()}`
    await page.click('text=Create New Project')
    await page.fill('[name="name"]', projectName)
    await page.click('button[type="submit"]')

    projectUrl = page.url()

    // Navigate to reports
    await page.click('text=Reports')
    await expect(page).toHaveURL(`${projectUrl}/reports`)
  })

  test('should display reports management interface', async ({ page }) => {
    // Should show reports page elements
    await expect(page.getByText(/project reports/i)).toBeVisible()
    await expect(page.getByText(/manage and track user feedback/i)).toBeVisible()

    // Should show filters section
    await expect(page.getByText(/filters/i)).toBeVisible()
    await expect(page.getByPlaceholder(/search reports/i)).toBeVisible()

    // Should show filter dropdowns
    await expect(page.locator('select').first()).toBeVisible() // Status filter
    await expect(page.locator('select').nth(1)).toBeVisible() // Type filter
    await expect(page.locator('select').nth(2)).toBeVisible() // Priority filter
  })

  test('should show empty state when no reports exist', async ({ page }) => {
    // Should show empty state
    await expect(page.getByText(/no reports found/i)).toBeVisible()
    await expect(page.getByText(/no reports have been submitted yet/i)).toBeVisible()
  })

  test('should filter reports by status', async ({ page }) => {
    // Select different status filters
    await page.selectOption('select:near(:text("All Statuses"))', 'new')

    // URL should update with filter parameter
    await expect(page).toHaveURL(/status=new/)

    // Select another status
    await page.selectOption('select:near(:text("All Statuses"))', 'in_progress')
    await expect(page).toHaveURL(/status=in_progress/)

    // Clear filters
    await page.click('text=Clear filters')
    await expect(page).toHaveURL(new RegExp(`${projectUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/reports$`))
  })

  test('should filter reports by type', async ({ page }) => {
    // Select type filter
    await page.selectOption('select:near(:text("All Types"))', 'bug')
    await expect(page).toHaveURL(/type=bug/)

    await page.selectOption('select:near(:text("All Types"))', 'initiative')
    await expect(page).toHaveURL(/type=initiative/)

    await page.selectOption('select:near(:text("All Types"))', 'feedback')
    await expect(page).toHaveURL(/type=feedback/)
  })

  test('should filter reports by priority', async ({ page }) => {
    // Select priority filter
    await page.selectOption('select:near(:text("All Priorities"))', 'critical')
    await expect(page).toHaveURL(/priority=critical/)

    await page.selectOption('select:near(:text("All Priorities"))', 'high')
    await expect(page).toHaveURL(/priority=high/)

    await page.selectOption('select:near(:text("All Priorities"))', 'medium')
    await expect(page).toHaveURL(/priority=medium/)

    await page.selectOption('select:near(:text("All Priorities"))', 'low')
    await expect(page).toHaveURL(/priority=low/)
  })

  test('should search reports', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search reports/i)

    // Type in search box
    await searchInput.fill('test search query')

    // Should filter results (even if empty)
    await expect(searchInput).toHaveValue('test search query')

    // Clear search
    await searchInput.clear()
    await expect(searchInput).toHaveValue('')
  })

  test('should combine multiple filters', async ({ page }) => {
    // Apply multiple filters
    await page.selectOption('select:near(:text("All Statuses"))', 'new')
    await page.selectOption('select:near(:text("All Types"))', 'bug')
    await page.selectOption('select:near(:text("All Priorities"))', 'high')

    // URL should contain all filter parameters
    await expect(page).toHaveURL(/status=new/)
    await expect(page).toHaveURL(/type=bug/)
    await expect(page).toHaveURL(/priority=high/)

    // Clear all filters
    await page.click('text=Clear filters')

    // Filters should be reset
    const statusSelect = page.locator('select').first()
    const typeSelect = page.locator('select').nth(1)
    const prioritySelect = page.locator('select').nth(2)

    await expect(statusSelect).toHaveValue('')
    await expect(typeSelect).toHaveValue('')
    await expect(prioritySelect).toHaveValue('')
  })

  test('should show clear filters button only when filters are applied', async ({ page }) => {
    // Initially no clear filters button
    await expect(page.getByText(/clear filters/i)).not.toBeVisible()

    // Apply a filter
    await page.selectOption('select:near(:text("All Statuses"))', 'new')

    // Clear filters button should appear
    await expect(page.getByText(/clear filters/i)).toBeVisible()

    // Clear filters
    await page.click('text=Clear filters')

    // Button should disappear
    await expect(page.getByText(/clear filters/i)).not.toBeVisible()
  })

  test('should show reports table headers correctly', async ({ page }) => {
    // Should show table headers
    await expect(page.getByText(/report/i)).toBeVisible()
    await expect(page.getByText(/type/i)).toBeVisible()
    await expect(page.getByText(/status/i)).toBeVisible()
    await expect(page.getByText(/priority/i)).toBeVisible()
    await expect(page.getByText(/submitted/i)).toBeVisible()
  })

  test('should handle pagination when available', async ({ page }) => {
    // If pagination is present, test it
    const pagination = page.locator('[data-testid="pagination"]')

    if (await pagination.isVisible()) {
      // Should show pagination info
      await expect(page.getByText(/showing page/i)).toBeVisible()

      // Previous button should be disabled on first page
      const prevButton = page.getByRole('button', { name: /previous/i })
      if (await prevButton.isVisible()) {
        await expect(prevButton).toBeDisabled()
      }

      // Next button behavior depends on whether there are more pages
      const nextButton = page.getByRole('button', { name: /next/i })
      if (await nextButton.isVisible()) {
        // Could be enabled or disabled depending on data
        await expect(nextButton).toBeVisible()
      }
    }
  })

  test('should maintain filter state in URL', async ({ page }) => {
    // Apply filters
    await page.selectOption('select:near(:text("All Statuses"))', 'resolved')
    await page.selectOption('select:near(:text("All Types"))', 'initiative')

    const currentUrl = page.url()

    // Refresh page
    await page.reload()

    // Should maintain same URL with filters
    await expect(page).toHaveURL(currentUrl)

    // Filter selections should be preserved
    const statusSelect = page.locator('select').first()
    const typeSelect = page.locator('select').nth(1)

    await expect(statusSelect).toHaveValue('resolved')
    await expect(typeSelect).toHaveValue('initiative')
  })

  test('should navigate back to project overview', async ({ page }) => {
    // Navigate back via breadcrumb or back button
    await page.click('text=Overview')

    // Should return to project detail page
    await expect(page).toHaveURL(projectUrl)
  })
})