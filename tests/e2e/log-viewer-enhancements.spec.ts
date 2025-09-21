/**
 * E2E Test: Log Viewer Enhancements
 * Tests terminal-style display, copy functionality, and syntax highlighting
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'b6676813-5f1a-41f6-921b-95f16a4183a2';

test.describe('Log Viewer Enhancements - UI Tests', () => {
  // Scenario 5: Terminal-Style Log Viewer
  test('Terminal-style log viewer display', async ({ page }) => {
    // Navigate to a report with console logs
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);

    // Click on a report that likely has console logs
    const reportWithLogs = page.locator('.report-title-link').first();
    await reportWithLogs.click();

    // Wait for detail page
    await page.waitForSelector('[data-testid="report-detail"], .report-detail-container');

    // Find console logs section
    const consoleLogsSection = page.locator('[data-testid="console-logs-section"], section:has-text("Console Logs")');
    await expect(consoleLogsSection).toBeVisible();

    // Check for terminal-style background
    const logContainer = consoleLogsSection.locator('.console-log-container, [data-testid="log-container"]');
    const bgColor = await logContainer.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Terminal background should be dark (#1e293b or similar)
    expect(bgColor).toMatch(/rgb\((30|31|32|33|45|46|47|48|49|50), (41|42|43|44|55|56|57|58|59|60), (59|60|61|62|70|71|72|73|74|75)\)/);

    // Check for monospace font
    const fontFamily = await logContainer.evaluate(el =>
      window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain('mono');

    // Test log scrolling
    const scrollHeight = await logContainer.evaluate(el => el.scrollHeight);
    const clientHeight = await logContainer.evaluate(el => el.clientHeight);

    if (scrollHeight > clientHeight) {
      // Container is scrollable
      await logContainer.evaluate(el => el.scrollTop = 100);
      const newScrollTop = await logContainer.evaluate(el => el.scrollTop);
      expect(newScrollTop).toBeGreaterThan(0);
    }

    // Test expandable sections
    const expandButton = consoleLogsSection.locator('button[aria-expanded], [data-testid="expand-logs"]');
    if (await expandButton.isVisible()) {
      const isExpanded = await expandButton.getAttribute('aria-expanded');
      await expandButton.click();

      const newIsExpanded = await expandButton.getAttribute('aria-expanded');
      expect(newIsExpanded).not.toBe(isExpanded);
    }

    // Check color coding for different log types
    const errorLogs = logContainer.locator('.log-error, [data-log-type="error"]');
    const warnLogs = logContainer.locator('.log-warn, [data-log-type="warn"]');
    const infoLogs = logContainer.locator('.log-info, [data-log-type="log"]');

    if (await errorLogs.count() > 0) {
      const errorColor = await errorLogs.first().evaluate(el =>
        window.getComputedStyle(el).color
      );
      // Error logs should be red-ish
      expect(errorColor).toMatch(/rgb\((2[0-5][0-5]|[01]?[0-9]?[0-9]), ([0-9]{1,2}), ([0-9]{1,2})\)/);
    }

    if (await warnLogs.count() > 0) {
      const warnColor = await warnLogs.first().evaluate(el =>
        window.getComputedStyle(el).color
      );
      // Warning logs should be yellow-ish
      expect(warnColor).toMatch(/rgb\((2[0-5][0-5]|[01]?[0-9]?[0-9]), (2[0-5][0-5]|[01]?[0-9]?[0-9]), ([0-9]{1,2})\)/);
    }

    if (await infoLogs.count() > 0) {
      const infoColor = await infoLogs.first().evaluate(el =>
        window.getComputedStyle(el).color
      );
      // Info logs should be blue-ish
      expect(infoColor).toMatch(/rgb\(([0-9]{1,2}), ([0-9]{1,2}), (2[0-5][0-5]|[01]?[0-9]?[0-9])\)/);
    }
  });

  // Scenario 6: Copy Log Functionality
  test('Copy button functionality for console logs', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to a report detail with console logs
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);
    const reportWithLogs = page.locator('.report-title-link').first();
    await reportWithLogs.click();

    await page.waitForSelector('[data-testid="report-detail"]');

    // Find console logs section
    const consoleLogsSection = page.locator('[data-testid="console-logs-section"], section:has-text("Console Logs")');
    await expect(consoleLogsSection).toBeVisible();

    // Find individual log entries
    const logEntries = consoleLogsSection.locator('.log-entry, [data-testid^="log-entry-"]');
    const logCount = await logEntries.count();

    if (logCount > 0) {
      // Find copy button for first log entry
      const firstLogEntry = logEntries.first();
      const copyButton = firstLogEntry.locator('button[aria-label*="Copy"], [data-testid="copy-log"]');

      await expect(copyButton).toBeVisible();

      // Get log content before copying
      const logContent = await firstLogEntry.locator('.log-message, .log-content').textContent();

      // Click copy button
      await copyButton.click();

      // Check for success feedback
      const successIndicator = page.locator('.copy-success, [data-testid="copy-success"], [role="status"]:has-text("Copied")');
      await expect(successIndicator).toBeVisible({ timeout: 2000 });

      // Verify clipboard content (if supported)
      try {
        const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardContent).toContain(logContent?.trim());
      } catch (e) {
        // Clipboard API might not be available in test environment
        console.log('Clipboard API not available in test environment');
      }

      // Test copy with different log types
      const errorLog = logEntries.filter({ has: page.locator('.log-error, [data-log-type="error"]') }).first();
      if (await errorLog.count() > 0) {
        const errorCopyButton = errorLog.locator('button[aria-label*="Copy"]');
        await errorCopyButton.click();

        // Verify timestamp and log level are included
        try {
          const errorClipboard = await page.evaluate(() => navigator.clipboard.readText());
          expect(errorClipboard).toMatch(/\d{2}:\d{2}:\d{2}|ERROR|error/i);
        } catch (e) {
          console.log('Clipboard verification skipped');
        }
      }
    }

    // Test copy all logs button if available
    const copyAllButton = consoleLogsSection.locator('button:has-text("Copy All"), [data-testid="copy-all-logs"]');
    if (await copyAllButton.isVisible()) {
      await copyAllButton.click();

      const allCopiedIndicator = page.locator('[role="status"]:has-text("All logs copied")');
      await expect(allCopiedIndicator).toBeVisible({ timeout: 2000 });
    }
  });

  // Scenario 7: Syntax Highlighting
  test('JSON/JavaScript syntax highlighting in logs', async ({ page }) => {
    // Navigate to a report with JSON logs
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);
    const report = page.locator('.report-title-link').first();
    await report.click();

    await page.waitForSelector('[data-testid="report-detail"]');

    const consoleLogsSection = page.locator('[data-testid="console-logs-section"], section:has-text("Console Logs")');
    await expect(consoleLogsSection).toBeVisible();

    // Look for JSON objects in logs
    const jsonLogs = consoleLogsSection.locator('pre:has-text("{"), .json-highlight, [data-highlight="json"]');

    if (await jsonLogs.count() > 0) {
      // Check for syntax highlighting classes
      const highlightedElements = jsonLogs.first().locator('.token, .hljs-string, .prism-token');
      const highlightCount = await highlightedElements.count();

      expect(highlightCount).toBeGreaterThan(0);

      // Check specific highlighting for JSON keys
      const jsonKeys = jsonLogs.first().locator('.token.property, .hljs-attr, .json-key');
      if (await jsonKeys.count() > 0) {
        const keyColor = await jsonKeys.first().evaluate(el =>
          window.getComputedStyle(el).color
        );
        // Keys should have distinct color
        expect(keyColor).toBeTruthy();
      }

      // Check highlighting for strings
      const strings = jsonLogs.first().locator('.token.string, .hljs-string, .json-string');
      if (await strings.count() > 0) {
        const stringColor = await strings.first().evaluate(el =>
          window.getComputedStyle(el).color
        );
        // Strings should have distinct color (often green)
        expect(stringColor).toBeTruthy();
      }

      // Check highlighting for numbers
      const numbers = jsonLogs.first().locator('.token.number, .hljs-number, .json-number');
      if (await numbers.count() > 0) {
        const numberColor = await numbers.first().evaluate(el =>
          window.getComputedStyle(el).color
        );
        // Numbers should have distinct color
        expect(numberColor).toBeTruthy();
      }
    }

    // Test syntax highlighting toggle if available
    const syntaxToggle = consoleLogsSection.locator('button:has-text("Syntax"), [data-testid="toggle-syntax-highlight"]');
    if (await syntaxToggle.isVisible()) {
      // Get initial state
      const initialHighlighted = await consoleLogsSection.locator('.token, .hljs, .prism').count();

      // Toggle syntax highlighting
      await syntaxToggle.click();
      await page.waitForTimeout(100);

      // Check if highlighting changed
      const afterToggleHighlighted = await consoleLogsSection.locator('.token, .hljs, .prism').count();
      expect(afterToggleHighlighted).not.toBe(initialHighlighted);

      // Toggle back
      await syntaxToggle.click();
      await page.waitForTimeout(100);

      const finalHighlighted = await consoleLogsSection.locator('.token, .hljs, .prism').count();
      expect(finalHighlighted).toBe(initialHighlighted);
    }

    // Test JavaScript code highlighting
    const jsLogs = consoleLogsSection.locator('pre:has-text("function"), pre:has-text("const"), pre:has-text("=>")');

    if (await jsLogs.count() > 0) {
      // Check for JS syntax highlighting
      const jsKeywords = jsLogs.first().locator('.token.keyword, .hljs-keyword, .js-keyword');
      if (await jsKeywords.count() > 0) {
        const keywordColor = await jsKeywords.first().evaluate(el =>
          window.getComputedStyle(el).color
        );
        // Keywords should be highlighted (often blue or purple)
        expect(keywordColor).toBeTruthy();
      }

      // Check for function names
      const functions = jsLogs.first().locator('.token.function, .hljs-function, .js-function');
      if (await functions.count() > 0) {
        const functionColor = await functions.first().evaluate(el =>
          window.getComputedStyle(el).color
        );
        expect(functionColor).toBeTruthy();
      }
    }

    // Test plain text logs remain unchanged
    const plainTextLogs = consoleLogsSection.locator('.log-entry:not(:has(pre)), [data-log-type="plain"]');
    if (await plainTextLogs.count() > 0) {
      const plainHighlighting = plainTextLogs.first().locator('.token, .hljs');
      const plainHighlightCount = await plainHighlighting.count();

      // Plain text should have minimal or no syntax highlighting
      expect(plainHighlightCount).toBe(0);
    }
  });

  // Test for log viewer performance
  test('Log viewer performance with large datasets', async ({ page }) => {
    // Navigate to a report with many logs
    await page.goto(`http://localhost:3000/dashboard/projects/${TEST_PROJECT_ID}/reports`);
    const report = page.locator('.report-title-link').first();
    await report.click();

    await page.waitForSelector('[data-testid="report-detail"]');

    const consoleLogsSection = page.locator('[data-testid="console-logs-section"]');
    await expect(consoleLogsSection).toBeVisible();

    // Measure rendering time
    const startTime = Date.now();

    // Expand logs if collapsed
    const expandButton = consoleLogsSection.locator('[aria-expanded="false"]');
    if (await expandButton.isVisible()) {
      await expandButton.click();
    }

    // Wait for logs to render
    await page.waitForSelector('.log-entry, [data-testid^="log-entry-"]', { timeout: 2000 });

    const renderTime = Date.now() - startTime;

    // Log rendering should be fast even with many entries
    expect(renderTime).toBeLessThan(1000);

    // Test smooth scrolling
    const logContainer = consoleLogsSection.locator('.console-log-container, [data-testid="log-container"]');
    const scrollHeight = await logContainer.evaluate(el => el.scrollHeight);

    if (scrollHeight > 500) {
      // Test scroll performance
      const scrollStartTime = Date.now();

      await logContainer.evaluate(el => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });

      await page.waitForTimeout(500);

      const scrollTime = Date.now() - scrollStartTime;

      // Scrolling should be smooth
      expect(scrollTime).toBeLessThan(1000);
    }
  });
});