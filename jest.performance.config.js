/**
 * Jest Configuration for Performance Tests
 */

module.exports = {
  displayName: 'Performance Tests',
  testMatch: ['**/tests/performance/**/*.test.js'],
  testEnvironment: 'node',
  testTimeout: 30000, // 30 seconds for performance tests
  setupFilesAfterEnv: ['<rootDir>/tests/performance/setup.js'],
  verbose: true,
  collectCoverage: false, // Disable coverage for performance tests
  maxWorkers: 1, // Run performance tests sequentially
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './performance-reports',
      outputName: 'performance-test-results.xml'
    }]
  ]
};