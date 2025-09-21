/**
 * E2E Test: Enhanced Reports Table with Filtering and Tooltips
 * Tests scenarios 1-3: Table display, filtering, and hover tooltips
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'b6676813-5f1a-41f6-921b-95f16a4183a2';

test.describe('Enhanced Reports Table - UI Tests', () => {
  // Scenario 1: Enhanced Data Table Display
  test('Enhanced data table display with proper columns', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Wait for table to load
    const table = page.locator('table, [data-testid="reports-table"]');
    await expect(table).toBeVisible();

    // Check for required column headers
    const headers = page.locator('th, [role="columnheader"]');

    // Required columns: Title, URL, Priority, Submitted Date
    await expect(headers).toContainText(['Title', 'URL', 'Priority', 'Submitted']);

    // Ensure Status column is NOT present
    const statusHeader = headers.filter({ hasText: /^Status$/i });
    expect(await statusHeader.count()).toBe(0);

    // Check table has proper styling (modern UI)
    const tableClasses = await table.getAttribute('class');
    expect(tableClasses).toContain('divide-y'); // Tailwind class for modern table styling

    // Test responsive layout on different screen sizes
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(table).toBeVisible();

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(table).toBeVisible();

    // Mobile view - table should still be usable
    await page.setViewportSize({ width: 375, height: 667 });
    const scrollContainer = page.locator('[data-testid="table-scroll-container"], .overflow-x-auto');

    if (await scrollContainer.count() > 0) {
      await expect(scrollContainer).toBeVisible();
    }
  });

  // Scenario 2: Column Filtering Functionality
  test('Column filtering functionality for all filters', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Wait for filters to be visible
    const filterSection = page.locator('[data-testid="filters"], .filters-section');
    await expect(filterSection).toBeVisible();

    // Test 1: Title filter
    const titleFilter = page.locator('input[placeholder*="Search"], input[name="filter-title"]');
    await titleFilter.fill('bug');
    await page.waitForTimeout(300); // Debounce delay

    // Verify filtered results
    const titleCells = page.locator('td[data-column="title"], .report-title');
    const titleCount = await titleCells.count();
    if (titleCount > 0) {
      const firstTitle = await titleCells.first().textContent();
      expect(firstTitle?.toLowerCase()).toContain('bug');
    }

    // Test 2: Type filter
    const typeFilter = page.locator('select[name="filter-type"], [data-testid="type-filter"]');
    await typeFilter.selectOption('bug');
    await page.waitForTimeout(100);

    // Verify type filter works
    const typeBadges = page.locator('[data-testid="type-badge"], .report-type');
    const typeCount = await typeBadges.count();
    if (typeCount > 0) {
      for (let i = 0; i < typeCount; i++) {
        const typeText = await typeBadges.nth(i).textContent();
        expect(typeText?.toLowerCase()).toBe('bug');
      }
    }

    // Test 3: Priority filter
    const priorityFilter = page.locator('select[name="filter-priority"], [data-testid="priority-filter"]');
    await priorityFilter.selectOption('high');
    await page.waitForTimeout(100);

    // Verify priority filter
    const priorityBadges = page.locator('[data-testid="priority-badge"], .report-priority');
    const priorityCount = await priorityBadges.count();
    if (priorityCount > 0) {
      for (let i = 0; i < priorityCount; i++) {
        const priorityText = await priorityBadges.nth(i).textContent();
        expect(priorityText?.toLowerCase()).toBe('high');
      }
    }

    // Test 4: Date range filter
    const dateFromFilter = page.locator('input[type="date"][name="date-from"], [data-testid="date-from"]');
    const dateToFilter = page.locator('input[type="date"][name="date-to"], [data-testid="date-to"]');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (await dateFromFilter.count() > 0) {
      await dateFromFilter.fill(sevenDaysAgo);
    }
    if (await dateToFilter.count() > 0) {
      await dateToFilter.fill(today);
    }
    await page.waitForTimeout(100);

    // Test 5: Clear all filters
    const clearFiltersButton = page.locator('button:has-text("Clear"), [data-testid="clear-filters"]');
    await clearFiltersButton.click();

    // Verify filters are reset
    await expect(titleFilter).toHaveValue('');
    await expect(typeFilter).toHaveValue('all');
    await expect(priorityFilter).toHaveValue('all');
  });

  // Scenario 3: Hover Tooltips
  test('Hover tooltips show title and description', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Wait for table to load
    await page.waitForSelector('[data-testid="reports-table"], table');

    // Find first report title
    const firstTitle = page.locator('td[data-column="title"], .report-title').first();
    await expect(firstTitle).toBeVisible();

    // Get the title text before hover
    const titleText = await firstTitle.textContent();

    // Hover over the title
    await firstTitle.hover();

    // Wait for tooltip to appear (with delay)
    await page.waitForTimeout(350); // 300ms delay + buffer

    // Check for tooltip
    const tooltip = page.locator('[role="tooltip"], [data-testid="report-tooltip"], .tooltip');
    await expect(tooltip).toBeVisible();

    // Verify tooltip contains full title
    const tooltipContent = await tooltip.textContent();
    expect(tooltipContent).toContain(titleText);

    // Verify tooltip also shows description
    const tooltipDescription = tooltip.locator('.tooltip-description, [data-testid="tooltip-description"]');
    if (await tooltipDescription.count() > 0) {
      const descriptionText = await tooltipDescription.textContent();
      expect(descriptionText).toBeTruthy();
      expect(descriptionText?.length).toBeGreaterThan(0);
    }

    // Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);

    // Verify tooltip disappears
    await expect(tooltip).not.toBeVisible();

    // Test tooltip with long description
    const reportWithLongDescription = page.locator('td[data-column="title"]').filter({
      hasText: /.{50,}/ // Look for a title that might have a long description
    });

    if (await reportWithLongDescription.count() > 0) {
      await reportWithLongDescription.first().hover();
      await page.waitForTimeout(350);

      const longTooltip = page.locator('[role="tooltip"], .tooltip');
      await expect(longTooltip).toBeVisible();

      // Check tooltip is properly positioned (not off-screen)
      const tooltipBox = await longTooltip.boundingBox();
      const viewport = page.viewportSize();

      if (tooltipBox && viewport) {
        expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
        expect(tooltipBox.y).toBeGreaterThanOrEqual(0);
        expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  // Additional test for report detail navigation (part of Scenario 4)
  test('Clicking title navigates to report detail', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Wait for table to load
    await page.waitForSelector('[data-testid="reports-table"], table');

    // Find first report title
    const firstTitle = page.locator('td[data-column="title"] a, .report-title-link').first();
    await expect(firstTitle).toBeVisible();

    // Get the report ID if available
    const reportId = await firstTitle.getAttribute('data-report-id') ||
                    await firstTitle.getAttribute('href')?.then(href => href?.split('/').pop());

    // Click on the title
    await firstTitle.click();

    // Wait for navigation
    await page.waitForURL(/\/reports\/[a-f0-9-]+$/);

    // Verify we're on the detail page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/reports/');

    if (reportId) {
      expect(currentUrl).toContain(reportId);
    }

    // Verify detail view has diagnostic data sections
    const consoleLogsSection = page.locator('h2:has-text("Console Logs"), [data-testid="console-logs-section"]');
    const networkRequestsSection = page.locator('h2:has-text("Network Requests"), [data-testid="network-requests-section"]');

    // These sections should be present (even if empty)
    await expect(consoleLogsSection.or(networkRequestsSection)).toBeVisible();

    // Test back navigation
    const backButton = page.locator('button:has-text("Back"), [data-testid="back-button"]');
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForURL(/\/reports$/);

      // Verify we're back on the reports list
      const table = page.locator('[data-testid="reports-table"], table');
      await expect(table).toBeVisible();
    }
  });

  // Test for sorting functionality
  test('Table sorting by different columns', async ({ page }) => {
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Wait for table to load
    await page.waitForSelector('[data-testid="reports-table"], table');

    // Test sorting by created date
    const dateHeader = page.locator('th:has-text("Submitted"), th[data-column="created_at"]');
    await dateHeader.click();

    // Check for sort indicator
    const sortIndicator = dateHeader.locator('[data-testid="sort-indicator"], .sort-icon');
    await expect(sortIndicator).toBeVisible();

    // Click again for reverse sort
    await dateHeader.click();

    // Verify sort direction changed
    const sortDirection = await sortIndicator.getAttribute('data-direction') ||
                         await sortIndicator.getAttribute('aria-label');
    expect(['asc', 'desc', 'ascending', 'descending']).toContain(sortDirection?.toLowerCase());

    // Test sorting by priority
    const priorityHeader = page.locator('th:has-text("Priority"), th[data-column="priority"]');
    if (await priorityHeader.isVisible()) {
      await priorityHeader.click();

      // Verify data is re-ordered (check first few items)
      const priorities = page.locator('[data-testid="priority-badge"], .report-priority');
      const firstPriority = await priorities.first().textContent();

      // Click again for opposite order
      await priorityHeader.click();

      const newFirstPriority = await priorities.first().textContent();

      // If there are different priority levels, they should be in different order
      if (await priorities.count() > 1) {
        const secondPriority = await priorities.nth(1).textContent();
        expect(firstPriority !== newFirstPriority || firstPriority !== secondPriority).toBeTruthy();
      }
    }
  });
});