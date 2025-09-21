// Performance Utilities - Core Web Vitals Analysis and Categorization
// Provides threshold calculations, performance scoring, and categorization logic

import { WEB_VITALS_THRESHOLDS, type PerformanceThresholdMap } from '../types/performance';
import type {
  WebVitals,
  PerformanceMetrics,
  PerformanceAnalysis,
  CollectedPerformanceData,
  PerformanceContext
} from '../types/performance';

// ============================================================================
// Performance Categorization
// ============================================================================

export type PerformanceCategory = 'critical' | 'high' | 'medium' | 'low';
export type MetricStatus = 'good' | 'needs-improvement' | 'poor';

/**
 * Categorizes overall performance based on Core Web Vitals
 * Uses industry-standard thresholds with weighted scoring
 */
export function categorizePerformance(webVitals: WebVitals): {
  overall: PerformanceCategory;
  details: string;
  scores: Record<keyof WebVitals, MetricStatus>;
} {
  const scores: Record<keyof WebVitals, MetricStatus> = {} as any;
  const weights = {
    lcp: 0.25,  // Largest Contentful Paint - Loading performance
    fcp: 0.15,  // First Contentful Paint - Initial rendering
    cls: 0.25,  // Cumulative Layout Shift - Visual stability
    fid: 0.20,  // First Input Delay - Interactivity
    tti: 0.10,  // Time to Interactive - Full interactivity
    ttfb: 0.05  // Time to First Byte - Server response
  };

  let weightedScore = 0;
  let totalWeight = 0;

  // Calculate individual metric scores
  Object.entries(webVitals).forEach(([metric, value]) => {
    if (value !== undefined && value !== null) {
      const thresholds = WEB_VITALS_THRESHOLDS[metric as keyof WebVitals];
      if (thresholds) {
        const status = getMetricStatus(value, thresholds);
        scores[metric as keyof WebVitals] = status;

        // Convert status to numeric score (0-100)
        const numericScore = status === 'good' ? 90 : status === 'needs-improvement' ? 50 : 10;
        const weight = weights[metric as keyof typeof weights] || 0;

        weightedScore += numericScore * weight;
        totalWeight += weight;
      }
    }
  });

  // Calculate overall category
  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  let overall: PerformanceCategory;
  let details: string;

  if (finalScore >= 80) {
    overall = 'low';
    details = 'Excellent performance across all Core Web Vitals metrics';
  } else if (finalScore >= 60) {
    overall = 'medium';
    details = 'Good performance with some metrics needing minor improvements';
  } else if (finalScore >= 40) {
    overall = 'high';
    details = 'Performance issues detected that impact user experience';
  } else {
    overall = 'critical';
    details = 'Significant performance problems requiring immediate attention';
  }

  return { overall, details, scores };
}

/**
 * Determines metric status based on threshold values
 */
export function getMetricStatus(
  value: number,
  thresholds: { good: number; needsImprovement: number; poor: number }
): MetricStatus {
  if (value <= thresholds.good) {
    return 'good';
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

// ============================================================================
// Performance Analysis
// ============================================================================

/**
 * Generates comprehensive performance analysis with recommendations
 */
export function analyzePerformance(
  data: CollectedPerformanceData,
  context?: PerformanceContext
): PerformanceAnalysis {
  const { webVitals } = data;
  const categorization = categorizePerformance(webVitals);

  // Calculate individual metric scores (0-100)
  const metricScores = {
    fcp: calculateMetricScore(webVitals.fcp, WEB_VITALS_THRESHOLDS.fcp),
    lcp: calculateMetricScore(webVitals.lcp, WEB_VITALS_THRESHOLDS.lcp),
    cls: calculateMetricScore(webVitals.cls, WEB_VITALS_THRESHOLDS.cls),
    fid: calculateMetricScore(webVitals.fid, WEB_VITALS_THRESHOLDS.fid),
    tti: calculateMetricScore(webVitals.tti, WEB_VITALS_THRESHOLDS.tti)
  };

  // Calculate category scores
  const categoryScores = {
    loading: Math.round((metricScores.fcp + metricScores.lcp) / 2),
    interactivity: Math.round((metricScores.fid + metricScores.tti) / 2),
    visual_stability: metricScores.cls
  };

  // Overall score (weighted average)
  const overall = Math.round(
    (metricScores.lcp * 0.25) +
    (metricScores.fcp * 0.15) +
    (metricScores.cls * 0.25) +
    (metricScores.fid * 0.20) +
    (metricScores.tti * 0.15)
  );

  // Generate opportunities for improvement
  const opportunities = generateOptimizationOpportunities(webVitals, data, context);

  // Generate diagnostic information
  const diagnostics = generateDiagnostics(webVitals, data);

  return {
    score: {
      overall,
      fcp: metricScores.fcp,
      lcp: metricScores.lcp,
      cls: metricScores.cls,
      fid: metricScores.fid,
      tti: metricScores.tti
    },
    categoryScores,
    opportunities,
    diagnostics
  };
}

/**
 * Calculates 0-100 score for individual metric
 */
function calculateMetricScore(
  value: number | undefined,
  thresholds: { good: number; needsImprovement: number; poor: number }
): number {
  if (value === undefined || value === null) return 0;

  if (value <= thresholds.good) {
    // Linear scale from 90-100 in good range
    const ratio = value / thresholds.good;
    return Math.round(100 - (ratio * 10));
  } else if (value <= thresholds.needsImprovement) {
    // Linear scale from 50-89 in needs improvement range
    const range = thresholds.needsImprovement - thresholds.good;
    const position = value - thresholds.good;
    const ratio = position / range;
    return Math.round(89 - (ratio * 39));
  } else {
    // Linear scale from 0-49 in poor range
    const maxPoor = thresholds.needsImprovement * 2; // Cap poor range
    const cappedValue = Math.min(value, maxPoor);
    const range = maxPoor - thresholds.needsImprovement;
    const position = cappedValue - thresholds.needsImprovement;
    const ratio = position / range;
    return Math.round(49 - (ratio * 49));
  }
}

// ============================================================================
// Optimization Recommendations
// ============================================================================

/**
 * Generates specific optimization opportunities based on performance data
 */
function generateOptimizationOpportunities(
  webVitals: WebVitals,
  data: CollectedPerformanceData,
  context?: PerformanceContext
): PerformanceAnalysis['opportunities'] {
  const opportunities: PerformanceAnalysis['opportunities'] = [];

  // LCP Optimization
  if (webVitals.lcp && webVitals.lcp > WEB_VITALS_THRESHOLDS.lcp.good) {
    const impact = webVitals.lcp > WEB_VITALS_THRESHOLDS.lcp.needsImprovement ? 'high' : 'medium';
    const estimatedSavings = Math.round(webVitals.lcp - WEB_VITALS_THRESHOLDS.lcp.good);

    opportunities.push({
      metric: 'lcp',
      impact,
      description: 'Optimize Largest Contentful Paint by improving image loading, reducing server response times, or eliminating render-blocking resources',
      estimatedSavings
    });
  }

  // FCP Optimization
  if (webVitals.fcp && webVitals.fcp > WEB_VITALS_THRESHOLDS.fcp.good) {
    const impact = webVitals.fcp > WEB_VITALS_THRESHOLDS.fcp.needsImprovement ? 'high' : 'medium';
    const estimatedSavings = Math.round(webVitals.fcp - WEB_VITALS_THRESHOLDS.fcp.good);

    opportunities.push({
      metric: 'fcp',
      impact,
      description: 'Improve First Contentful Paint by optimizing critical rendering path, reducing font load times, or minimizing JavaScript execution',
      estimatedSavings
    });
  }

  // CLS Optimization
  if (webVitals.cls && webVitals.cls > WEB_VITALS_THRESHOLDS.cls.good) {
    const impact = webVitals.cls > WEB_VITALS_THRESHOLDS.cls.needsImprovement ? 'high' : 'medium';
    const estimatedSavings = Math.round((webVitals.cls - WEB_VITALS_THRESHOLDS.cls.good) * 100) / 100;

    opportunities.push({
      metric: 'cls',
      impact,
      description: 'Reduce Cumulative Layout Shift by setting explicit dimensions for images and ads, preloading fonts, and avoiding dynamic content insertion',
      estimatedSavings
    });
  }

  // FID Optimization
  if (webVitals.fid && webVitals.fid > WEB_VITALS_THRESHOLDS.fid.good) {
    const impact = webVitals.fid > WEB_VITALS_THRESHOLDS.fid.needsImprovement ? 'high' : 'medium';
    const estimatedSavings = Math.round(webVitals.fid - WEB_VITALS_THRESHOLDS.fid.good);

    opportunities.push({
      metric: 'fid',
      impact,
      description: 'Improve First Input Delay by reducing JavaScript execution time, breaking up long tasks, and using web workers for heavy computations',
      estimatedSavings
    });
  }

  // TTI Optimization
  if (webVitals.tti && webVitals.tti > WEB_VITALS_THRESHOLDS.tti.good) {
    const impact = webVitals.tti > WEB_VITALS_THRESHOLDS.tti.needsImprovement ? 'high' : 'medium';
    const estimatedSavings = Math.round(webVitals.tti - WEB_VITALS_THRESHOLDS.tti.good);

    opportunities.push({
      metric: 'tti',
      impact,
      description: 'Optimize Time to Interactive by reducing main thread work, eliminating unused JavaScript, and deferring non-critical resources',
      estimatedSavings
    });
  }

  // Long Tasks Analysis
  if (data.longTasks && data.longTasks.length > 0) {
    const avgTaskDuration = data.longTasks.reduce((sum, task) => sum + task.duration, 0) / data.longTasks.length;
    if (avgTaskDuration > 50) {
      opportunities.push({
        metric: 'longtask',
        impact: avgTaskDuration > 100 ? 'high' : 'medium',
        description: 'Break up long tasks to improve main thread responsiveness and reduce input delay',
        estimatedSavings: Math.round(avgTaskDuration - 50)
      });
    }
  }

  // Resource Timing Analysis
  if (data.resources && data.resources.length > 0) {
    const slowResources = data.resources.filter(resource => resource.duration > 1000);
    if (slowResources.length > 0) {
      opportunities.push({
        metric: 'resource',
        impact: 'medium',
        description: `Optimize ${slowResources.length} slow-loading resources by compressing files, using CDN, or implementing lazy loading`,
        estimatedSavings: Math.round(slowResources.reduce((sum, r) => sum + r.duration, 0) / slowResources.length - 500)
      });
    }
  }

  return opportunities.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
}

/**
 * Generates diagnostic information for performance debugging
 */
function generateDiagnostics(
  webVitals: WebVitals,
  data: CollectedPerformanceData
): PerformanceAnalysis['diagnostics'] {
  const diagnostics: PerformanceAnalysis['diagnostics'] = [];

  // Core Web Vitals diagnostics
  Object.entries(webVitals).forEach(([metric, value]) => {
    if (value !== undefined && value !== null) {
      const thresholds = WEB_VITALS_THRESHOLDS[metric as keyof WebVitals];
      if (thresholds) {
        const status = getMetricStatus(value, thresholds);
        diagnostics.push({
          metric,
          value,
          threshold: status === 'good' ? thresholds.good : thresholds.needsImprovement,
          status
        });
      }
    }
  });

  // Memory diagnostics
  if (data.memory) {
    const memoryUsageRatio = data.memory.usedJSHeapSize / data.memory.totalJSHeapSize;
    diagnostics.push({
      metric: 'memory_usage',
      value: Math.round(memoryUsageRatio * 100),
      threshold: 80,
      status: memoryUsageRatio > 0.9 ? 'poor' : memoryUsageRatio > 0.8 ? 'needs-improvement' : 'good'
    });
  }

  // Connection diagnostics
  if (data.connection) {
    const connectionScore = getConnectionScore(data.connection.effectiveType);
    diagnostics.push({
      metric: 'connection_quality',
      value: connectionScore,
      threshold: 70,
      status: connectionScore < 50 ? 'poor' : connectionScore < 70 ? 'needs-improvement' : 'good'
    });
  }

  return diagnostics;
}

/**
 * Converts connection type to numeric score
 */
function getConnectionScore(effectiveType: string): number {
  const scores: Record<string, number> = {
    '4g': 100,
    '3g': 70,
    '2g': 40,
    'slow-2g': 20
  };
  return scores[effectiveType] || 50;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats performance metric values for display
 */
export function formatMetricValue(metric: keyof WebVitals, value: number): string {
  switch (metric) {
    case 'cls':
      return value.toFixed(3);
    case 'fcp':
    case 'lcp':
    case 'fid':
    case 'tti':
    case 'ttfb':
      return `${Math.round(value)}ms`;
    default:
      return value.toString();
  }
}

/**
 * Gets metric display name
 */
export function getMetricDisplayName(metric: keyof WebVitals): string {
  const names: Record<keyof WebVitals, string> = {
    fcp: 'First Contentful Paint',
    lcp: 'Largest Contentful Paint',
    cls: 'Cumulative Layout Shift',
    fid: 'First Input Delay',
    tti: 'Time to Interactive',
    ttfb: 'Time to First Byte'
  };
  return names[metric] || metric.toUpperCase();
}

/**
 * Gets color code for metric status
 */
export function getMetricColor(status: MetricStatus): string {
  const colors = {
    good: '#0cce6b',      // Green
    'needs-improvement': '#ffa400', // Orange
    poor: '#ff4e42'       // Red
  };
  return colors[status];
}

/**
 * Gets Tailwind CSS classes for metric status
 */
export function getMetricTailwindClasses(status: MetricStatus): string {
  const classes = {
    good: 'text-green-600 bg-green-50 border-green-200',
    'needs-improvement': 'text-orange-600 bg-orange-50 border-orange-200',
    poor: 'text-red-600 bg-red-50 border-red-200'
  };
  return classes[status];
}

/**
 * Calculates performance score from 0-100
 */
export function calculateOverallScore(webVitals: WebVitals): number {
  const categorization = categorizePerformance(webVitals);
  const categoryScores = {
    critical: 10,
    high: 35,
    medium: 65,
    low: 90
  };
  return categoryScores[categorization.overall];
}

/**
 * Determines if performance data is significant enough for analysis
 */
export function hasSignificantData(data: CollectedPerformanceData): boolean {
  const { webVitals } = data;
  const hasMinimalMetrics = (webVitals.lcp !== undefined && webVitals.lcp > 0) ||
                          (webVitals.fcp !== undefined && webVitals.fcp > 0) ||
                          (webVitals.cls !== undefined && webVitals.cls >= 0);

  return hasMinimalMetrics && data.collectionTimestamp > 0;
}

/**
 * Gets performance recommendations based on Web Vitals data
 */
export function getPerformanceRecommendations(webVitals: WebVitals): string[] {
  const recommendations: string[] = [];

  // LCP recommendations
  if (webVitals.lcp && webVitals.lcp > WEB_VITALS_THRESHOLDS.lcp.good) {
    recommendations.push('Optimize Largest Contentful Paint by improving image loading and reducing server response times');
  }

  // FCP recommendations
  if (webVitals.fcp && webVitals.fcp > WEB_VITALS_THRESHOLDS.fcp.good) {
    recommendations.push('Improve First Contentful Paint by optimizing critical rendering path and minimizing JavaScript execution');
  }

  // CLS recommendations
  if (webVitals.cls && webVitals.cls > WEB_VITALS_THRESHOLDS.cls.good) {
    recommendations.push('Reduce Cumulative Layout Shift by setting explicit dimensions for images and avoiding dynamic content insertion');
  }

  // FID recommendations
  if (webVitals.fid && webVitals.fid > WEB_VITALS_THRESHOLDS.fid.good) {
    recommendations.push('Improve First Input Delay by reducing JavaScript execution time and breaking up long tasks');
  }

  // TTI recommendations
  if (webVitals.tti && webVitals.tti > WEB_VITALS_THRESHOLDS.tti.good) {
    recommendations.push('Optimize Time to Interactive by reducing main thread work and eliminating unused JavaScript');
  }

  return recommendations;
}