# Quick Start Guide: Enhanced Log Visualization

## Overview
This guide helps developers implement the enhanced log visualization feature, which adds network waterfall charts, Core Web Vitals metrics, and intelligent error correlation to bug reports.

## Prerequisites

- Node.js 18+
- Next.js 15.5.3 project
- Supabase database access
- Basic understanding of React and TypeScript

## Phase 1: Widget Enhancement (2-3 days)

### 1.1 Add Performance Metrics Collection

Update `public/widget/feedloop-widget.js`:

```javascript
// Add Performance Observer for Core Web Vitals
function collectPerformanceMetrics() {
  const metrics = {
    web_vitals: {},
    custom_metrics: {}
  };

  // Collect FCP and LCP
  if (window.PerformanceObserver) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metrics.web_vitals.fcp = entry.startTime;
        }
        if (entry.entryType === 'largest-contentful-paint') {
          metrics.web_vitals.lcp = entry.startTime;
        }
      }
    });

    observer.observe({
      entryTypes: ['paint', 'largest-contentful-paint']
    });
  }

  // Collect CLS
  let clsValue = 0;
  if (window.PerformanceObserver) {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          metrics.web_vitals.cls = clsValue;
        }
      }
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  return metrics;
}
```

### 1.2 Enhance Error Collection

```javascript
// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorContext = {
    type: 'promise_rejection',
    reason: event.reason?.toString() || 'Unknown',
    promise: event.promise,
    timestamp: new Date().toISOString()
  };

  widgetState.diagnosticData.errorContext.push(errorContext);
});

// Enhanced error handler
window.addEventListener('error', (event) => {
  const errorDetail = {
    message: event.error?.message || event.message,
    stack: event.error?.stack,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    timestamp: new Date().toISOString()
  };

  widgetState.diagnosticData.errorContext.push(errorDetail);
});
```

### 1.3 Add Privacy Consent

```javascript
// Check for consent before interaction tracking
function initializeInteractionTracking() {
  const consent = localStorage.getItem('feedloop_interaction_consent');

  if (consent === 'accepted') {
    startInteractionTracking();
  } else if (!consent) {
    showConsentBanner();
  }
}

function showConsentBanner() {
  const banner = document.createElement('div');
  banner.className = 'feedloop-consent-banner';
  banner.innerHTML = `
    <p>This site collects diagnostic data to improve user experience</p>
    <button onclick="acceptConsent()">Accept</button>
    <button onclick="declineConsent()">Decline</button>
  `;
  document.body.appendChild(banner);
}
```

## Phase 2: Database Updates (1 day)

### 2.1 Option 1: Use Existing Columns (Quick Start)

No database changes needed. Store enhanced data in existing JSON columns:

```typescript
// In API route handler
const enhancedConsoleLogs = {
  entries: consoleLogs,
  performance_metrics: performanceData,
  error_context: errorData,
  metadata: {
    total_count: consoleLogs.length,
    error_count: errorCount,
    truncated: false
  }
};

// Save to existing column
await supabase
  .from('fl_reports')
  .insert({
    ...reportData,
    console_logs: enhancedConsoleLogs
  });
```

### 2.2 Option 2: Add Dedicated Columns (Recommended)

Run migration:

```sql
-- Add new columns
ALTER TABLE fl_reports
ADD COLUMN IF NOT EXISTS performance_metrics JSON,
ADD COLUMN IF NOT EXISTS interaction_data JSON,
ADD COLUMN IF NOT EXISTS error_context JSON;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_perf_lcp
ON fl_reports((performance_metrics->'web_vitals'->>'lcp')::numeric);
```

## Phase 3: UI Components (3-4 days)

### 3.1 Network Waterfall Component

Create `components/reports/NetworkWaterfall.tsx`:

```tsx
import { useEffect, useRef } from 'react';

interface NetworkEntry {
  id: string;
  url: string;
  method: string;
  status: number;
  timing: {
    dns: number;
    tcp: number;
    request: number;
    response: number;
    total: number;
  };
}

export function NetworkWaterfall({
  requests
}: {
  requests: NetworkEntry[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw waterfall chart
    drawWaterfall(ctx, requests);
  }, [requests]);

  function drawWaterfall(
    ctx: CanvasRenderingContext2D,
    requests: NetworkEntry[]
  ) {
    const rowHeight = 30;
    const timeScale = 0.5; // pixels per ms

    requests.forEach((req, index) => {
      const y = index * rowHeight;

      // Draw DNS time (blue)
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(0, y, req.timing.dns * timeScale, 25);

      // Draw TCP time (green)
      ctx.fillStyle = '#10B981';
      ctx.fillRect(
        req.timing.dns * timeScale,
        y,
        req.timing.tcp * timeScale,
        25
      );

      // Draw request time (yellow)
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(
        (req.timing.dns + req.timing.tcp) * timeScale,
        y,
        req.timing.request * timeScale,
        25
      );

      // Draw response time (purple)
      ctx.fillStyle = '#8B5CF6';
      ctx.fillRect(
        (req.timing.dns + req.timing.tcp + req.timing.request) * timeScale,
        y,
        req.timing.response * timeScale,
        25
      );
    });
  }

  return (
    <div className="waterfall-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={requests.length * 30}
      />
    </div>
  );
}
```

### 3.2 Performance Metrics Display

Create `components/reports/PerformanceMetrics.tsx`:

```tsx
interface WebVitals {
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  tti?: number;
}

export function PerformanceMetrics({
  metrics
}: {
  metrics: WebVitals
}) {
  function getScoreColor(metric: string, value: number): string {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fcp: { good: 1000, poor: 3000 },
      cls: { good: 0.1, poor: 0.25 },
      fid: { good: 100, poor: 300 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'gray';

    if (value <= threshold.good) return 'green';
    if (value <= threshold.poor) return 'yellow';
    return 'red';
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {metrics.lcp !== undefined && (
        <MetricCard
          title="LCP"
          value={`${metrics.lcp}ms`}
          color={getScoreColor('lcp', metrics.lcp)}
          description="Largest Contentful Paint"
        />
      )}
      {metrics.fcp !== undefined && (
        <MetricCard
          title="FCP"
          value={`${metrics.fcp}ms`}
          color={getScoreColor('fcp', metrics.fcp)}
          description="First Contentful Paint"
        />
      )}
      {metrics.cls !== undefined && (
        <MetricCard
          title="CLS"
          value={metrics.cls.toFixed(3)}
          color={getScoreColor('cls', metrics.cls)}
          description="Cumulative Layout Shift"
        />
      )}
    </div>
  );
}
```

### 3.3 Update Report Detail Page

Enhance `app/dashboard/projects/[id]/reports/[reportId]/page.tsx`:

```tsx
import { NetworkWaterfall } from '@/components/reports/NetworkWaterfall';
import { PerformanceMetrics } from '@/components/reports/PerformanceMetrics';

// Add to existing component
{report.performance_metrics && (
  <div className="mt-8">
    <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
    <PerformanceMetrics metrics={report.performance_metrics.web_vitals} />
  </div>
)}

{report.network_requests?.entries && (
  <div className="mt-8">
    <h2 className="text-xl font-semibold mb-4">Network Waterfall</h2>
    <NetworkWaterfall requests={report.network_requests.entries} />
  </div>
)}
```

## Phase 4: Testing (2 days)

### 4.1 Unit Tests

```typescript
// tests/unit/performance-metrics.test.ts
import { render } from '@testing-library/react';
import { PerformanceMetrics } from '@/components/reports/PerformanceMetrics';

describe('PerformanceMetrics', () => {
  it('displays web vitals with correct colors', () => {
    const metrics = {
      lcp: 3500, // Should be yellow
      fcp: 800,  // Should be green
      cls: 0.3   // Should be red
    };

    const { getByText } = render(
      <PerformanceMetrics metrics={metrics} />
    );

    expect(getByText('3500ms')).toHaveClass('text-yellow-600');
    expect(getByText('800ms')).toHaveClass('text-green-600');
    expect(getByText('0.300')).toHaveClass('text-red-600');
  });
});
```

### 4.2 E2E Tests

```typescript
// tests/e2e/reports-visualization.spec.ts
import { test, expect } from '@playwright/test';

test('displays network waterfall chart', async ({ page }) => {
  await page.goto('/dashboard/projects/[id]/reports/[reportId]');

  // Wait for waterfall to load
  await page.waitForSelector('.waterfall-container canvas');

  // Check canvas is rendered with content
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas?.width).toBeGreaterThan(0);
  expect(canvas?.height).toBeGreaterThan(0);
});

test('shows performance categorization', async ({ page }) => {
  await page.goto('/dashboard/projects/[id]/reports/[reportId]');

  // Check for performance metrics
  await expect(page.locator('[data-testid="lcp-metric"]')).toBeVisible();
  await expect(page.locator('[data-testid="fcp-metric"]')).toBeVisible();

  // Verify color coding
  const lcpCard = page.locator('[data-testid="lcp-metric"]');
  await expect(lcpCard).toHaveAttribute('data-score', 'needs-improvement');
});
```

## Deployment Checklist

### Pre-deployment
- [ ] Widget version updated to 2.0.0
- [ ] Database migration tested (if using Option 2)
- [ ] Feature flags configured
- [ ] Performance impact measured
- [ ] Privacy consent tested

### Deployment Steps
1. Deploy widget updates (backward compatible)
2. Deploy API changes
3. Run database migration (if needed)
4. Deploy UI components
5. Enable feature flags progressively

### Post-deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify data collection
- [ ] Test export functionality
- [ ] Gather user feedback

## Troubleshooting

### Common Issues

#### 1. Performance metrics not collecting
- Check browser compatibility
- Verify Performance Observer API support
- Check for Content Security Policy blocks

#### 2. Large payload errors
- Ensure compression is working
- Check 10MB limit handling
- Verify GZIP encoding

#### 3. Waterfall chart not rendering
- Check Canvas API support
- Verify request timing data
- Check for render blocking

## Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Performance Observer API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Next.js App Router](https://nextjs.org/docs/app)

## Support

For questions or issues:
- Check existing code in `/app/dashboard/projects/[id]/reports/`
- Review widget documentation in `/product_documentation/WIDGET_DOCUMENTATION.md`
- Consult database schema in `/product_documentation/DATABASE_DOCUMENTATION.sql`