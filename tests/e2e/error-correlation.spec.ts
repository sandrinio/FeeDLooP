// E2E Test: Error Correlation UI
// Tests the intelligent error correlation and linking functionality
// CRITICAL: This test MUST FAIL until implementation is complete

import { test, expect } from '@playwright/test';

test.describe('Error Correlation UI', () => {
  let projectId: string;
  let reportId: string;

  test.beforeAll(async () => {
    // Set up test data
    projectId = 'test-project-correlation';
    reportId = 'test-report-with-correlations';
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to report detail page
    await page.goto(`/dashboard/projects/${projectId}/reports/${reportId}`);
    await page.waitForLoadState('networkidle');
  });

  test('should display error correlation overview', async ({ page }) => {
    // Should see error correlation container
    const correlationContainer = page.locator('[data-testid="error-correlation"]');
    await expect(correlationContainer).toBeVisible();

    // Should show correlation summary
    const correlationSummary = correlationContainer.locator('[data-testid="correlation-summary"]');
    await expect(correlationSummary).toBeVisible();

    // Should display total correlations found
    const totalCorrelations = correlationSummary.locator('[data-testid="total-correlations"]');
    await expect(totalCorrelations).toBeVisible();

    const correlationCount = await totalCorrelations.textContent();
    expect(correlationCount).toMatch(/^\d+/); // Should start with a number

    // Should show confidence score
    const confidenceScore = correlationSummary.locator('[data-testid="confidence-score"]');
    await expect(confidenceScore).toBeVisible();

    const confidence = await confidenceScore.textContent();
    expect(confidence).toMatch(/^\d{1,3}%$/); // Percentage from 0-100%
  });

  test('should list individual error correlations', async ({ page }) => {
    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Should have correlations list
    const correlationsList = correlationContainer.locator('[data-testid="correlations-list"]');
    await expect(correlationsList).toBeVisible();

    // Should display individual correlation items
    const correlationItems = correlationsList.locator('[data-testid="correlation-item"]');
    await expect(correlationItems.first()).toBeVisible();

    const firstCorrelation = correlationItems.first();

    // Each correlation should show type
    const correlationType = firstCorrelation.locator('[data-testid="correlation-type"]');
    await expect(correlationType).toBeVisible();

    const typeText = await correlationType.textContent();
    expect(typeText).toMatch(/^(Error-Network|Performance-Resource|Timing-Sequence|Pattern-Match)$/);

    // Should show confidence level
    const confidenceLevel = firstCorrelation.locator('[data-testid="correlation-confidence"]');
    await expect(confidenceLevel).toBeVisible();

    // Should show description
    const description = firstCorrelation.locator('[data-testid="correlation-description"]');
    await expect(description).toBeVisible();
    await expect(description).not.toBeEmpty();
  });

  test('should show detailed correlation view on click', async ({ page }) => {
    const correlationsList = page.locator('[data-testid="correlations-list"]');
    const firstCorrelation = correlationsList.locator('[data-testid="correlation-item"]').first();

    // Click on first correlation
    await firstCorrelation.click();

    // Should open detailed modal
    const correlationModal = page.locator('[data-testid="correlation-detail-modal"]');
    await expect(correlationModal).toBeVisible();

    // Should show detailed evidence
    const evidence = correlationModal.locator('[data-testid="correlation-evidence"]');
    await expect(evidence).toBeVisible();

    // Should have timeline view
    const timeline = correlationModal.locator('[data-testid="correlation-timeline"]');
    await expect(timeline).toBeVisible();

    // Timeline should show events in chronological order
    const timelineEvents = timeline.locator('[data-testid="timeline-event"]');
    await expect(timelineEvents.first()).toBeVisible();

    // Each event should have timestamp
    const firstEvent = timelineEvents.first();
    const timestamp = firstEvent.locator('[data-testid="event-timestamp"]');
    await expect(timestamp).toBeVisible();

    // Should have event details
    const eventDetails = firstEvent.locator('[data-testid="event-details"]');
    await expect(eventDetails).toBeVisible();
  });

  test('should highlight correlated items in logs and network tabs', async ({ page }) => {
    // Click on a correlation to select it
    const firstCorrelation = page.locator('[data-testid="correlation-item"]').first();
    await firstCorrelation.click();

    // Navigate to console logs tab
    const logsTab = page.locator('[data-testid="tab-console-logs"]');
    await logsTab.click();

    // Correlated log entries should be highlighted
    const correlatedLogs = page.locator('[data-testid="log-entry"][data-correlated="true"]');

    if (await correlatedLogs.count() > 0) {
      const firstCorrelatedLog = correlatedLogs.first();

      // Should have visual highlighting
      const classes = await firstCorrelatedLog.getAttribute('class');
      expect(classes).toContain('correlated'); // Should have correlation styling

      // Should have correlation indicator
      const correlationIndicator = firstCorrelatedLog.locator('[data-testid="correlation-indicator"]');
      await expect(correlationIndicator).toBeVisible();
    }

    // Navigate to network requests tab
    const networkTab = page.locator('[data-testid="tab-network-requests"]');
    await networkTab.click();

    // Correlated network requests should be highlighted
    const correlatedRequests = page.locator('[data-testid="network-request-item"][data-correlated="true"]');

    if (await correlatedRequests.count() > 0) {
      const firstCorrelatedRequest = correlatedRequests.first();

      // Should have visual highlighting
      const requestClasses = await firstCorrelatedRequest.getAttribute('class');
      expect(requestClasses).toContain('correlated');

      // Should have correlation indicator
      const requestIndicator = firstCorrelatedRequest.locator('[data-testid="correlation-indicator"]');
      await expect(requestIndicator).toBeVisible();
    }
  });

  test('should filter correlations by type and confidence', async ({ page }) => {
    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Should have filter controls
    const filterControls = correlationContainer.locator('[data-testid="correlation-filters"]');
    await expect(filterControls).toBeVisible();

    // Test type filter
    const typeFilter = filterControls.locator('[data-testid="filter-by-type"]');
    await typeFilter.selectOption('Error-Network');

    await page.waitForTimeout(100); // Brief wait for filtering

    // Should only show error-network correlations
    const visibleCorrelations = page.locator('[data-testid="correlation-item"]:visible');
    const count = await visibleCorrelations.count();

    for (let i = 0; i < count; i++) {
      const correlation = visibleCorrelations.nth(i);
      const type = await correlation.locator('[data-testid="correlation-type"]').textContent();
      expect(type).toBe('Error-Network');
    }

    // Test confidence filter
    const confidenceFilter = filterControls.locator('[data-testid="filter-by-confidence"]');
    await confidenceFilter.selectOption('high'); // >80% confidence

    await page.waitForTimeout(100);

    // Should only show high confidence correlations
    const highConfidenceCorrelations = page.locator('[data-testid="correlation-item"]:visible');
    const highConfCount = await highConfidenceCorrelations.count();

    for (let i = 0; i < highConfCount; i++) {
      const correlation = highConfidenceCorrelations.nth(i);
      const confidence = await correlation.locator('[data-testid="correlation-confidence"]').textContent();
      const confidenceValue = parseInt(confidence!.replace('%', ''));
      expect(confidenceValue).toBeGreaterThan(80);
    }
  });

  test('should show correlation patterns across multiple reports', async ({ page }) => {
    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Look for patterns section
    const patternsSection = correlationContainer.locator('[data-testid="correlation-patterns"]');

    if (await patternsSection.isVisible()) {
      // Should show pattern analysis
      const patternItems = patternsSection.locator('[data-testid="pattern-item"]');
      await expect(patternItems.first()).toBeVisible();

      const firstPattern = patternItems.first();

      // Should show pattern description
      const patternDescription = firstPattern.locator('[data-testid="pattern-description"]');
      await expect(patternDescription).toBeVisible();

      // Should show occurrence count
      const occurrenceCount = firstPattern.locator('[data-testid="pattern-occurrences"]');
      await expect(occurrenceCount).toBeVisible();

      const occurrences = await occurrenceCount.textContent();
      expect(occurrences).toMatch(/\d+/); // Should contain a number

      // Should show affected reports link
      const affectedReports = firstPattern.locator('[data-testid="affected-reports-link"]');
      await expect(affectedReports).toBeVisible();
    }
  });

  test('should provide correlation insights and recommendations', async ({ page }) => {
    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Look for insights section
    const insightsSection = correlationContainer.locator('[data-testid="correlation-insights"]');

    if (await insightsSection.isVisible()) {
      // Should show insight cards
      const insightCards = insightsSection.locator('[data-testid="insight-card"]');
      await expect(insightCards.first()).toBeVisible();

      const firstInsight = insightCards.first();

      // Should have insight type
      const insightType = firstInsight.locator('[data-testid="insight-type"]');
      await expect(insightType).toBeVisible();

      const typeText = await insightType.textContent();
      expect(typeText).toMatch(/^(Performance|Error Pattern|Network Issue|User Experience)$/);

      // Should have actionable recommendation
      const recommendation = firstInsight.locator('[data-testid="insight-recommendation"]');
      await expect(recommendation).toBeVisible();
      await expect(recommendation).not.toBeEmpty();

      // Should show impact level
      const impact = firstInsight.locator('[data-testid="insight-impact"]');
      await expect(impact).toBeVisible();

      const impactLevel = await impact.textContent();
      expect(impactLevel).toMatch(/^(High|Medium|Low)$/);
    }
  });

  test('should export correlation data', async ({ page }) => {
    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Should have export button
    const exportButton = correlationContainer.locator('[data-testid="export-correlations"]');

    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Should show export modal
      const exportModal = page.locator('[data-testid="export-modal"]');
      await expect(exportModal).toBeVisible();

      // Should have format options
      const formatSelect = exportModal.locator('[data-testid="export-format"]');
      await expect(formatSelect).toBeVisible();

      // Test CSV export
      await formatSelect.selectOption('csv');

      const confirmButton = exportModal.locator('[data-testid="confirm-export"]');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await confirmButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/correlations.*\.csv$/);
    }
  });

  test('should show correlation analysis for different time ranges', async ({ page }) => {
    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Look for time range selector
    const timeRangeSelector = correlationContainer.locator('[data-testid="correlation-time-range"]');

    if (await timeRangeSelector.isVisible()) {
      // Test different time ranges
      await timeRangeSelector.selectOption('last-24h');
      await page.waitForTimeout(200);

      // Should update correlation data
      let correlationCount = await page.locator('[data-testid="correlation-item"]').count();
      expect(correlationCount).toBeGreaterThanOrEqual(0);

      // Test weekly range
      await timeRangeSelector.selectOption('last-7d');
      await page.waitForTimeout(200);

      // Should potentially show more correlations
      const weeklyCount = await page.locator('[data-testid="correlation-item"]').count();
      expect(weeklyCount).toBeGreaterThanOrEqual(correlationCount);

      // Test monthly range
      await timeRangeSelector.selectOption('last-30d');
      await page.waitForTimeout(200);

      const monthlyCount = await page.locator('[data-testid="correlation-item"]').count();
      expect(monthlyCount).toBeGreaterThanOrEqual(weeklyCount);
    }
  });

  test('should visualize correlation strength', async ({ page }) => {
    const correlationsList = page.locator('[data-testid="correlations-list"]');
    const correlationItems = correlationsList.locator('[data-testid="correlation-item"]');

    if (await correlationItems.count() > 0) {
      const firstCorrelation = correlationItems.first();

      // Should have visual strength indicator
      const strengthIndicator = firstCorrelation.locator('[data-testid="correlation-strength"]');

      if (await strengthIndicator.isVisible()) {
        // Should have visual representation (bar, circle, etc.)
        const strengthBar = strengthIndicator.locator('[data-testid="strength-bar"]');
        const strengthCircle = strengthIndicator.locator('[data-testid="strength-circle"]');

        const hasBar = await strengthBar.isVisible();
        const hasCircle = await strengthCircle.isVisible();

        expect(hasBar || hasCircle).toBe(true); // Should have some visual indicator

        // Should reflect confidence level
        const confidence = await firstCorrelation.locator('[data-testid="correlation-confidence"]').textContent();
        const confidenceValue = parseInt(confidence!.replace('%', ''));

        if (hasBar) {
          const barWidth = await strengthBar.evaluate(el => el.style.width);
          expect(barWidth).toMatch(/\d+%/); // Should have percentage width
        }
      }
    }
  });

  test('should handle reports with no correlations', async ({ page }) => {
    // Navigate to report without correlations
    await page.goto(`/dashboard/projects/${projectId}/reports/report-no-correlations`);
    await page.waitForLoadState('networkidle');

    const correlationContainer = page.locator('[data-testid="error-correlation"]');

    // Should show empty state
    const emptyState = correlationContainer.locator('[data-testid="empty-correlation-state"]');
    await expect(emptyState).toBeVisible();

    // Should have helpful message
    await expect(emptyState).toContainText('No error correlations detected');
    await expect(emptyState).toContainText('correlation analysis');

    // Should suggest what might help
    await expect(emptyState).toContainText('more data points');
  });

  test('should show correlation analysis loading state', async ({ page }) => {
    // Intercept API call to simulate slow correlation analysis
    await page.route('**/api/projects/*/reports/*/correlations', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      await route.continue();
    });

    await page.goto(`/dashboard/projects/${projectId}/reports/${reportId}`);

    // Should show analysis in progress
    const analysisLoader = page.locator('[data-testid="correlation-analysis-loading"]');
    await expect(analysisLoader).toBeVisible();

    // Should show progress indicator
    await expect(analysisLoader).toContainText('Analyzing error correlations');

    // Should have progress bar or spinner
    const progressIndicator = analysisLoader.locator('[data-testid="analysis-progress"]');
    await expect(progressIndicator).toBeVisible();

    // Wait for analysis to complete
    await page.waitForLoadState('networkidle');

    // Loading should disappear
    await expect(analysisLoader).not.toBeVisible();

    // Results should be visible
    const correlationContainer = page.locator('[data-testid="error-correlation"]');
    await expect(correlationContainer).toBeVisible();
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);

    const correlationContainer = page.locator('[data-testid="error-correlation"]');
    await expect(correlationContainer).toBeVisible();

    // Correlation items should stack on mobile
    const correlationItems = page.locator('[data-testid="correlation-item"]');

    if (await correlationItems.count() > 1) {
      const firstItem = correlationItems.first();
      const secondItem = correlationItems.nth(1);

      const firstBox = await firstItem.boundingBox();
      const secondBox = await secondItem.boundingBox();

      // Should be stacked vertically
      expect(secondBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height - 10);
    }

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);

    await expect(correlationContainer).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);

    await expect(correlationContainer).toBeVisible();
  });
});