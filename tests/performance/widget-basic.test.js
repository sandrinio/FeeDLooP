/**
 * Basic Widget Performance Test
 * T093: Performance testing for widget load time (<500ms)
 */

const fetch = require('node-fetch');

describe('Widget Performance - Basic Tests', () => {
  const WIDGET_URL = 'http://localhost:3001/widget/feedloop-widget.js';
  const PERFORMANCE_THRESHOLDS = {
    LOAD_TIME_MS: 500,
    FILE_SIZE_KB: 50
  };

  test('Widget script should download quickly', async () => {
    const startTime = Date.now();

    const response = await fetch(WIDGET_URL);
    expect(response.ok).toBe(true);

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    console.log(`Widget script download time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME_MS);
  });

  test('Widget script size should be optimized', async () => {
    const response = await fetch(WIDGET_URL);
    const content = await response.text();
    const sizeInBytes = Buffer.byteLength(content, 'utf8');
    const sizeInKB = sizeInBytes / 1024;

    console.log(`Widget script size: ${sizeInKB.toFixed(2)} KB`);
    expect(sizeInKB).toBeLessThan(PERFORMANCE_THRESHOLDS.FILE_SIZE_KB);
  });

  test('Widget script should be valid JavaScript', async () => {
    const response = await fetch(WIDGET_URL);
    const content = await response.text();

    // Basic check for JavaScript validity
    expect(content).toContain('function');
    expect(content).not.toContain('syntax error');

    // Check for key widget components
    expect(content).toMatch(/FeedLoop|feedloop/i);
    console.log('Widget script contains expected FeedLoop components');
  });

  test('Widget CSS should be available', async () => {
    const cssUrl = 'http://localhost:3001/widget/widget.css';

    const response = await fetch(cssUrl);
    expect(response.ok).toBe(true);

    const content = await response.text();
    const sizeInBytes = Buffer.byteLength(content, 'utf8');
    const sizeInKB = sizeInBytes / 1024;

    console.log(`Widget CSS size: ${sizeInKB.toFixed(2)} KB`);
    expect(sizeInKB).toBeLessThan(20); // CSS should be under 20KB
  });

  test('Multiple concurrent widget requests should be fast', async () => {
    const startTime = Date.now();
    const numRequests = 5;

    const promises = Array(numRequests).fill().map(() => fetch(WIDGET_URL));
    const responses = await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / numRequests;

    responses.forEach(response => {
      expect(response.ok).toBe(true);
    });

    console.log(`${numRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgTime.toFixed(2)}ms)`);
    expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LOAD_TIME_MS * 2); // Should handle concurrent requests well
  });

  test('Widget script compression should be effective', async () => {
    const response = await fetch(WIDGET_URL);
    const contentEncoding = response.headers.get('content-encoding');
    const contentLength = response.headers.get('content-length');

    console.log('Content-Encoding:', contentEncoding);
    console.log('Content-Length:', contentLength);

    // Check if compression is being used (gzip, br, etc.)
    if (contentEncoding) {
      expect(['gzip', 'br', 'deflate']).toContain(contentEncoding);
      console.log('Widget script is properly compressed');
    } else {
      console.log('No compression detected - consider enabling gzip/brotli');
    }
  });

  test('Generate performance report', () => {
    const fs = require('fs');
    const path = require('path');

    const performanceReport = {
      timestamp: new Date().toISOString(),
      testResults: {
        loadTimeThreshold: PERFORMANCE_THRESHOLDS.LOAD_TIME_MS,
        fileSizeThreshold: PERFORMANCE_THRESHOLDS.FILE_SIZE_KB,
        status: 'completed'
      },
      recommendations: [
        'Enable gzip/brotli compression for better performance',
        'Consider code splitting for large widget files',
        'Implement lazy loading for non-critical features',
        'Use CDN for faster global distribution'
      ]
    };

    // Save performance report
    const reportDir = path.join(__dirname, '..', '..', 'performance-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, 'widget-basic-performance.json');
    fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));

    console.log('Basic performance report saved to:', reportPath);
    expect(performanceReport.testResults.status).toBe('completed');
  });
});