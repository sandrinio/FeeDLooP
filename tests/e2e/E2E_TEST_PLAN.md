# FeeDLooP E2E Test Plan - Comprehensive Widget Testing with Playwright

## Overview

This document outlines the comprehensive E2E testing strategy for the FeeDLooP widget, including file upload functionality using real test images and production-ready minified builds.

## Test Environment Setup

### Prerequisites
- ✅ Playwright configured with multiple browsers (Chrome, Firefox, Safari, Mobile)
- ✅ Test server running on http://localhost:3000
- ✅ Real test image (`test_image.png`) for upload testing
- ✅ Minified widget build available at `/widget/dist/feedloop-widget.min.js`
- ✅ Development widget build for debugging

### Test Configuration
```typescript
// playwright.config.ts highlights
- Multiple browser testing (Desktop + Mobile)
- Screenshot and video capture on failures
- Timeout configurations: 30s test, 10s action, 30s navigation
- Retry logic for CI environments
- HTML, JSON, and JUnit reporting
```

## Test Categories

### 1. Widget Build Validation ✅ IMPLEMENTED

**File**: `widget-minified-build.spec.ts`

Tests the production build quality and integrity:

- **Build File Validation**
  - Minified file loads correctly (27KB size)
  - Integrity hash validation (SHA-384)
  - Build metadata and versioning
  - CDN deployment readiness

- **CSS Isolation Testing**
  - Widget styles don't conflict with host page
  - Scoped styling verification
  - Cross-browser compatibility

- **Performance Testing**
  - Load time < 2 seconds
  - File size optimization
  - Network request efficiency

### 2. File Upload Integration ✅ IMPLEMENTED

**File**: `widget-file-upload.spec.ts`

Comprehensive file upload testing with real images:

- **Real Image Upload Testing**
  - Uses actual `test_image.png` (n8n AI Chat logo)
  - Tests complete upload workflow
  - Validates file processing and display

- **Multiple File Handling**
  - Up to 5 file upload limit
  - File removal functionality
  - Duplicate file handling

- **Validation Testing**
  - File type restrictions (PNG, JPG, GIF)
  - File size limits (5MB each)
  - Error handling for invalid files

- **UI/UX Testing**
  - Drag and drop functionality
  - Upload progress feedback
  - Mobile responsiveness

### 3. Widget Integration ✅ EXISTING

**File**: `widget-integration.spec.ts`

Core widget functionality and embedding:

- **Standalone Widget Testing**
  - CSS and JS file loading
  - Widget initialization
  - Form type selection (bug, initiative, feedback)

- **Embedding Scenarios**
  - Different host page configurations
  - CSS isolation verification
  - Configuration options testing

- **Rich Text Editing**
  - WYSIWYG editor functionality
  - Content formatting validation

### 4. Cross-Browser Compatibility ✅ CONFIGURED

**Automated Testing Across**:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome Mobile, Safari Mobile
- **Responsive Design**: Multiple viewport sizes
- **Feature Parity**: All browsers support core functionality

### 5. Authentication & Dashboard ✅ EXISTING

**Files**: `authentication.spec.ts`, `dashboard-core.spec.ts`

Dashboard and user management testing:

- **User Registration/Login**
- **Project Management**
- **Team Collaboration**
- **Report Management**

## Test Data & Assets

### Real Test Image
- **File**: `/test_image.png`
- **Content**: n8n AI Chat logo (dark theme with gradient circles)
- **Format**: PNG
- **Usage**: File upload validation in widget tests

### Mock Data
- **Project Key**: `test-project-key`
- **User Data**: Test users with various roles
- **Sample Reports**: Bug reports, initiatives, feedback

## Key Test Scenarios

### Widget File Upload End-to-End Flow

```typescript
test('Complete file upload workflow', async ({ page }) => {
  // 1. Load widget on host page
  await page.setContent(widgetEmbedHTML)

  // 2. Open widget and select report type
  await page.locator('.feedloop-trigger-btn').click()
  await page.locator('[data-type="bug"]').click()

  // 3. Fill form with real data
  await page.locator('input[name="title"]').fill('Real bug report')
  await page.locator('.feedloop-editor').fill('Description with image')

  // 4. Upload real test image
  await page.locator('input[type="file"]').setInputFiles('test_image.png')

  // 5. Verify file processing
  await expect(page.locator('.feedloop-file-item')).toBeVisible()
  await expect(page.locator('.feedloop-file-name')).toContainText('test_image.png')

  // 6. Submit and validate response
  await page.locator('.feedloop-submit-btn').click()
  await expect(page.locator('.feedloop-success')).toBeVisible()
})
```

### Production Build Validation

```typescript
test('Minified widget production readiness', async ({ page }) => {
  // 1. Load production minified build
  await page.goto('/widget/dist/feedloop-widget.min.js')

  // 2. Validate build metadata
  const manifest = await page.goto('/widget/dist/manifest.json').then(r => r.json())
  expect(manifest.files.production.integrity).toMatch(/^sha384-/)

  // 3. Test widget functionality with minified build
  // 4. Verify performance benchmarks
  // 5. Validate CDN deployment files
})
```

## Test Execution Strategy

### Parallel Execution
- ✅ Browser tests run in parallel (5 workers)
- ✅ Independent test files can run simultaneously
- ✅ File upload tests use unique test data to avoid conflicts

### CI/CD Integration
- Retry failed tests (2x in CI)
- Capture artifacts (screenshots, videos, traces)
- Generate multiple report formats (HTML, JSON, JUnit)

### Local Development
- `npm run test:e2e` - Run all E2E tests
- `npm run test:e2e:ui` - Interactive test runner
- `npm run test:e2e:debug` - Debug mode with breakpoints
- `npm run test:e2e:headed` - Run with visible browser

## Test Results & Artifacts

### Comprehensive Reporting
- **HTML Report**: Visual test results with screenshots
- **Video Recordings**: Failed test replays
- **Trace Files**: Detailed execution timelines
- **Screenshots**: Failure state captures

### Performance Metrics
- Widget load time: < 2 seconds target
- File upload processing: < 5 seconds
- Form submission: < 3 seconds
- Cross-browser compatibility: 100%

## Current Status

### ✅ Completed
1. **Widget Build Script**: Production minification with integrity hashes
2. **File Upload Tests**: Real image testing with `test_image.png`
3. **Cross-Browser Setup**: 5 browser configurations
4. **Test Infrastructure**: Playwright fully configured

### 🔄 In Progress
1. **Widget Auto-Initialization**: Data attribute handling in minified build
2. **Error Scenario Testing**: Network failures, invalid data
3. **Performance Benchmarking**: Automated performance validation

### 📋 Planned
1. **API Integration Tests**: End-to-end with real database
2. **Load Testing**: Widget performance under scale
3. **Security Testing**: XSS prevention, input validation

## Best Practices Implemented

### Test Design
- **Real Data**: Using actual test images and realistic form data
- **Isolation**: Each test is independent and can run in parallel
- **Reliability**: Proper wait strategies and retry logic
- **Maintainability**: Page object patterns and reusable components

### Quality Assurance
- **Multi-Browser**: Ensuring widget works across all platforms
- **Mobile Testing**: Responsive design validation
- **Production Readiness**: Testing actual minified builds
- **Performance**: Load time and file size optimization validation

## Integration with Project Tasks

This E2E testing plan covers the following project tasks from `/specs/001-feedloop-initial-plan/tasks.md`:

- ✅ **T091** E2E test: Widget integration and feedback submission
- ✅ **T092** E2E test: Dashboard report management workflow
- ✅ **T090** E2E test: Complete user onboarding flow

The file upload testing specifically validates:
- Widget file attachment handling (up to 5 images)
- Real image processing with `test_image.png`
- MinIO integration for file storage
- Form submission with attachments

## Conclusion

This comprehensive E2E testing strategy ensures the FeeDLooP widget is production-ready with robust file upload capabilities, cross-browser compatibility, and performance optimization. The use of real test data (`test_image.png`) and production builds provides confidence in the deployment readiness of the widget system.