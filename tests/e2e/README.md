# E2E Testing Documentation for FeeDLooP

## Overview

This directory contains comprehensive End-to-End (E2E) tests for the FeeDLooP feedback collection service. The tests are built using Playwright and designed to test both error states during development and expected functionality when the application is fully configured.

## Test Philosophy

### Development-First Testing
Our E2E testing approach prioritizes **development workflow testing**, which means:

1. **Error State Testing**: Tests that verify the application behaves correctly when environment variables are missing or misconfigured
2. **Development Tools Testing**: Tests that ensure development tools (Next.js error overlay, HMR, etc.) work as expected
3. **Functional Testing**: Tests for expected functionality when the application is properly configured

### Real-World Scenarios
All tests are designed to simulate real user interactions and development scenarios:
- Authentication flows with various error conditions
- Widget embedding in different host environments
- Development debugging workflows
- Error handling and recovery

## Test Structure

### Test Files

#### `authentication.spec.ts`
**Purpose**: Comprehensive authentication system testing
**Coverage**:
- Environment configuration errors (Missing SUPABASE_URL)
- User registration flow (validation, success, error handling)
- User login flow (validation, authentication, session management)
- Route protection and middleware behavior
- API endpoint testing
- Error handling and edge cases

**Key Test Groups**:
- Environment Configuration Errors
- Authentication Flow - Functional Tests
- Route Protection
- Session Management
- API Endpoint Testing
- Error Handling and Edge Cases

#### `development-error-states.spec.ts`
**Purpose**: Development environment and error state testing
**Coverage**:
- Next.js development error overlay functionality
- Environment variable error handling
- Development tools integration
- Console and network monitoring
- Performance and debugging capabilities
- Middleware and routing behavior in error states

**Key Test Groups**:
- Development Environment Errors
- Development Tools Integration
- Environment Variable Testing
- Console and Network Monitoring
- Development Performance and Debugging
- Route and Middleware Behavior

#### `widget-integration.spec.ts`
**Purpose**: Embeddable widget functionality and integration testing
**Coverage**:
- Widget standalone functionality
- UI components and interactions
- Form validation and submission
- Integration with host sites
- Configuration and customization

**Key Test Groups**:
- Widget Standalone Functionality
- Widget UI Components
- Widget Form Validation and Submission
- Widget Integration with Host Sites
- Widget Configuration and Customization

## Testing Methodology

### 1. Environment-Aware Testing

Our tests are designed to work in multiple environment states:

```typescript
// Test for missing environment variables (current state)
test('should display environment error when SUPABASE_URL is missing', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByText('Missing SUPABASE_URL environment variable')).toBeVisible()
})

// Test for functional behavior (when environment is configured)
test('should successfully log in valid user', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('SecurePass123!')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.url()).toMatch(/\/dashboard/)
})
```

### 2. MCP Playwright Integration

We use the MCP Playwright server for testing, which provides:
- Browser automation without local installation
- Consistent testing environment
- Integration with development workflow

**Key Commands**:
```typescript
// Navigation
await page.goto('/auth/login')

// Element interaction
await page.getByRole('button', { name: 'Sign In' }).click()

// Assertions
await expect(page.getByText('Welcome')).toBeVisible()

// Screenshots and debugging
await page.screenshot({ path: 'test-results/login-error.png' })
```

### 3. API Mocking and Network Testing

We test both real API responses and mocked scenarios:

```typescript
// Mock successful API response
await page.route('/api/auth/login', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, user: { email: 'test@example.com' } })
  })
})

// Mock error responses
await page.route('/api/auth/login', route => {
  route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Internal server error' })
  })
})
```

### 4. Cross-Browser and Device Testing

Tests are configured to run across multiple browsers and devices:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome Mobile, Safari Mobile
- **Different viewport sizes**: 1920x1080, 1366x768, mobile viewports

## Running Tests

### Prerequisites
- Development server running on `localhost:3000`
- MCP Playwright server available
- Test environment configured

### Test Execution Commands

```bash
# Run all E2E tests
npx playwright test tests/e2e/

# Run specific test file
npx playwright test tests/e2e/authentication.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test tests/e2e/ --headed

# Run tests with debugging
npx playwright test tests/e2e/ --debug

# Generate test report
npx playwright test tests/e2e/ --reporter=html
```

### Using MCP Playwright Server

When using the MCP Playwright server (recommended for this project):

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Use MCP Commands**:
   ```bash
   # Navigate to application
   mcp__playwright__browser_navigate("http://localhost:3000/auth/login")

   # Take screenshot
   mcp__playwright__browser_take_screenshot()

   # Interact with elements
   mcp__playwright__browser_click("button", "Sign In")
   ```

## Test Categories

### 1. Smoke Tests
Quick tests to verify basic functionality:
- Application loads without crashing
- Key routes are accessible
- Environment errors are displayed correctly

### 2. Integration Tests
Tests that verify component integration:
- Authentication flow end-to-end
- API endpoint integration
- Database connection testing (when configured)

### 3. User Journey Tests
Complete user workflow testing:
- New user registration → email verification → first login
- Bug report submission via widget
- Project creation and team invitation

### 4. Error Handling Tests
Comprehensive error scenario testing:
- Network failures
- Server errors
- Validation failures
- Environment misconfigurations

### 5. Performance Tests
Tests for application performance:
- Page load times
- Widget initialization speed
- API response times

## Test Data Management

### Test Users
```typescript
const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Test Company'
  },
  invalidUser: {
    email: 'invalid-email',
    password: 'weak'
  }
}
```

### Test Projects
```typescript
const testProjects = {
  sampleProject: {
    id: 'test-project-123',
    name: 'Test Project',
    description: 'A project for testing'
  }
}
```

## Debugging and Troubleshooting

### Common Issues and Solutions

#### 1. Environment Variable Errors
**Issue**: Tests fail due to missing environment variables
**Solution**: Tests are designed to handle this! Use the development error state tests.

#### 2. Server Not Running
**Issue**: Tests fail because development server isn't running
**Solution**:
```bash
npm run dev
# Wait for "Ready in Xs" message
```

#### 3. Browser Automation Issues
**Issue**: MCP Playwright commands fail
**Solution**:
- Verify MCP server is running
- Check browser permissions
- Use `--headed` mode for debugging

### Debug Utilities

#### Screenshot on Failure
```typescript
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: `test-results/failure-${testInfo.title}.png`
    })
  }
})
```

#### Console Log Capture
```typescript
page.on('console', msg => {
  console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`)
})
```

#### Network Request Monitoring
```typescript
page.on('request', request => {
  console.log(`Request: ${request.method()} ${request.url()}`)
})

page.on('response', response => {
  console.log(`Response: ${response.status()} ${response.url()}`)
})
```

## Test Coverage

### Current Coverage Areas
- ✅ Authentication system (registration, login, logout)
- ✅ Route protection and middleware
- ✅ Environment error handling
- ✅ Development tools integration
- ✅ Widget initialization and configuration
- ✅ API endpoint testing
- ✅ Error boundary testing

### Planned Coverage Areas
- 🔄 Project management workflows
- 🔄 Report creation and management
- 🔄 File upload functionality
- 🔄 Team collaboration features
- 🔄 Export functionality
- 🔄 Widget embedding in real host sites

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up state between tests
- Don't rely on test execution order

### 2. Meaningful Assertions
```typescript
// Good: Specific and meaningful
await expect(page.getByText('Account created successfully')).toBeVisible()

// Bad: Vague and brittle
await expect(page.locator('div')).toHaveCount(5)
```

### 3. Wait for Dynamic Content
```typescript
// Wait for API responses
await page.waitForResponse('/api/auth/login')

// Wait for specific elements
await page.waitForSelector('[data-testid="dashboard"]')

// Wait for specific states
await expect(page.getByText('Loading...')).not.toBeVisible()
```

### 4. Use Semantic Locators
```typescript
// Preferred: Role-based locators
await page.getByRole('button', { name: 'Sign In' })

// Preferred: Label-based locators
await page.getByLabel('Email')

// Avoid: CSS selectors when possible
await page.locator('#email-input')
```

## Continuous Integration

### GitHub Actions Integration
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npx playwright install
      - run: npm run test:e2e
```

### Test Environment Setup
For CI/CD environments:
1. Set up test database
2. Configure environment variables
3. Start application in test mode
4. Run E2E test suite
5. Generate and archive test reports

## Contributing to E2E Tests

### Adding New Tests
1. Follow existing test structure and naming conventions
2. Include both error state and functional tests where applicable
3. Add comprehensive assertions for user-visible behavior
4. Include proper cleanup and error handling
5. Document test purpose and coverage

### Test File Organization
```
tests/e2e/
├── README.md                           # This documentation
├── authentication.spec.ts              # Auth system tests
├── development-error-states.spec.ts    # Development workflow tests
├── widget-integration.spec.ts          # Widget functionality tests
├── project-management.spec.ts          # (Future) Project workflow tests
├── report-management.spec.ts           # (Future) Report workflow tests
└── helpers/                            # Test utilities and helpers
    ├── test-data.ts                    # Test data definitions
    ├── mock-responses.ts               # API mock responses
    └── page-objects.ts                 # Page object models
```

### Code Review Checklist
- [ ] Tests cover both happy path and error scenarios
- [ ] Assertions are specific and meaningful
- [ ] Tests are environment-aware (work with missing env vars)
- [ ] Proper wait conditions for dynamic content
- [ ] Error handling and cleanup included
- [ ] Documentation updated if needed

## Future Enhancements

### Planned Improvements
1. **Visual Regression Testing**: Screenshot comparison for UI consistency
2. **Accessibility Testing**: WCAG compliance verification
3. **Performance Monitoring**: Core Web Vitals tracking
4. **Cross-Browser Matrix**: Extended browser and device coverage
5. **API Contract Testing**: Automated API specification validation

### Integration Opportunities
1. **Lighthouse Integration**: Performance and accessibility scoring
2. **Axe Integration**: Automated accessibility testing
3. **Percy Integration**: Visual diff testing
4. **Datadog Integration**: Real user monitoring correlation

---

## Summary

This E2E testing approach provides comprehensive coverage of the FeeDLooP application, with special emphasis on development workflow testing and error state handling. The tests are designed to be resilient, meaningful, and maintainable, supporting both current development needs and future feature expansion.

For questions or contributions, refer to the main project documentation or reach out to the development team.