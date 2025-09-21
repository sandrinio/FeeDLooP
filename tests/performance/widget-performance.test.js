/**
 * Widget Performance Tests
 * T093: Performance testing for widget load time (<500ms)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Performance test configuration
const PERFORMANCE_CONFIG = {
  WIDGET_LOAD_TIME_THRESHOLD: 500, // milliseconds
  WIDGET_RENDER_TIME_THRESHOLD: 200, // milliseconds
  NETWORK_THROTTLING: {
    offline: false,
    downloadThroughput: 1500000, // 1.5 Mbps in bytes/second
    uploadThroughput: 750000, // 750 Kbps in bytes/second
    latency: 40 // 40ms
  },
  TEST_URL: 'http://localhost:3001'
};

describe('Widget Performance Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();

    // Enable performance monitoring
    await page.coverage.startCSSCoverage();
    await page.coverage.startJSCoverage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Widget script should load within 500ms', async () => {
    const startTime = Date.now();

    // Create test HTML page with widget
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Widget Performance Test</title>
      </head>
      <body>
        <h1>Widget Performance Test</h1>
        <div id="widget-container"></div>

        <script>
          // Measure script load time
          const scriptLoadStart = performance.now();

          // Load widget script
          (function() {
            const script = document.createElement('script');
            script.src = '${PERFORMANCE_CONFIG.TEST_URL}/widget/feedloop-widget.js';
            script.async = true;
            script.onload = function() {
              const scriptLoadEnd = performance.now();
              window.widgetLoadTime = scriptLoadEnd - scriptLoadStart;
              console.log('Widget script loaded in:', window.widgetLoadTime, 'ms');
            };
            document.head.appendChild(script);
          })();
        </script>
      </body>
      </html>
    `;

    // Set page content and wait for widget to load
    await page.setContent(testHTML);

    // Wait for widget script to load
    await page.waitForFunction(() => window.widgetLoadTime !== undefined, { timeout: 5000 });

    // Get load time
    const loadTime = await page.evaluate(() => window.widgetLoadTime);

    console.log(`Widget script load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_CONFIG.WIDGET_LOAD_TIME_THRESHOLD);
  });

  test('Widget initialization should be fast', async () => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Widget Initialization Test</title>
      </head>
      <body>
        <div id="feedloop-widget"></div>

        <script>
          // Measure initialization time
          window.initStartTime = performance.now();
        </script>
        <script src="${PERFORMANCE_CONFIG.TEST_URL}/widget/feedloop-widget.js"></script>
        <script>
          // Initialize widget
          if (window.FeedLoop) {
            const initStart = performance.now();

            FeedLoop.init({
              projectKey: 'test-project-key-12345678',
              position: 'bottom-right',
              theme: 'light'
            });

            const initEnd = performance.now();
            window.widgetInitTime = initEnd - initStart;
            console.log('Widget initialization time:', window.widgetInitTime, 'ms');
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);

    // Wait for widget to initialize
    await page.waitForFunction(() => window.widgetInitTime !== undefined, { timeout: 5000 });

    const initTime = await page.evaluate(() => window.widgetInitTime);

    console.log(`Widget initialization time: ${initTime}ms`);
    expect(initTime).toBeLessThan(PERFORMANCE_CONFIG.WIDGET_RENDER_TIME_THRESHOLD);
  });

  test('Widget button should render quickly', async () => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Widget Render Test</title>
      </head>
      <body>
        <div id="feedloop-widget"></div>
        <script src="${PERFORMANCE_CONFIG.TEST_URL}/widget/feedloop-widget.js"></script>
        <script>
          if (window.FeedLoop) {
            const renderStart = performance.now();

            FeedLoop.init({
              projectKey: 'test-project-key-12345678',
              position: 'bottom-right',
              theme: 'light'
            });

            // Wait for widget button to appear
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                  mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE &&
                        (node.id === 'feedloop-widget-button' ||
                         node.querySelector('#feedloop-widget-button'))) {
                      const renderEnd = performance.now();
                      window.widgetRenderTime = renderEnd - renderStart;
                      console.log('Widget render time:', window.widgetRenderTime, 'ms');
                      observer.disconnect();
                    }
                  });
                }
              });
            });

            observer.observe(document.body, { childList: true, subtree: true });
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);

    // Wait for widget to render
    await page.waitForFunction(() => window.widgetRenderTime !== undefined, { timeout: 5000 });

    const renderTime = await page.evaluate(() => window.widgetRenderTime);

    console.log(`Widget render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.WIDGET_RENDER_TIME_THRESHOLD);
  });

  test('Widget modal should open quickly', async () => {
    await page.goto(`${PERFORMANCE_CONFIG.TEST_URL}/test-widget-simple.html`);

    // Wait for widget to load
    await page.waitForSelector('#feedloop-widget-button', { timeout: 5000 });

    // Measure modal open time
    const modalOpenStart = await page.evaluate(() => performance.now());

    // Click widget button
    await page.click('#feedloop-widget-button');

    // Wait for modal to appear
    await page.waitForSelector('.feedloop-modal', { timeout: 5000 });

    const modalOpenEnd = await page.evaluate(() => performance.now());
    const modalOpenTime = modalOpenEnd - modalOpenStart;

    console.log(`Widget modal open time: ${modalOpenTime}ms`);
    expect(modalOpenTime).toBeLessThan(PERFORMANCE_CONFIG.WIDGET_RENDER_TIME_THRESHOLD);
  });

  test('Widget should handle multiple rapid clicks gracefully', async () => {
    await page.goto(`${PERFORMANCE_CONFIG.TEST_URL}/test-widget-simple.html`);

    // Wait for widget to load
    await page.waitForSelector('#feedloop-widget-button', { timeout: 5000 });

    const clickStart = Date.now();

    // Rapid clicks test
    for (let i = 0; i < 10; i++) {
      await page.click('#feedloop-widget-button');
      await page.waitForTimeout(50); // 50ms between clicks
    }

    const clickEnd = Date.now();
    const totalTime = clickEnd - clickStart;

    console.log(`Rapid clicks handling time: ${totalTime}ms`);

    // Should handle rapid clicks without freezing
    expect(totalTime).toBeLessThan(2000); // 2 seconds max for 10 clicks

    // Modal should still be functional
    const isModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.feedloop-modal');
      return modal && getComputedStyle(modal).display !== 'none';
    });

    expect(isModalVisible).toBe(true);
  });

  test('Widget script size should be optimized', async () => {
    const response = await page.goto(`${PERFORMANCE_CONFIG.TEST_URL}/widget/feedloop-widget.js`);
    const content = await response.text();
    const sizeInBytes = Buffer.byteLength(content, 'utf8');
    const sizeInKB = sizeInBytes / 1024;

    console.log(`Widget script size: ${sizeInKB.toFixed(2)} KB`);

    // Widget script should be under 50KB for fast loading
    expect(sizeInKB).toBeLessThan(50);
  });

  test('Widget CSS should be minimal', async () => {
    // Test CSS injection performance
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>CSS Performance Test</title>
      </head>
      <body>
        <script src="${PERFORMANCE_CONFIG.TEST_URL}/widget/feedloop-widget.js"></script>
        <script>
          if (window.FeedLoop) {
            const cssStart = performance.now();

            FeedLoop.init({
              projectKey: 'test-project-key-12345678',
              position: 'bottom-right',
              theme: 'light'
            });

            // Wait for CSS to be injected
            const checkCSS = () => {
              const styleSheets = document.styleSheets;
              for (let i = 0; i < styleSheets.length; i++) {
                try {
                  const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                  if (rules && rules.length > 0) {
                    for (let j = 0; j < rules.length; j++) {
                      if (rules[j].selectorText && rules[j].selectorText.includes('feedloop')) {
                        const cssEnd = performance.now();
                        window.cssInjectionTime = cssEnd - cssStart;
                        return true;
                      }
                    }
                  }
                } catch (e) {
                  // Cross-origin stylesheet access might fail
                }
              }
              return false;
            };

            const cssCheckInterval = setInterval(() => {
              if (checkCSS()) {
                clearInterval(cssCheckInterval);
              }
            }, 10);

            // Fallback timeout
            setTimeout(() => {
              clearInterval(cssCheckInterval);
              if (!window.cssInjectionTime) {
                window.cssInjectionTime = performance.now() - cssStart;
              }
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);

    // Wait for CSS injection measurement
    await page.waitForFunction(() => window.cssInjectionTime !== undefined, { timeout: 5000 });

    const cssTime = await page.evaluate(() => window.cssInjectionTime);

    console.log(`CSS injection time: ${cssTime}ms`);
    expect(cssTime).toBeLessThan(100); // CSS should inject very quickly
  });

  test('Widget should work on slow connections', async () => {
    // Simulate very slow connection
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 32000, // 256 Kbps (2G speed) in bytes/second
      uploadThroughput: 16000, // 128 Kbps in bytes/second
      latency: 500 // 500ms latency
    });

    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Slow Connection Test</title>
      </head>
      <body>
        <div id="feedloop-widget"></div>
        <script>
          const loadStart = performance.now();
        </script>
        <script src="${PERFORMANCE_CONFIG.TEST_URL}/widget/feedloop-widget.js"></script>
        <script>
          if (window.FeedLoop) {
            FeedLoop.init({
              projectKey: 'test-project-key-12345678',
              position: 'bottom-right',
              theme: 'light'
            });

            const loadEnd = performance.now();
            window.slowConnectionLoadTime = loadEnd - loadStart;
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);

    // Wait for widget to load (longer timeout for slow connection)
    await page.waitForFunction(() => window.slowConnectionLoadTime !== undefined, { timeout: 15000 });

    const loadTime = await page.evaluate(() => window.slowConnectionLoadTime);

    console.log(`Widget load time on slow connection: ${loadTime}ms`);

    // Should still load reasonably fast even on slow connections
    expect(loadTime).toBeLessThan(5000); // 5 seconds max for very slow connections
  });

  test('Generate performance report', async () => {
    // Collect performance metrics
    const metrics = await page.metrics();

    const performanceReport = {
      timestamp: new Date().toISOString(),
      testResults: {
        widgetLoadThreshold: PERFORMANCE_CONFIG.WIDGET_LOAD_TIME_THRESHOLD,
        renderThreshold: PERFORMANCE_CONFIG.WIDGET_RENDER_TIME_THRESHOLD
      },
      metrics: {
        jsHeapUsedSize: Math.round(metrics.JSHeapUsedSize / 1024 / 1024 * 100) / 100, // MB
        jsHeapTotalSize: Math.round(metrics.JSHeapTotalSize / 1024 / 1024 * 100) / 100, // MB
        scriptDuration: metrics.ScriptDuration,
        taskDuration: metrics.TaskDuration,
        layoutCount: metrics.LayoutCount,
        recalcStyleCount: metrics.RecalcStyleCount
      },
      networkConditions: PERFORMANCE_CONFIG.NETWORK_THROTTLING,
      recommendations: []
    };

    // Add recommendations based on metrics
    if (performanceReport.metrics.jsHeapUsedSize > 10) {
      performanceReport.recommendations.push('Consider reducing JavaScript memory usage');
    }

    if (performanceReport.metrics.layoutCount > 5) {
      performanceReport.recommendations.push('Optimize CSS to reduce layout recalculations');
    }

    if (performanceReport.metrics.recalcStyleCount > 10) {
      performanceReport.recommendations.push('Reduce style recalculations by optimizing CSS selectors');
    }

    // Save performance report
    const reportPath = path.join(__dirname, '..', '..', 'performance-reports', 'widget-performance.json');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));

    console.log('Performance report saved to:', reportPath);
    console.log('Performance metrics:', performanceReport.metrics);
  });
});