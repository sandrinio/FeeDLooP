/**
 * Performance Tests Setup
 */

// Global test configuration
global.PERFORMANCE_TIMEOUT = 30000;

// Custom matchers for performance testing
expect.extend({
  toBeFasterThan(received, expected) {
    const pass = received < expected;
    if (pass) {
      return {
        message: () => `Expected ${received}ms not to be faster than ${expected}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be faster than ${expected}ms`,
        pass: false,
      };
    }
  },

  toBeWithinPerformanceBudget(received, budget) {
    const pass = received <= budget;
    if (pass) {
      return {
        message: () => `Expected ${received}ms not to be within performance budget of ${budget}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to be within performance budget of ${budget}ms (exceeded by ${received - budget}ms)`,
        pass: false,
      };
    }
  }
});

// Performance test utilities
global.PerformanceUtils = {
  // Measure function execution time
  measureTime: async (fn) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },

  // Wait for condition with timeout
  waitForCondition: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkCondition = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(checkCondition, 10);
        }
      };
      checkCondition();
    });
  }
};

// Cleanup after all tests
afterAll(() => {
  console.log('Performance tests completed');
});