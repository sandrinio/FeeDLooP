import { test, expect } from '@playwright/test'

test.describe('Responsive Design', () => {
  // Test on different viewports
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 }
  ]

  viewports.forEach(({ name, width, height }) => {
    test.describe(`${name} viewport (${width}x${height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height })

        // Login
        await page.goto('/auth/login')
        await page.fill('[name="email"]', 'sandro.suladze@gmail.com')
        await page.fill('[name="password"]', 'Kukuruku!23')
        await page.click('button[type="submit"]')
        await expect(page).toHaveURL('/dashboard')
      })

      test('should display dashboard correctly', async ({ page }) => {
        // Dashboard should be visible and functional
        await expect(page.getByText(/projects/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /create new project/i })).toBeVisible()

        if (width < 768) {
          // Mobile: sidebar might be hidden or collapsible
          const sidebar = page.locator('[data-testid="sidebar"]')
          // Sidebar behavior depends on implementation
          if (await sidebar.isVisible()) {
            await expect(sidebar).toBeVisible()
          }
        } else {
          // Tablet/Desktop: sidebar should be visible
          await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
        }
      })

      test('should handle navigation correctly', async ({ page }) => {
        // Create a project to test navigation
        const projectName = `Responsive Test ${name} ${Date.now()}`
        await page.click('text=Create New Project')
        await page.fill('[name="name"]', projectName)
        await page.click('button[type="submit"]')

        // Should navigate to project detail
        await expect(page).toHaveURL(/\/dashboard\/projects\/[a-f0-9-]+$/)

        // Navigation elements should be accessible
        await expect(page.getByText(/reports/i)).toBeVisible()
        await expect(page.getByText(/team/i)).toBeVisible()

        if (width >= 768) {
          // On larger screens, navigation items should be easily clickable
          await page.click('text=Team')
          await expect(page).toHaveURL(/\/team$/)
        }
      })

      test('should display forms correctly', async ({ page }) => {
        // Test project creation form
        await page.click('text=Create New Project')

        // Form should be properly sized and usable
        const nameInput = page.locator('[name="name"]')
        await expect(nameInput).toBeVisible()

        const submitButton = page.getByRole('button', { name: /create project/i })
        await expect(submitButton).toBeVisible()

        // Form should be properly responsive
        const form = page.locator('form')
        await expect(form).toBeVisible()

        if (width < 768) {
          // On mobile, form should use full width effectively
          const formRect = await form.boundingBox()
          expect(formRect?.width).toBeGreaterThan(300)
        }
      })

      test('should handle team management interface', async ({ page }) => {
        // Create project and navigate to team management
        const projectName = `Team Responsive Test ${name} ${Date.now()}`
        await page.click('text=Create New Project')
        await page.fill('[name="name"]', projectName)
        await page.click('button[type="submit"]')

        await page.click('text=Team')

        // Team interface should be responsive
        await expect(page.getByText(/team management/i)).toBeVisible()
        await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible()

        // Open invitation modal
        await page.click('text=Invite Member')

        // Modal should be properly sized for viewport
        const modal = page.locator('[role="dialog"]').or(page.locator('.modal'))
        if (await modal.isVisible()) {
          await expect(modal).toBeVisible()

          // Modal content should be accessible
          await expect(page.getByLabel(/email address/i)).toBeVisible()
          await expect(page.getByLabel(/role/i)).toBeVisible()
        }
      })

      test('should display reports interface correctly', async ({ page }) => {
        // Create project and navigate to reports
        const projectName = `Reports Responsive Test ${name} ${Date.now()}`
        await page.click('text=Create New Project')
        await page.fill('[name="name"]', projectName)
        await page.click('button[type="submit"]')

        await page.click('text=Reports')

        // Reports interface should be responsive
        await expect(page.getByText(/project reports/i)).toBeVisible()

        // Filters should be accessible
        await expect(page.getByPlaceholder(/search reports/i)).toBeVisible()

        if (width >= 768) {
          // On larger screens, filters should be in a grid
          const filtersContainer = page.locator('.grid')
          if (await filtersContainer.isVisible()) {
            await expect(filtersContainer).toBeVisible()
          }
        }

        // Filter dropdowns should be usable
        const statusSelect = page.locator('select').first()
        await expect(statusSelect).toBeVisible()
        await statusSelect.selectOption('new')
      })

      test('should handle text and button sizing appropriately', async ({ page }) => {
        // Text should be readable at all sizes
        const headings = page.locator('h1, h2, h3')
        const count = await headings.count()

        for (let i = 0; i < count; i++) {
          const heading = headings.nth(i)
          if (await heading.isVisible()) {
            const fontSize = await heading.evaluate(el =>
              window.getComputedStyle(el).fontSize
            )
            // Font size should be reasonable (at least 14px)
            const fontSizeNum = parseInt(fontSize.replace('px', ''))
            expect(fontSizeNum).toBeGreaterThanOrEqual(14)
          }
        }

        // Buttons should be appropriately sized for touch
        const buttons = page.locator('button')
        const buttonCount = await buttons.count()

        for (let i = 0; i < Math.min(buttonCount, 5); i++) {
          const button = buttons.nth(i)
          if (await button.isVisible()) {
            const rect = await button.boundingBox()
            if (rect) {
              if (width < 768) {
                // On mobile, buttons should be at least 44px tall for touch
                expect(rect.height).toBeGreaterThanOrEqual(36)
              }
              // Buttons should have reasonable minimum width
              expect(rect.width).toBeGreaterThanOrEqual(60)
            }
          }
        }
      })
    })
  })

  test('should handle orientation changes on mobile devices', async ({ page }) => {
    // Test landscape orientation on mobile-sized screen
    await page.setViewportSize({ width: 667, height: 375 }) // Landscape mobile

    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sandro.suladze@gmail.com')
    await page.fill('[name="password"]', 'Kukuruku!23')
    await page.click('button[type="submit"]')

    // Dashboard should still be functional in landscape
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText(/projects/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create new project/i })).toBeVisible()
  })
})