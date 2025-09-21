# CLAUDE.md - AI Assistant Guide for Enhanced Log Visualization

## Feature Overview
You're implementing enhanced log visualization for FeeDLooP, adding network waterfall charts, Core Web Vitals metrics, and intelligent error correlation to bug reports. This builds on existing infrastructure (Prism.js, JSON storage) through a 4-phase incremental approach.

## Current Context

### Existing Infrastructure
- **Database**: Supabase PostgreSQL with `fl_reports` table containing JSON columns
- **UI**: Next.js 15.5.3 with enhanced reports table, Prism.js syntax highlighting
- **Widget**: Collects console logs and network requests with GZIP compression
- **Export**: CSV functionality already implemented

### What You're Adding
1. **Data Collection**: Core Web Vitals, enhanced error context, user interactions (with consent)
2. **Visualizations**: Network waterfall chart, performance categorization, error correlation
3. **Export Formats**: JSON and Excel in addition to existing CSV
4. **Insights**: Automated performance recommendations and pattern detection

## Key Implementation Files

### Phase 1: Widget Enhancement
- `public/widget/feedloop-widget.js` - Add performance metrics collection
- Focus on Performance Observer API and error boundaries
- Maintain backward compatibility

### Phase 2: API & Storage
- `app/api/widget/submit/route.ts` - Handle enhanced data
- `app/api/projects/[id]/reports/route.ts` - Add filtering for new metrics
- Choose between embedded JSON (Option 1) or new columns (Option 2)

### Phase 3: UI Components
- `components/reports/NetworkWaterfall.tsx` - NEW waterfall chart
- `components/reports/PerformanceMetrics.tsx` - NEW metrics display
- `app/dashboard/projects/[id]/reports/[reportId]/page.tsx` - Enhance existing

### Phase 4: Testing
- `tests/e2e/reports-visualization.spec.ts` - NEW E2E tests
- `tests/unit/performance-metrics.test.ts` - NEW unit tests

## Implementation Guidelines

### When Working on Widget
```javascript
// Always check for API availability
if (window.PerformanceObserver) {
  // Use Performance Observer
} else {
  // Graceful fallback
}

// Maintain existing data structure
const enhancedLogs = {
  entries: existingLogs, // Keep backward compatibility
  performance_metrics: newMetrics // Add new data
};
```

### When Working on Database
```typescript
// Option 1: Embed in existing (quick start)
const report = {
  console_logs: {
    entries: [...],
    performance_metrics: {...} // New nested data
  }
};

// Option 2: New columns (long-term)
const report = {
  console_logs: [...], // Keep existing
  performance_metrics: {...} // New column
};
```

### When Working on UI Components
```tsx
// Use existing patterns
import { useEffect, useState } from 'react';
import Prism from 'prismjs'; // Already available

// Follow existing styling
className="rounded-lg border border-gray-200 bg-white p-4"

// Leverage existing icons
import { CodeBracketIcon, WifiIcon } from '@heroicons/react/24/outline';
```

## Common Tasks

### Add a New Performance Metric
1. Collect in widget: `public/widget/feedloop-widget.js`
2. Store in database: Update JSON structure
3. Display in UI: Add to `PerformanceMetrics.tsx`
4. Export: Include in export formats

### Fix a Visualization Bug
1. Check data structure in browser DevTools
2. Verify API response format
3. Test with different data volumes
4. Consider performance impact

### Optimize Performance
1. Use virtual scrolling for large datasets
2. Implement lazy loading for charts
3. Cache calculated values
4. Debounce filter operations

## Data Structures Reference

### Performance Metrics
```typescript
{
  web_vitals: {
    fcp: number,  // First Contentful Paint (ms)
    lcp: number,  // Largest Contentful Paint (ms)
    cls: number,  // Cumulative Layout Shift (score)
    fid: number,  // First Input Delay (ms)
    tti: number   // Time to Interactive (ms)
  }
}
```

### Network Request Enhanced
```typescript
{
  id: string,
  url: string,
  timing: {
    dns: number,
    tcp: number,
    request: number,
    response: number,
    total: number
  },
  correlation_id: string // Links to errors
}
```

### Error Context
```typescript
{
  unhandled_errors: ErrorDetail[],
  promise_rejections: PromiseRejection[],
  patterns: ErrorPattern[]
}
```

## Performance Thresholds

Use these industry-standard thresholds for categorization:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | <2.5s | 2.5-4s | >4s |
| FCP | <1s | 1-3s | >3s |
| CLS | <0.1 | 0.1-0.25 | >0.25 |
| FID | <100ms | 100-300ms | >300ms |

## Privacy & Consent

Always check consent before collecting interaction data:
```javascript
const consent = localStorage.getItem('feedloop_interaction_consent');
if (consent === 'accepted') {
  // Collect interaction data
}
```

## Testing Checklist

Before committing changes:
- [ ] Widget works with old and new data formats
- [ ] API handles missing enhanced fields
- [ ] UI gracefully handles incomplete metrics
- [ ] Export includes new fields when available
- [ ] Performance impact is acceptable (<100ms)

## Debugging Tips

### Widget Not Collecting Metrics
```javascript
console.log('Performance API available:', !!window.PerformanceObserver);
console.log('Metrics collected:', widgetState.diagnosticData.performanceMetrics);
```

### Waterfall Not Rendering
```javascript
console.log('Network requests:', report.network_requests);
console.log('Canvas context:', canvasRef.current?.getContext('2d'));
```

### Export Missing Data
```sql
-- Check if enhanced data exists
SELECT
  id,
  console_logs->>'performance_metrics' as metrics,
  jsonb_typeof(console_logs->'performance_metrics') as type
FROM fl_reports
WHERE project_id = '...';
```

## Common Pitfalls to Avoid

1. **Don't break backward compatibility** - Always handle missing enhanced fields
2. **Don't collect PII** - Anonymize interaction data
3. **Don't block on missing APIs** - Use feature detection
4. **Don't assume data structure** - Validate JSON before parsing
5. **Don't ignore performance** - Large datasets need optimization

## Useful Commands

```bash
# Build widget
npm run build:widget

# Run tests
npm run test:e2e -- --grep "reports"

# Check type safety
npm run type-check

# Lint code
npm run lint
```

## Need Help?

1. Check existing implementation in `/app/dashboard/projects/[id]/reports/`
2. Review contracts in `/specs/004-please-make-sure/contracts/`
3. Consult data model in `/specs/004-please-make-sure/data-model.md`
4. Reference quickstart guide in `/specs/004-please-make-sure/quickstart.md`

Remember: This is an incremental enhancement. Start small, test thoroughly, and build on what works.