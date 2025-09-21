# Technical Research: Enhanced Log Visualization

## Current State Analysis

### Existing Infrastructure
1. **Database Layer**
   - `fl_reports` table with JSON columns (`console_logs`, `network_requests`)
   - Flexible schema supports nested data structures
   - No migration required for Option 1 implementation

2. **Widget Capabilities**
   - Console log collection with GZIP compression (>50KB)
   - Network request tracking
   - 10MB body size limit
   - Browser environment data collection

3. **UI Components**
   - Prism.js syntax highlighting integrated
   - Terminal-style log viewer implemented
   - CSV export functionality working
   - Enhanced reports table with filtering

### Gap Analysis

#### Data Collection Gaps
| Required Feature | Current State | Implementation Effort |
|-----------------|---------------|---------------------|
| Core Web Vitals | Not collected | Medium - Performance Observer API |
| Error boundaries | Basic errors only | Low - Window error handlers |
| User interactions | Not tracked | Medium - Event listeners + consent |
| Resource timing | Basic network data | Low - Enhance existing |
| Stack traces | Partial | Low - Error object parsing |

#### Visualization Gaps
| Required Feature | Current State | Implementation Effort |
|-----------------|---------------|---------------------|
| Network waterfall | Not implemented | High - New component |
| Performance categories | Not implemented | Low - Threshold logic |
| Error correlation | Not implemented | Medium - Linking algorithm |
| Pattern detection | Not implemented | Medium - Analysis logic |
| JSON export | CSV only | Low - Format addition |

## Technical Approach

### Phase 1: Enhanced Data Collection

#### Performance Metrics Collection
```javascript
// Using Performance Observer API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      // Collect FCP, LCP, TTI
    }
    if (entry.entryType === 'layout-shift') {
      // Collect CLS
    }
    if (entry.entryType === 'first-input') {
      // Collect FID
    }
  }
});
observer.observe({ entryTypes: ['navigation', 'layout-shift', 'first-input'] });
```

#### Error Context Enhancement
```javascript
window.addEventListener('unhandledrejection', (event) => {
  // Capture promise rejections
});

window.addEventListener('error', (event) => {
  // Enhanced stack trace capture
});
```

### Phase 2: Storage Strategy

#### Option 1: Embedded in Existing Columns (Quick Start)
```json
{
  "console_logs": {
    "entries": [...],
    "performance_metrics": {
      "fcp": 1234,
      "lcp": 2345,
      "cls": 0.05
    }
  }
}
```

#### Option 2: Dedicated Columns (Long-term)
```sql
ALTER TABLE fl_reports
ADD COLUMN performance_metrics JSON,
ADD COLUMN interaction_data JSON,
ADD COLUMN error_context JSON;
```

### Phase 3: Visualization Components

#### Network Waterfall Chart
- Library options: D3.js, Chart.js, or custom Canvas
- Recommendation: **Custom React + Canvas** for performance
- Similar to Chrome DevTools Network tab

#### Performance Metrics Display
- Traffic light system for thresholds
- Sparklines for trends
- Tooltips with explanations

## Implementation Priorities

### Must Have (Phase 1-2)
1. Core Web Vitals collection
2. Network waterfall visualization
3. Performance categorization
4. Enhanced error context

### Should Have (Phase 3)
1. Error-network correlation
2. Pattern detection
3. User interaction tracking
4. JSON export format

### Nice to Have (Phase 4)
1. Automated insights
2. Historical comparisons
3. Custom threshold configuration
4. Real-time updates

## Risk Assessment

### Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Browser compatibility | Medium | High | Feature detection + fallbacks |
| Performance impact | Low | Medium | Lazy loading, virtualization |
| Data volume growth | Medium | Medium | Compression, pagination |
| Privacy concerns | Low | High | Clear consent, data anonymization |

### Implementation Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scope creep | Medium | High | Phased approach, clear boundaries |
| Breaking changes | Low | High | Backward compatibility tests |
| Complex correlations | High | Medium | Start simple, iterate |

## Technology Decisions

### Visualization Library
**Decision**: Custom React components with Canvas API
- **Rationale**: Full control, optimal performance, no dependency bloat
- **Alternative**: D3.js (more features, steeper learning curve)

### Data Storage
**Decision**: Start with Option 1 (embedded JSON), migrate to Option 2 later
- **Rationale**: No migration needed, faster deployment
- **Alternative**: Immediate Option 2 (cleaner but requires migration)

### Performance Monitoring
**Decision**: Performance Observer API with fallbacks
- **Rationale**: Native browser API, standard metrics
- **Alternative**: Custom timing (less accurate)

## Browser Compatibility

### Core Features
- Performance Observer API: Chrome 52+, Firefox 57+, Safari 11+
- Compression Stream API: Chrome 80+, Firefox 113+, Safari 16.4+
- ResizeObserver: Chrome 64+, Firefox 69+, Safari 13.1+

### Fallback Strategy
1. Feature detection for each API
2. Graceful degradation for older browsers
3. Polyfills where appropriate
4. Clear messaging about limited features

## Performance Considerations

### Client-Side
- Virtual scrolling for large datasets
- Web Workers for heavy computations
- Debounced filtering/searching
- Lazy loading of visualizations

### Server-Side
- Indexed JSON queries in PostgreSQL
- Pagination for large result sets
- Caching frequently accessed data
- Compression for API responses

## Security & Privacy

### Data Collection
- Opt-in consent banner
- LocalStorage for preferences
- No PII in performance metrics
- Anonymized interaction tracking

### Data Storage
- Encrypted at rest (Supabase)
- Row-level security policies
- Audit logging for access
- GDPR compliance features

## Dependencies Analysis

### New Dependencies Required
```json
{
  "dependencies": {
    // None required for core functionality
  },
  "devDependencies": {
    "@types/web": "^0.0.x", // Web API types
    "jest-canvas-mock": "^2.x" // Canvas testing
  }
}
```

### Existing Dependencies Leveraged
- Prism.js - Syntax highlighting
- Tailwind CSS - Styling
- Next.js - Framework
- React - UI components

## Conclusion

The enhanced log visualization feature can be implemented incrementally with minimal risk to existing functionality. The phased approach allows for quick wins (Core Web Vitals collection) while building toward advanced features (correlation, patterns). Leveraging existing infrastructure (JSON columns, Prism.js) reduces implementation complexity and time to market.