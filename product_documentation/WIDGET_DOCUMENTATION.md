# FeeDLooP Widget Documentation

## Overview

The FeeDLooP widget is an embeddable JavaScript component that provides a feedback collection interface for websites. It allows users to submit bug reports, feature requests (initiatives), and general feedback with rich text editing, file attachments, and automatic diagnostic data collection.

## ✅ Current Implementation Status

**Working Features:**
- ✅ Complete widget UI with floating trigger button
- ✅ Rich text editor with formatting toolbar (Bold, Italic, Lists)
- ✅ File upload interface (drag & drop + click to upload)
- ✅ Form validation (title, description, email)
- ✅ Integration with POST /api/widget/submit endpoint **FULLY WORKING**
- ✅ Working demo at `http://localhost:3000/widget-demo.html`
- ✅ Fixed UI issues: removed "+Add Files" button, updated text, fixed bullet spacing
- ✅ Click and paste functionality for file uploads
- ✅ **Build system with minification and integrity hashes**
- ✅ **Comprehensive debugging logs for troubleshooting**
- ✅ **Field mapping issues resolved (project_key vs projectKey)**
- ✅ **Zod validation schema compatibility fixed**

**Partially Implemented:**
- ⚠️ File attachment upload (UI ready, backend MinIO integration disabled)
- ✅ Diagnostic data collection (console logs and network requests working)

**Demo Project:** `flp_demo12345678901234` (working for testing)
**Build Output:** Production and development builds available in `/widget/dist/`

## Architecture

### Core Files

1. **`/public/widget/feedloop-widget.js`** - Main widget JavaScript source file
2. **`/public/widget/widget.css`** - Scoped CSS styles for the widget
3. **`/public/widget-demo.html`** - Demo page for testing the widget
4. **`/scripts/build-widget.js`** - Build system for minification and packaging
5. **`/public/widget/dist/`** - Built widget files (production & development)
   - `feedloop-widget.min.js` - Minified production build
   - `feedloop-widget.dev.js` - Development build with debugging
   - `manifest.json` - Build metadata and integrity hashes
   - `USAGE.md` - Integration instructions

### Widget Structure

```
FeeDLooP Widget Container
├── Trigger Button (floating button)
└── Main Panel (modal overlay)
    ├── Header (title + minimize/close buttons)
    ├── Content Area
    │   ├── Report Type Selector (Bug/Initiative/Feedback)
    │   ├── Form Fields
    │   │   ├── Title (required)
    │   │   ├── Description with Rich Text Editor (required)
    │   │   ├── Name (optional)
    │   │   ├── Email (optional)
    │   │   └── File Attachments (drag & drop + click)
    │   ├── Auto-diagnostic Notice
    │   └── Action Buttons (Cancel/Submit)
```

## Form Components Breakdown

### 1. Report Type Selector

**Purpose**: Allows users to categorize their feedback
**Types**:
- 🐛 Bug Report
- 💡 Initiative (feature request)
- 💬 Feedback (general)

**Implementation**:
```html
<div class="feedloop-type-selector">
  <button class="feedloop-type-btn" data-type="bug">
    <div class="feedloop-type-icon">🐛</div>
    <div>Bug Report</div>
  </button>
  <!-- Similar structure for Initiative and Feedback -->
</div>
```

**State Management**:
- Selected type stored in `widgetState.selectedType`
- Default: "feedback"
- Changes trigger form field updates

### 2. Title Field

**Purpose**: Brief description of the feedback
**Type**: Required text input
**Validation**:
- Minimum 3 characters
- Maximum 200 characters
- Cannot be empty

**Implementation**:
```html
<div class="feedloop-field">
  <label for="feedloop-title">Title *</label>
  <input
    type="text"
    id="feedloop-title"
    placeholder="Brief description of your feedback"
    maxlength="200"
    required
  />
  <div class="feedloop-field-error"></div>
</div>
```

### 3. Rich Text Description Editor

**Purpose**: Detailed feedback description with formatting options
**Type**: Rich text editor with toolbar
**Features**:
- Bold and italic formatting
- Bullet and numbered lists
- Paste support (including images)
- Minimum height: 120px, Maximum: 250px

**Toolbar Implementation**:
```html
<div class="feedloop-toolbar">
  <button class="feedloop-tool" data-command="bold" title="Bold">
    <strong>B</strong>
  </button>
  <button class="feedloop-tool" data-command="italic" title="Italic">
    <em>I</em>
  </button>
  <button class="feedloop-tool" data-command="insertUnorderedList" title="Bullet List">
    •
  </button>
  <button class="feedloop-tool" data-command="insertOrderedList" title="Numbered List">
    1.
  </button>
</div>
<div
  class="feedloop-editor"
  contenteditable="true"
  data-placeholder="Provide detailed information..."
></div>
```

**Editor Features**:
- `contenteditable="true"` for rich text editing
- `document.execCommand()` for formatting commands
- Custom paste handler for image processing
- Auto-resize with scroll overflow

### 4. Contact Information Fields

**Purpose**: Optional user identification
**Fields**:
- Name (optional, text input)
- Email (optional, email input with validation)

**Implementation**:
```html
<div class="feedloop-field-group">
  <div class="feedloop-field">
    <label for="feedloop-name">Your Name (optional)</label>
    <input type="text" id="feedloop-name" placeholder="John Doe" />
  </div>
  <div class="feedloop-field">
    <label for="feedloop-email">Your Email (optional)</label>
    <input type="email" id="feedloop-email" placeholder="john@example.com" />
  </div>
</div>
```

### 5. File Attachment System

**Purpose**: Allow users to upload files (images, documents)
**Limits**:
- Maximum 5 files
- 10MB per file
- Supported formats: Images (jpg, png, gif, etc.), documents (pdf, txt, etc.)

**Components**:

#### a) Hidden File Input
```html
<input
  type="file"
  id="feedloop-file-input"
  multiple
  accept="image/*,.pdf,.txt,.doc,.docx"
  style="display: none;"
/>
```

#### b) Interactive Drop Zone ✅ IMPLEMENTED
```html
<div class="feedloop-drop-zone">
  <svg width="48" height="48" viewBox="0 0 48 48">
    <!-- Upload icon SVG -->
  </svg>
  <span class="feedloop-drop-text">Drag and drop or click to upload</span>
</div>
```

**Event Handlers**: ✅ WORKING
- **Click**: Opens file picker dialog (fixed in recent update)
- **Drag & Drop**: Handles file drop events
- **File Selection**: Processes selected files and updates UI
- **Paste Support**: Handles image paste from clipboard (implemented with debugging)

#### c) File List Display
```html
<div class="feedloop-file-list">
  <div class="feedloop-file-item">
    <span class="feedloop-file-name">filename.jpg</span>
    <span class="feedloop-file-size">2.5 MB</span>
    <button class="feedloop-file-remove">×</button>
  </div>
</div>
```

**File Processing**:
```javascript
function handleFileSelection(e) {
  const files = Array.from(e.target.files || e.dataTransfer.files);

  files.forEach(file => {
    if (widgetState.attachments.length >= 5) return;
    if (file.size > 10 * 1024 * 1024) return; // 10MB limit

    const fileData = {
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      id: Date.now() + Math.random()
    };

    widgetState.attachments.push(fileData);
  });

  updateFileList();
}
```

### 6. Automatic Diagnostic Data Collection

**Purpose**: Collect browser and environment information for debugging
**Data Collected**:
- Browser information (user agent, version)
- Console logs (last 50 entries)
- Network requests (during session)
- Page URL and timestamp
- Screen resolution and viewport size

**Implementation**:
```javascript
function collectDiagnosticData() {
  return {
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    },
    page: {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer
    },
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    timestamp: new Date().toISOString(),
    consoleLogs: widgetState.diagnosticData.consoleLogs,
    networkRequests: widgetState.diagnosticData.networkRequests
  };
}
```

## State Management

### Widget State Object
```javascript
const widgetState = {
  isOpen: false,
  isMinimized: false,
  selectedType: 'feedback',
  attachments: [],
  diagnosticData: {
    consoleLogs: [],
    networkRequests: []
  }
};
```

### State Persistence
- State is maintained in memory during session
- Form data is preserved when minimizing/reopening
- Attachments are kept until form submission or reset

## CSS Architecture

### Scoping Strategy
All CSS classes are prefixed with `feedloop-` to prevent conflicts with host site styles:

```css
.feedloop-widget-container,
.feedloop-widget-container * {
  /* CSS reset for complete isolation */
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Responsive Design
- Mobile-first approach with breakpoints
- Full-screen modal on mobile devices (< 480px)
- Adaptive grid layouts for form fields

```css
@media (max-width: 480px) {
  .feedloop-panel {
    width: 100%;
    height: 100vh;
    border-radius: 0;
  }

  .feedloop-field-group {
    grid-template-columns: 1fr; /* Stack fields vertically */
  }
}
```

### Key Design Principles
1. **Isolation**: No style inheritance from host site
2. **Accessibility**: Proper focus states and ARIA labels
3. **Performance**: Minimal CSS footprint
4. **Consistency**: Unified design system

## API Integration ✅ WORKING

### Submission Endpoint
**URL**: `${FEEDLOOP_API_BASE}/api/widget/submit`
**Method**: POST
**Content-Type**: multipart/form-data
**Status**: ✅ Fully implemented and working

### Request Structure (Current Working Implementation)
```javascript
const formData = new FormData();
formData.append('project_key', projectKey);    // Required: Project integration key
formData.append('type', widgetState.reportType); // bug|initiative|feedback
formData.append('title', titleValue);
formData.append('description', descriptionHTML);
formData.append('priority', priorityValue || 'medium');
formData.append('reporter_name', nameValue || '');
formData.append('reporter_email', emailValue || '');
formData.append('url', pageUrl);
formData.append('user_agent', userAgent);
formData.append('console_logs', JSON.stringify(consoleLogs));
formData.append('network_requests', JSON.stringify(networkRequests));

// Add file attachments (when MinIO is enabled)
widgetState.attachments.forEach((attachment, index) => {
  formData.append(`attachment_${index}`, attachment.file);
});
```

**Field Mapping Notes:**
- Fixed field name mismatches between widget and API
- Added debugging logs for troubleshooting submission issues
- Enhanced diagnostic data collection with structured console logs and network requests

### Response Handling ✅ IMPLEMENTED
```javascript
if (response.ok) {
  const result = await response.json();
  // Successful response format:
  // {
  //   "success": true,
  //   "message": "Feedback submitted successfully",
  //   "report_id": "uuid",
  //   "attachments_uploaded": 0,
  //   "total_attachments": 0
  // }
  showSuccessMessage('Feedback submitted successfully!');
  resetForm();
  setTimeout(() => closeWidget(), 2000);
} else {
  const error = await response.json();
  showErrorMessage(error.message || 'Submission failed');
}
```

### Working Demo
- **Demo URL**: `http://localhost:3000/widget-demo.html`
- **Demo Project Key**: `flp_demo12345678901234`
- **Test Status**: ✅ Successfully creating reports in database

## Event Handling

### Core Events

1. **Widget Open/Close**
   ```javascript
   function openWidget() {
     widgetState.isOpen = true;
     container.setAttribute('data-state', 'open');
   }

   function closeWidget() {
     widgetState.isOpen = false;
     container.setAttribute('data-state', 'closed');
   }
   ```

2. **Form Submission**
   ```javascript
   form.addEventListener('submit', async (e) => {
     e.preventDefault();
     if (validateForm()) {
       await submitFeedback();
     }
   });
   ```

3. **File Upload Events**
   ```javascript
   // Click to upload
   dropZone.addEventListener('click', () => fileInput.click());

   // Drag and drop
   dropZone.addEventListener('dragover', handleDragOver);
   dropZone.addEventListener('drop', handleDrop);

   // File selection
   fileInput.addEventListener('change', handleFileSelection);
   ```

4. **Rich Text Editor Events**
   ```javascript
   // Formatting commands
   toolbar.addEventListener('click', (e) => {
     if (e.target.dataset.command) {
       document.execCommand(e.target.dataset.command, false, null);
     }
   });

   // Paste handling (including images)
   editor.addEventListener('paste', handlePaste);
   ```

## Form Validation

### Client-Side Validation Rules

1. **Title Field**
   - Required: true
   - Min length: 3 characters
   - Max length: 200 characters

2. **Description Field**
   - Required: true
   - Must contain text content (not just HTML tags)
   - Stripped HTML for length validation

3. **Email Field**
   - Optional but must be valid email format if provided
   - Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

4. **File Attachments**
   - Maximum 5 files
   - 10MB size limit per file
   - File type restrictions

### Validation Implementation
```javascript
function validateForm() {
  const errors = [];

  // Title validation
  const title = document.getElementById('feedloop-title').value.trim();
  if (!title || title.length < 3) {
    errors.push({ field: 'title', message: 'Title must be at least 3 characters' });
  }

  // Description validation
  const description = document.getElementById('feedloop-description').innerText.trim();
  if (!description) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  // Email validation (if provided)
  const email = document.getElementById('feedloop-email').value.trim();
  if (email && !isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  displayValidationErrors(errors);
  return errors.length === 0;
}
```

## Accessibility Features

### Keyboard Navigation
- Tab order follows logical flow
- Enter key submits form
- Escape key closes widget
- Arrow keys navigate rich text editor

### Screen Reader Support
- Proper ARIA labels and roles
- Form field associations with labels
- Error message announcements
- Focus management for modal dialogs

### Visual Accessibility
- High contrast color scheme
- Focus indicators for interactive elements
- Scalable fonts and layouts
- Color-independent information conveyance

## Browser Compatibility

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Progressive Enhancement
- Base functionality works without JavaScript
- Enhanced features degrade gracefully
- Fallback styles for older browsers

### Known Limitations
- Rich text editing requires modern browser support
- File drag & drop needs HTML5 support
- Some CSS features use modern properties with fallbacks

## Deployment ✅ WORKING

### Build System
Build the widget for production or development:

```bash
# Build both production (minified) and development versions
npm run build:widget

# Output files in /public/widget/dist/:
# - feedloop-widget.min.js (production)
# - feedloop-widget.dev.js (development)
# - manifest.json (build metadata)
# - USAGE.md (integration guide)
```

### Installation (Current Implementation)
Add single script tag to host website:

**For Local Development:**
```html
<script>
  // Set API base for local development
  window.FEEDLOOP_API_BASE = window.location.origin;
</script>
<script src="/widget/dist/feedloop-widget.min.js" data-project-key="flp_demo12345678901234"></script>
```

**For Production with Integrity Check:**
```html
<script
  src="https://your-domain.com/widget/dist/feedloop-widget.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
  data-project-key="YOUR_PROJECT_KEY">
</script>
```

### Demo Setup ✅ WORKING
**Demo Page**: `http://localhost:3000/widget-demo.html`
**Demo Project Key**: `flp_demo12345678901234`
**Status**: Fully functional widget with working form submission

### Configuration Options (Planned)
```html
<script
  src="feedloop-widget.js"
  data-project-key="YOUR_PROJECT_KEY"
  data-position="bottom-right"    <!-- bottom-left, top-right, top-left -->
  data-theme="default"            <!-- Future: dark, light themes -->
  data-auto-collect="true"        <!-- Enable/disable auto diagnostics -->
></script>
```

### Environment Variables
- `FEEDLOOP_API_BASE`: API endpoint base URL (configurable via window.FEEDLOOP_API_BASE)
- `NEXT_PUBLIC_APP_URL`: Public app URL for widget embedding

## JavaScript API

### Global Methods
```javascript
// Open widget programmatically
window.FeeDLooPWidget.open();

// Close widget
window.FeeDLooPWidget.close();

// Reset form to initial state
window.FeeDLooPWidget.reset();

// Get current widget state
const state = window.FeeDLooPWidget.getState();

// Check widget version
console.log(window.FeeDLooPWidget.version);
```

### Event Listeners
```javascript
// Widget opened
document.addEventListener('feedloop:widget:opened', (e) => {
  console.log('Widget opened');
});

// Widget closed
document.addEventListener('feedloop:widget:closed', (e) => {
  console.log('Widget closed');
});

// Form submitted
document.addEventListener('feedloop:feedback:submitted', (e) => {
  console.log('Feedback submitted:', e.detail);
});
```

## Security Considerations

### Input Sanitization
- HTML content is sanitized before submission
- File uploads are validated for type and size
- XSS prevention through proper escaping

### CORS Policy
- Configured for cross-origin embedding
- Restricted to allowed domains in production
- Proper headers for file uploads

### Data Privacy
- No tracking or analytics by default
- User data only collected when explicitly submitted
- Optional diagnostic data with user notice

## Performance Optimization

### Loading Strategy
- Async script loading to prevent blocking
- CSS loaded inline to prevent FOUC
- Lazy loading of non-critical features

### Bundle Size
- Minified production build
- Tree-shaking for unused code
- No external dependencies

### Memory Management
- Event listeners properly cleaned up
- File objects released after submission
- State reset prevents memory leaks

## Debugging Features ✅ IMPLEMENTED

### Comprehensive Debug Logging
The widget now includes extensive debugging capabilities for troubleshooting:

```javascript
// Project key extraction debugging
console.log('FeeDLooP Debug: Script tag detection');
console.log('- document.currentScript:', document.currentScript);
console.log('- PROJECT_KEY extracted:', PROJECT_KEY);

// Form submission debugging
console.log('FeeDLooP Debug: gatherFormData called');
console.log('- widgetState.projectKey at form submission:', widgetState.projectKey);
console.log('- Final form data object:', formData);

// API submission debugging
console.log('FeeDLooP Debug: submitFeedback called');
console.log('- FormData entries:', entries);
console.log('- Response status:', response.status);
console.log('- Error response body:', responseText);
```

### Debug Information Available
- Project key extraction process
- Form data gathering and validation
- API request construction
- Response handling and error details
- Widget state management

## Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check project key validity in browser console
   - Verify script URL accessibility
   - Look for JavaScript errors in console
   - Ensure `data-project-key` attribute is present

2. **Form submission failing (Fixed ✅)**
   - ~~Field name mismatches~~ - **RESOLVED**
   - ~~Zod validation errors~~ - **RESOLVED**
   - Check browser console for detailed error logs
   - Verify project key format matches pattern

3. **Styles conflicting with host site**
   - CSS isolation should prevent this
   - Check for !important overrides
   - Verify CSS scoping is working

4. **File upload not working**
   - Check file size limits (10MB per file)
   - Verify file type is supported
   - Check network connectivity

5. **Rich text editor issues**
   - Ensure contenteditable support
   - Check for JavaScript errors
   - Verify paste event handling

### Debug Mode
Debug logging is now enabled by default in development builds. For production debugging:
```javascript
window.FEEDLOOP_DEBUG = true;
```

### Recent Bug Fixes ✅
- **Field Mapping Issue**: Fixed mismatch between widget field names (`project_key`) and API expectations (`projectKey`)
- **Validation Schema**: Updated diagnostic data structure to match Zod schema requirements
- **Error Handling**: Enhanced error reporting with detailed response body logging
- **Project Key Extraction**: Improved reliability of project key detection from script tag

## Future Enhancements

### Planned Features
- Theming system (dark/light modes)
- Custom field configurations
- Advanced file type support
- Real-time collaboration
- Analytics dashboard integration

### API Extensions
- Webhook support for real-time notifications
- Custom validation rules
- Multi-language support
- Advanced diagnostic data collection

---

*This documentation is maintained for both user reference and AI development assistance. Keep it updated with any changes to the widget implementation.*