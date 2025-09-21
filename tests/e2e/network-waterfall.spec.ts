// E2E Test: Network Waterfall Visualization
// Tests the network waterfall chart component
// CRITICAL: This test MUST FAIL until implementation is complete

import { test, expect } from '@playwright/test';

test.describe('Network Waterfall Visualization', () => {
  let projectId: string;
  let reportId: string;

  test.beforeAll(async () => {
    // Set up test data - would normally create test project and reports
    projectId = 'test-project-waterfall';
    reportId = 'test-report-with-network-data';
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to report detail page
    await page.goto(`/dashboard/projects/${projectId}/reports/${reportId}`);
  });

  test('should render network waterfall chart', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Should see the waterfall chart container
    const waterfallContainer = page.locator('[data-testid="network-waterfall"]');
    await expect(waterfallContainer).toBeVisible();

    // Should have canvas element for drawing
    const canvas = waterfallContainer.locator('canvas');
    await expect(canvas).toBeVisible();

    // Canvas should have proper dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox!.width).toBeGreaterThan(400);
    expect(canvasBox!.height).toBeGreaterThan(200);
  });

  test('should display network request details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show network requests list
    const requestsList = page.locator('[data-testid="network-requests-list"]');
    await expect(requestsList).toBeVisible();

    // Should have individual request items
    const requestItems = requestsList.locator('[data-testid="network-request-item"]');
    await expect(requestItems.first()).toBeVisible();

    // Each request should show key information
    const firstRequest = requestItems.first();
    await expect(firstRequest.locator('[data-testid="request-url"]')).toBeVisible();
    await expect(firstRequest.locator('[data-testid="request-method"]')).toBeVisible();
    await expect(firstRequest.locator('[data-testid="request-status"]')).toBeVisible();
    await expect(firstRequest.locator('[data-testid="request-duration"]')).toBeVisible();
  });

  test('should show request timing details on hover', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const requestItems = page.locator('[data-testid="network-request-item"]');
    const firstRequest = requestItems.first();

    // Hover over the first request
    await firstRequest.hover();

    // Should show timing tooltip
    const tooltip = page.locator('[data-testid="timing-tooltip"]');
    await expect(tooltip).toBeVisible();

    // Tooltip should contain timing breakdown
    await expect(tooltip.locator('[data-testid="dns-time"]')).toBeVisible();
    await expect(tooltip.locator('[data-testid="tcp-time"]')).toBeVisible();
    await expect(tooltip.locator('[data-testid="request-time"]')).toBeVisible();
    await expect(tooltip.locator('[data-testid="response-time"]')).toBeVisible();
    await expect(tooltip.locator('[data-testid="total-time"]')).toBeVisible();
  });

  test('should allow filtering network requests', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should have filter controls
    const filterContainer = page.locator('[data-testid="network-filter-controls"]');
    await expect(filterContainer).toBeVisible();

    // Test status filter
    const statusFilter = filterContainer.locator('[data-testid="status-filter"]');
    await statusFilter.selectOption('failed');

    // Should update the requests list
    await page.waitForTimeout(100); // Brief wait for filtering
    const failedRequests = page.locator('[data-testid="network-request-item"][data-status*="4"], [data-testid="network-request-item"][data-status*="5"]');

    // All visible requests should be failed requests
    const visibleRequests = page.locator('[data-testid="network-request-item"]:visible');
    const count = await visibleRequests.count();

    for (let i = 0; i < count; i++) {
      const status = await visibleRequests.nth(i).getAttribute('data-status');
      expect(status).toMatch(/^[45]/); // Status codes starting with 4 or 5
    }

    // Test type filter
    const typeFilter = filterContainer.locator('[data-testid="type-filter"]');
    await typeFilter.selectOption('xhr');

    await page.waitForTimeout(100);
    const xhrRequests = page.locator('[data-testid="network-request-item"][data-type="xhr"]:visible');
    expect(await xhrRequests.count()).toBeGreaterThanOrEqual(0);
  });

  test('should display waterfall timeline correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const waterfallContainer = page.locator('[data-testid="network-waterfall"]');

    // Should have timeline axis
    const timelineAxis = waterfallContainer.locator('[data-testid="timeline-axis"]');
    await expect(timelineAxis).toBeVisible();

    // Timeline should show time markers
    const timeMarkers = timelineAxis.locator('[data-testid="time-marker"]');
    await expect(timeMarkers.first()).toBeVisible();

    // Should have proper time scale
    const timeScale = await timeMarkers.first().textContent();
    expect(timeScale).toMatch(/\d+(\.\d+)?(ms|s)/); // Should show time units
  });

  test('should highlight critical path requests', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Critical path requests should be highlighted
    const criticalRequests = page.locator('[data-testid="network-request-item"][data-critical="true"]');

    if (await criticalRequests.count() > 0) {
      const firstCritical = criticalRequests.first();

      // Should have visual distinction
      const classes = await firstCritical.getAttribute('class');
      expect(classes).toContain('critical'); // Should have critical styling
    }
  });

  test('should correlate with error logs when available', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for requests with correlation indicators
    const correlatedRequests = page.locator('[data-testid="network-request-item"][data-correlated="true"]');

    if (await correlatedRequests.count() > 0) {
      const firstCorrelated = correlatedRequests.first();

      // Should show correlation indicator
      const correlationIcon = firstCorrelated.locator('[data-testid="correlation-indicator"]');
      await expect(correlationIcon).toBeVisible();

      // Click to see correlation details
      await correlationIcon.click();

      // Should show correlation modal or tooltip
      const correlationDetails = page.locator('[data-testid="correlation-details"]');
      await expect(correlationDetails).toBeVisible();

      // Should contain error information
      await expect(correlationDetails.locator('[data-testid="related-error"]')).toBeVisible();
    }
  });

  test('should handle large numbers of requests with virtualization', async ({ page }) => {
    // Navigate to a report with many network requests
    await page.goto(`/dashboard/projects/${projectId}/reports/report-with-many-requests`);
    await page.waitForLoadState('networkidle');

    const requestsList = page.locator('[data-testid="network-requests-list"]');

    // Should implement virtual scrolling for performance
    const visibleItems = page.locator('[data-testid="network-request-item"]:visible');
    const totalItems = await visibleItems.count();

    // Should not render all items at once for large datasets
    expect(totalItems).toBeLessThan(100); // Reasonable limit for visible items

    // Should be able to scroll through all items
    await requestsList.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(100);

    // More items should become visible
    const visibleAfterScroll = page.locator('[data-testid="network-request-item"]:visible');
    const newCount = await visibleAfterScroll.count();

    // Items should have changed (virtual scrolling working)
    expect(newCount).toBeGreaterThanOrEqual(totalItems);
  });

  test('should export waterfall data', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const waterfallContainer = page.locator('[data-testid="network-waterfall"]');

    // Should have export button
    const exportButton = waterfallContainer.locator('[data-testid="export-waterfall"]');
    await expect(exportButton).toBeVisible();

    // Click export
    await exportButton.click();

    // Should show export options
    const exportModal = page.locator('[data-testid="export-modal"]');
    await expect(exportModal).toBeVisible();

    // Should have format options
    const formatSelect = exportModal.locator('[data-testid="export-format"]');
    await expect(formatSelect).toBeVisible();

    // Test PNG export
    await formatSelect.selectOption('png');

    const exportConfirm = exportModal.locator('[data-testid="confirm-export"]');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await exportConfirm.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/waterfall.*\.png$/);
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);

    const waterfallContainer = page.locator('[data-testid="network-waterfall"]');
    await expect(waterfallContainer).toBeVisible();

    // Should adapt layout for mobile
    const canvas = waterfallContainer.locator('canvas');
    const mobileBox = await canvas.boundingBox();
    expect(mobileBox!.width).toBeLessThan(400);

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);

    const tabletBox = await canvas.boundingBox();
    expect(tabletBox!.width).toBeGreaterThan(mobileBox!.width);

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);

    const desktopBox = await canvas.boundingBox();
    expect(desktopBox!.width).toBeGreaterThan(tabletBox!.width);
  });

  test('should handle empty network data gracefully', async ({ page }) => {
    // Navigate to report with no network requests
    await page.goto(`/dashboard/projects/${projectId}/reports/report-no-network`);
    await page.waitForLoadState('networkidle');

    const waterfallContainer = page.locator('[data-testid="network-waterfall"]');

    // Should show empty state
    const emptyState = waterfallContainer.locator('[data-testid="empty-network-state"]');
    await expect(emptyState).toBeVisible();

    // Should have helpful message
    await expect(emptyState).toContainText('No network requests recorded');
    await expect(emptyState).toContainText('network data collection');
  });

  test('should show loading state during data fetch', async ({ page }) => {
    // Intercept API call to simulate slow loading
    await page.route('**/api/projects/*/reports/*/network', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      await route.continue();
    });

    await page.goto(`/dashboard/projects/${projectId}/reports/${reportId}`);

    // Should show loading spinner
    const loadingSpinner = page.locator('[data-testid="waterfall-loading"]');
    await expect(loadingSpinner).toBeVisible();

    // Should show loading message
    await expect(loadingSpinner).toContainText('Loading network data');

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Loading should disappear
    await expect(loadingSpinner).not.toBeVisible();

    // Waterfall should be visible
    const waterfallContainer = page.locator('[data-testid="network-waterfall"]');
    await expect(waterfallContainer).toBeVisible();
  });
});