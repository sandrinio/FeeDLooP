// Performance Observer API Types and Polyfills
// Provides type definitions and browser compatibility helpers

// ============================================================================
// Browser Performance API Extensions
// ============================================================================

export interface ExtendedPerformanceEntry extends PerformanceEntry {
  // Additional properties for different entry types
  renderTime?: number;
  loadTime?: number;
  element?: Element;
  hadRecentInput?: boolean;
  value?: number; // For layout-shift entries
  sources?: Array<{
    node?: Node;
    currentRect?: DOMRectReadOnly;
    previousRect?: DOMRectReadOnly;
  }>;
}

export interface PerformanceNavigationTimingExtended extends PerformanceNavigationTiming {
  // Extended navigation timing properties
  criticalResourceTiming?: PerformanceResourceTiming[];
  renderBlockingStatus?: 'blocking' | 'non-blocking';
}

// ============================================================================
// Core Web Vitals Collection Types
// ============================================================================

export interface WebVitalMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTI' | 'TTFB';
  value: number;
  timestamp: number;
  id: string;
  delta?: number;
  entries?: ExtendedPerformanceEntry[];
  attribution?: {
    [key: string]: unknown;
  };
}

export interface WebVitalCollector {
  metric: WebVitalMetric;
  callback: (metric: WebVitalMetric) => void;
}

// ============================================================================
// Performance Observer Configuration
// ============================================================================

export interface PerformanceObserverConfig {
  entryTypes: PerformanceEntryType[];
  buffered?: boolean;
  threshold?: number;
}

export type PerformanceEntryType =
  | 'navigation'
  | 'resource'
  | 'paint'
  | 'largest-contentful-paint'
  | 'layout-shift'
  | 'first-input'
  | 'longtask'
  | 'measure'
  | 'mark';

// ============================================================================
// Browser Feature Detection
// ============================================================================

export interface BrowserCapabilities {
  supportsPerformanceObserver: boolean;
  supportsWebVitals: boolean;
  supportsResourceTiming: boolean;
  supportsNavigationTiming: boolean;
  supportsMemoryAPI: boolean;
  supportsConnectionAPI: boolean;
  supportedEntryTypes: PerformanceEntryType[];
}

export interface PerformanceSupport {
  observer: boolean;
  webVitals: {
    fcp: boolean;
    lcp: boolean;
    cls: boolean;
    fid: boolean;
    tti: boolean;
  };
  resourceTiming: boolean;
  navigationTiming: boolean;
  memory: boolean;
}

// ============================================================================
// Performance Collection Configuration
// ============================================================================

export interface PerformanceCollectionConfig {
  enabled: boolean;
  collectWebVitals: boolean;
  collectResourceTiming: boolean;
  collectLongTasks: boolean;
  collectLayoutShifts: boolean;
  maxEntries: {
    resources: number;
    marks: number;
    measures: number;
    longTasks: number;
  };
  thresholds: {
    longTaskDuration: number; // ms
    largeLayoutShiftValue: number; // CLS threshold
    slowResourceThreshold: number; // ms
  };
}

// ============================================================================
// Performance Data Structures
// ============================================================================

export interface CollectedPerformanceData {
  webVitals: {
    fcp?: number;
    lcp?: number;
    cls?: number;
    fid?: number;
    tti?: number;
    ttfb?: number;
  };
  navigation?: PerformanceNavigationTimingExtended;
  resources: PerformanceResourceTiming[];
  longTasks: PerformanceLongTaskTiming[];
  layoutShifts: LayoutShiftEntry[];
  customMarks: PerformanceMark[];
  customMeasures: PerformanceMeasure[];
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  collectionTimestamp: number;
}

// ============================================================================
// Layout Shift Specific Types
// ============================================================================

export interface LayoutShiftEntry extends ExtendedPerformanceEntry {
  entryType: 'layout-shift';
  value: number;
  hadRecentInput: boolean;
  sources: Array<{
    node?: Node;
    currentRect: DOMRectReadOnly;
    previousRect: DOMRectReadOnly;
  }>;
}

export interface LayoutShiftAttribution {
  largestShiftTarget?: Element;
  largestShiftValue: number;
  largestShiftSource?: {
    node: Node;
    currentRect: DOMRectReadOnly;
    previousRect: DOMRectReadOnly;
  };
}

// ============================================================================
// Long Task Types
// ============================================================================

export interface PerformanceLongTaskTiming extends PerformanceEntry {
  entryType: 'longtask';
  attribution: TaskAttributionTiming[];
}

export interface TaskAttributionTiming extends PerformanceEntry {
  containerType: string;
  containerSrc: string;
  containerId: string;
  containerName: string;
}

// ============================================================================
// Performance Analysis Types
// ============================================================================

export interface PerformanceAnalysis {
  score: {
    overall: number; // 0-100
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
    tti: number;
  };
  categoryScores: {
    loading: number;
    interactivity: number;
    visual_stability: number;
  };
  opportunities: Array<{
    metric: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    estimatedSavings: number; // ms or score
  }>;
  diagnostics: Array<{
    metric: string;
    value: number;
    threshold: number;
    status: 'good' | 'needs-improvement' | 'poor';
  }>;
}

// ============================================================================
// Polyfill and Fallback Types
// ============================================================================

export interface PerformancePolyfill {
  getEntriesByType(type: string): PerformanceEntry[];
  getEntriesByName(name: string, type?: string): PerformanceEntry[];
  mark(name: string): void;
  measure(name: string, start?: string, end?: string): void;
  now(): number;
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
}

export interface WebVitalsPolyfill {
  getCLS(callback: (metric: WebVitalMetric) => void): void;
  getFCP(callback: (metric: WebVitalMetric) => void): void;
  getFID(callback: (metric: WebVitalMetric) => void): void;
  getLCP(callback: (metric: WebVitalMetric) => void): void;
  getTTFB(callback: (metric: WebVitalMetric) => void): void;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface PerformanceCollectionError {
  type: 'observer_error' | 'metric_calculation_error' | 'unsupported_feature';
  message: string;
  metric?: string;
  originalError?: Error;
  timestamp: number;
}

export interface PerformanceCollectionResult {
  success: boolean;
  data?: CollectedPerformanceData;
  errors: PerformanceCollectionError[];
  warnings: string[];
  capabilities: BrowserCapabilities;
}

// ============================================================================
// Utility Types
// ============================================================================

export type PerformanceMetricName = keyof CollectedPerformanceData['webVitals'];

export type PerformanceThresholdMap = {
  [K in PerformanceMetricName]: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
};

export interface PerformanceContext {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  connection?: {
    effectiveType: string;
    downlink: number;
  };
  deviceMemory?: number;
  hardwareConcurrency?: number;
  platform: string;
}

// ============================================================================
// Export Default Configuration
// ============================================================================

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceCollectionConfig = {
  enabled: true,
  collectWebVitals: true,
  collectResourceTiming: true,
  collectLongTasks: true,
  collectLayoutShifts: true,
  maxEntries: {
    resources: 100,
    marks: 50,
    measures: 50,
    longTasks: 20,
  },
  thresholds: {
    longTaskDuration: 50, // ms
    largeLayoutShiftValue: 0.1, // CLS
    slowResourceThreshold: 1000, // ms
  },
};

export const WEB_VITALS_THRESHOLDS: PerformanceThresholdMap = {
  fcp: { good: 1000, needsImprovement: 3000, poor: Infinity },
  lcp: { good: 2500, needsImprovement: 4000, poor: Infinity },
  cls: { good: 0.1, needsImprovement: 0.25, poor: Infinity },
  fid: { good: 100, needsImprovement: 300, poor: Infinity },
  tti: { good: 3800, needsImprovement: 7300, poor: Infinity },
  ttfb: { good: 600, needsImprovement: 1600, poor: Infinity },
};