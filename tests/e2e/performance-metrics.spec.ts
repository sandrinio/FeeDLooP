// E2E Test: Performance Metrics Display
// Tests the Core Web Vitals and performance metrics components
// CRITICAL: This test MUST FAIL until implementation is complete

import { test, expect } from '@playwright/test';

test.describe('Performance Metrics Display', () => {
  let projectId: string;
  let reportId: string;

  test.beforeAll(async () => {
    // Set up test data
    projectId = 'test-project-performance';
    reportId = 'test-report-with-metrics';
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to report detail page
    await page.goto(`/dashboard/projects/${projectId}/reports/${reportId}`);
    await page.waitForLoadState('networkidle');
  });

  test('should display Core Web Vitals metrics', async ({ page }) => {
    // Should see performance metrics container
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');
    await expect(metricsContainer).toBeVisible();

    // Should display individual metrics
    const fcpMetric = metricsContainer.locator('[data-testid="metric-fcp"]');
    const lcpMetric = metricsContainer.locator('[data-testid="metric-lcp"]');
    const clsMetric = metricsContainer.locator('[data-testid="metric-cls"]');
    const fidMetric = metricsContainer.locator('[data-testid="metric-fid"]');
    const ttiMetric = metricsContainer.locator('[data-testid="metric-tti"]');

    await expect(fcpMetric).toBeVisible();
    await expect(lcpMetric).toBeVisible();
    await expect(clsMetric).toBeVisible();
    await expect(fidMetric).toBeVisible();
    await expect(ttiMetric).toBeVisible();

    // Each metric should have value and label
    await expect(fcpMetric.locator('[data-testid="metric-value"]')).toBeVisible();
    await expect(fcpMetric.locator('[data-testid="metric-label"]')).toContainText('First Contentful Paint');

    await expect(lcpMetric.locator('[data-testid="metric-value"]')).toBeVisible();
    await expect(lcpMetric.locator('[data-testid="metric-label"]')).toContainText('Largest Contentful Paint');

    await expect(clsMetric.locator('[data-testid="metric-value"]')).toBeVisible();
    await expect(clsMetric.locator('[data-testid="metric-label"]')).toContainText('Cumulative Layout Shift');
  });

  test('should show metric status with color coding', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Check FCP status
    const fcpMetric = metricsContainer.locator('[data-testid="metric-fcp"]');
    const fcpStatus = await fcpMetric.getAttribute('data-status');

    // Status should be good, needs-improvement, or poor
    expect(fcpStatus).toMatch(/^(good|needs-improvement|poor)$/);

    // Should have appropriate color classes
    const fcpClasses = await fcpMetric.getAttribute('class');
    if (fcpStatus === 'good') {
      expect(fcpClasses).toContain('text-green');
    } else if (fcpStatus === 'needs-improvement') {
      expect(fcpClasses).toContain('text-orange');
    } else {
      expect(fcpClasses).toContain('text-red');
    }

    // Check other metrics have status indicators
    const allMetrics = metricsContainer.locator('[data-testid^="metric-"]');
    const count = await allMetrics.count();

    for (let i = 0; i < count; i++) {
      const metric = allMetrics.nth(i);
      const status = await metric.getAttribute('data-status');
      expect(status).toMatch(/^(good|needs-improvement|poor)$/);
    }
  });

  test('should display performance score and categorization', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Should show overall performance score
    const overallScore = metricsContainer.locator('[data-testid="overall-score"]');
    await expect(overallScore).toBeVisible();

    const scoreValue = await overallScore.locator('[data-testid="score-value"]').textContent();
    expect(scoreValue).toMatch(/^\d{1,3}$/); // Score 0-100

    // Should show performance category
    const category = metricsContainer.locator('[data-testid="performance-category"]');
    await expect(category).toBeVisible();

    const categoryText = await category.textContent();
    expect(categoryText).toMatch(/^(Critical|High|Medium|Low)$/);

    // Should show category explanation
    const categoryDetails = metricsContainer.locator('[data-testid="category-details"]');
    await expect(categoryDetails).toBeVisible();
    await expect(categoryDetails).not.toBeEmpty();
  });

  test('should show detailed metric tooltips on hover', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');
    const fcpMetric = metricsContainer.locator('[data-testid="metric-fcp"]');

    // Hover over FCP metric
    await fcpMetric.hover();

    // Should show detailed tooltip
    const tooltip = page.locator('[data-testid="metric-tooltip"]');
    await expect(tooltip).toBeVisible();

    // Tooltip should contain threshold information
    await expect(tooltip).toContainText('Good');
    await expect(tooltip).toContainText('Needs Improvement');
    await expect(tooltip).toContainText('Poor');

    // Should show current value context
    await expect(tooltip).toContainText('Current');

    // Should have description
    await expect(tooltip).toContainText('measures how long it takes');
  });

  test('should display performance trends when available', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Look for trend indicators
    const trendIndicators = metricsContainer.locator('[data-testid="trend-indicator"]');

    if (await trendIndicators.count() > 0) {
      const firstTrend = trendIndicators.first();
      await expect(firstTrend).toBeVisible();

      // Should show trend direction
      const trendDirection = await firstTrend.getAttribute('data-trend');
      expect(trendDirection).toMatch(/^(improving|degrading|stable)$/);

      // Should have appropriate icon
      const trendIcon = firstTrend.locator('[data-testid="trend-icon"]');
      await expect(trendIcon).toBeVisible();
    }
  });

  test('should show performance recommendations', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Look for recommendations section
    const recommendations = metricsContainer.locator('[data-testid="performance-recommendations"]');

    if (await recommendations.isVisible()) {
      // Should have recommendation items
      const recommendationItems = recommendations.locator('[data-testid="recommendation-item"]');
      await expect(recommendationItems.first()).toBeVisible();

      const firstRecommendation = recommendationItems.first();

      // Should show impact level
      const impact = firstRecommendation.locator('[data-testid="recommendation-impact"]');
      await expect(impact).toBeVisible();

      const impactText = await impact.textContent();
      expect(impactText).toMatch(/^(High|Medium|Low)$/);

      // Should show description
      const description = firstRecommendation.locator('[data-testid="recommendation-description"]');
      await expect(description).toBeVisible();
      await expect(description).not.toBeEmpty();

      // Should show estimated savings
      const savings = firstRecommendation.locator('[data-testid="estimated-savings"]');
      await expect(savings).toBeVisible();
    }
  });

  test('should display resource timing breakdown', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Look for resource timing section
    const resourceTiming = metricsContainer.locator('[data-testid="resource-timing"]');

    if (await resourceTiming.isVisible()) {
      // Should have resource categories
      const scripts = resourceTiming.locator('[data-testid="resource-scripts"]');
      const stylesheets = resourceTiming.locator('[data-testid="resource-stylesheets"]');
      const images = resourceTiming.locator('[data-testid="resource-images"]');

      if (await scripts.isVisible()) {
        // Should show script metrics
        await expect(scripts.locator('[data-testid="resource-count"]')).toBeVisible();
        await expect(scripts.locator('[data-testid="resource-duration"]')).toBeVisible();
        await expect(scripts.locator('[data-testid="resource-size"]')).toBeVisible();
      }

      if (await stylesheets.isVisible()) {
        await expect(stylesheets.locator('[data-testid="resource-count"]')).toBeVisible();
        await expect(stylesheets.locator('[data-testid="resource-duration"]')).toBeVisible();
      }
    }
  });

  test('should show memory usage information', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Look for memory usage section
    const memorySection = metricsContainer.locator('[data-testid="memory-usage"]');

    if (await memorySection.isVisible()) {
      // Should show heap size information
      const usedHeap = memorySection.locator('[data-testid="used-heap-size"]');
      const totalHeap = memorySection.locator('[data-testid="total-heap-size"]');
      const heapLimit = memorySection.locator('[data-testid="heap-limit"]');

      await expect(usedHeap).toBeVisible();
      await expect(totalHeap).toBeVisible();
      await expect(heapLimit).toBeVisible();

      // Should show usage percentage
      const usagePercentage = memorySection.locator('[data-testid="memory-usage-percentage"]');
      await expect(usagePercentage).toBeVisible();

      const percentage = await usagePercentage.textContent();
      expect(percentage).toMatch(/^\d{1,3}%$/);
    }
  });

  test('should allow toggling between different metric views', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Should have view toggle buttons
    const viewToggle = metricsContainer.locator('[data-testid="metrics-view-toggle"]');

    if (await viewToggle.isVisible()) {
      const summaryView = viewToggle.locator('[data-testid="view-summary"]');
      const detailedView = viewToggle.locator('[data-testid="view-detailed"]');
      const chartView = viewToggle.locator('[data-testid="view-chart"]');

      // Test switching to detailed view
      if (await detailedView.isVisible()) {
        await detailedView.click();

        // Should show more detailed metrics
        const detailedMetrics = metricsContainer.locator('[data-testid="detailed-metrics"]');
        await expect(detailedMetrics).toBeVisible();
      }

      // Test switching to chart view
      if (await chartView.isVisible()) {
        await chartView.click();

        // Should show performance chart
        const performanceChart = metricsContainer.locator('[data-testid="performance-chart"]');
        await expect(performanceChart).toBeVisible();
      }
    }
  });

  test('should export performance data', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Should have export button
    const exportButton = metricsContainer.locator('[data-testid="export-performance"]');

    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Should show export modal
      const exportModal = page.locator('[data-testid="export-modal"]');
      await expect(exportModal).toBeVisible();

      // Should have format options
      const formatSelect = exportModal.locator('[data-testid="export-format"]');
      await expect(formatSelect).toBeVisible();

      // Test JSON export
      await formatSelect.selectOption('json');

      const confirmButton = exportModal.locator('[data-testid="confirm-export"]');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await confirmButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/performance.*\.json$/);
    }
  });

  test('should handle missing metrics gracefully', async ({ page }) => {
    // Navigate to report with incomplete metrics
    await page.goto(`/dashboard/projects/${projectId}/reports/report-partial-metrics`);
    await page.waitForLoadState('networkidle');

    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Should still show container
    await expect(metricsContainer).toBeVisible();

    // Missing metrics should show placeholder or N/A
    const metrics = metricsContainer.locator('[data-testid^="metric-"]');
    const count = await metrics.count();

    for (let i = 0; i < count; i++) {
      const metric = metrics.nth(i);
      const value = metric.locator('[data-testid="metric-value"]');

      const valueText = await value.textContent();
      // Should either show a number or N/A for missing metrics
      expect(valueText).toMatch(/^(\d+(\.\d+)?(ms|s)?|N\/A|—)$/);
    }
  });

  test('should show performance comparison when historical data available', async ({ page }) => {
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Look for comparison section
    const comparison = metricsContainer.locator('[data-testid="performance-comparison"]');

    if (await comparison.isVisible()) {
      // Should show previous values
      const previousValues = comparison.locator('[data-testid="previous-values"]');
      await expect(previousValues).toBeVisible();

      // Should show change indicators
      const changeIndicators = comparison.locator('[data-testid="change-indicator"]');
      if (await changeIndicators.count() > 0) {
        const firstChange = changeIndicators.first();
        const changeValue = await firstChange.textContent();
        expect(changeValue).toMatch(/^[+-]\d+(\.\d+)?(ms|s|%)?$/);
      }
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);

    const metricsContainer = page.locator('[data-testid="performance-metrics"]');
    await expect(metricsContainer).toBeVisible();

    // Metrics should stack vertically on mobile
    const metrics = metricsContainer.locator('[data-testid^="metric-"]');
    const firstMetric = metrics.first();
    const secondMetric = metrics.nth(1);

    if (await secondMetric.isVisible()) {
      const firstBox = await firstMetric.boundingBox();
      const secondBox = await secondMetric.boundingBox();

      // Second metric should be below first (stacked)
      expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 10);
    }

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);

    // Should adapt layout for tablet
    await expect(metricsContainer).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);

    // Should show full desktop layout
    await expect(metricsContainer).toBeVisible();
  });

  test('should show loading state during data fetch', async ({ page }) => {
    // Intercept API call to simulate slow loading
    await page.route('**/api/projects/*/reports/*/performance', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto(`/dashboard/projects/${projectId}/reports/${reportId}`);

    // Should show loading spinner
    const loadingSpinner = page.locator('[data-testid="metrics-loading"]');
    await expect(loadingSpinner).toBeVisible();

    // Should show loading message
    await expect(loadingSpinner).toContainText('Loading performance metrics');

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Loading should disappear
    await expect(loadingSpinner).not.toBeVisible();

    // Metrics should be visible
    const metricsContainer = page.locator('[data-testid="performance-metrics"]');
    await expect(metricsContainer).toBeVisible();
  });

  test('should handle reports without performance data', async ({ page }) => {
    // Navigate to report without performance metrics
    await page.goto(`/dashboard/projects/${projectId}/reports/report-no-performance`);
    await page.waitForLoadState('networkidle');

    const metricsContainer = page.locator('[data-testid="performance-metrics"]');

    // Should show empty state
    const emptyState = metricsContainer.locator('[data-testid="empty-performance-state"]');
    await expect(emptyState).toBeVisible();

    // Should have helpful message
    await expect(emptyState).toContainText('No performance metrics available');
    await expect(emptyState).toContainText('performance monitoring');
  });
});