/**
 * FeeDLooP Widget Core JavaScript
 * T063: Widget core JavaScript with CSS isolation
 * Embeddable feedback collection widget with isolated styling and functionality
 */

(function() {
  'use strict';

  // Widget configuration
  const WIDGET_VERSION = '1.0.0';
  const WIDGET_API_BASE = typeof window !== 'undefined' && window.FEEDLOOP_API_BASE || '';
  const WIDGET_NAMESPACE = 'feedloop-widget';

  // Widget state
  let widgetState = {
    isOpen: false,
    isMinimized: false,
    projectKey: null,
    reportType: 'bug',
    attachments: [],
    formData: {
      title: '',
      description: '',
      reporter_name: '',
      reporter_email: '',
      priority: 'medium'
    }
  };

  // Create isolated style container
  function injectStyles() {
    if (document.getElementById('feedloop-widget-styles')) return;

    const styleSheet = document.createElement('link');
    styleSheet.id = 'feedloop-widget-styles';
    styleSheet.rel = 'stylesheet';
    styleSheet.href = WIDGET_API_BASE + '/widget/widget.css';
    document.head.appendChild(styleSheet);
  }

  // Create widget HTML structure
  function createWidgetHTML() {
    return `
      <div id="${WIDGET_NAMESPACE}" class="feedloop-widget-container" data-state="closed">
        <!-- Floating Button -->
        <button class="feedloop-trigger-btn" aria-label="Open feedback widget">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
          </svg>
          <span class="feedloop-trigger-text">Feedback</span>
        </button>

        <!-- Main Widget Panel -->
        <div class="feedloop-panel">
          <div class="feedloop-header">
            <h3 class="feedloop-title">Send Feedback</h3>
            <div class="feedloop-header-actions">
              <button class="feedloop-minimize-btn" aria-label="Minimize">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M4 8h8" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
              <button class="feedloop-close-btn" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="feedloop-content">
            <!-- Report Type Selector -->
            <div class="feedloop-type-selector">
              <button class="feedloop-type-btn active" data-type="bug">
                <span class="feedloop-type-icon">🐛</span>
                <span>Bug Report</span>
              </button>
              <button class="feedloop-type-btn" data-type="initiative">
                <span class="feedloop-type-icon">💡</span>
                <span>Initiative</span>
              </button>
              <button class="feedloop-type-btn" data-type="feedback">
                <span class="feedloop-type-icon">💬</span>
                <span>Feedback</span>
              </button>
            </div>

            <!-- Form -->
            <form class="feedloop-form">
              <!-- Title -->
              <div class="feedloop-field">
                <label for="feedloop-title">Title *</label>
                <input
                  type="text"
                  id="feedloop-title"
                  name="title"
                  required
                  maxlength="200"
                  placeholder="Brief description of your feedback"
                />
                <span class="feedloop-field-error"></span>
              </div>

              <!-- Description -->
              <div class="feedloop-field">
                <label for="feedloop-description">Description *</label>
                <div class="feedloop-rich-text">
                  <div class="feedloop-toolbar">
                    <button type="button" class="feedloop-tool" data-command="bold" title="Bold">
                      <strong>B</strong>
                    </button>
                    <button type="button" class="feedloop-tool" data-command="italic" title="Italic">
                      <em>I</em>
                    </button>
                    <button type="button" class="feedloop-tool" data-command="insertUnorderedList" title="Bullet List">
                      • List
                    </button>
                    <button type="button" class="feedloop-tool" data-command="insertOrderedList" title="Numbered List">
                      1. List
                    </button>
                  </div>
                  <div
                    contenteditable="true"
                    id="feedloop-description"
                    class="feedloop-editor"
                    data-placeholder="Provide detailed information..."
                  ></div>
                  <span class="feedloop-field-error"></span>
                </div>
              </div>

              <!-- Priority (for bugs) -->
              <div class="feedloop-field feedloop-priority-field" style="display: none;">
                <label for="feedloop-priority">Priority</label>
                <select id="feedloop-priority" name="priority">
                  <option value="low">Low</option>
                  <option value="medium" selected>Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <!-- Contact Information -->
              <div class="feedloop-field-group">
                <div class="feedloop-field">
                  <label for="feedloop-name">Your Name</label>
                  <input
                    type="text"
                    id="feedloop-name"
                    name="reporter_name"
                    maxlength="100"
                    placeholder="John Doe"
                  />
                </div>
                <div class="feedloop-field">
                  <label for="feedloop-email">Your Email</label>
                  <input
                    type="email"
                    id="feedloop-email"
                    name="reporter_email"
                    maxlength="255"
                    placeholder="john@example.com"
                  />
                  <span class="feedloop-field-error"></span>
                </div>
              </div>

              <!-- File Attachments -->
              <div class="feedloop-field">
                <label>Attachments (Max 5 files, 10MB each)</label>
                <div class="feedloop-attachments">
                  <input
                    type="file"
                    id="feedloop-file-input"
                    multiple
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    style="display: none;"
                  />
                  <button type="button" class="feedloop-attach-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <path d="M7 2v6H2v2h5v6h2V10h6V8H9V2H7z" fill="currentColor"/>
                    </svg>
                    Add Files
                  </button>
                  <div class="feedloop-file-list"></div>
                </div>
              </div>

              <!-- Diagnostic Data Notice -->
              <div class="feedloop-notice">
                <small>
                  <strong>Note:</strong> We'll automatically collect browser info and console logs to help diagnose issues.
                </small>
              </div>

              <!-- Submit Buttons -->
              <div class="feedloop-actions">
                <button type="button" class="feedloop-cancel-btn">Cancel</button>
                <button type="submit" class="feedloop-submit-btn">
                  <span class="feedloop-submit-text">Send Feedback</span>
                  <span class="feedloop-loading" style="display: none;">Sending...</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Success/Error Messages -->
          <div class="feedloop-message feedloop-success" style="display: none;">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z" fill="currentColor"/>
            </svg>
            <span>Thank you! Your feedback has been submitted.</span>
          </div>

          <div class="feedloop-message feedloop-error" style="display: none;">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15h-2v-2h2v2zm0-4h-2V5h2v6z" fill="currentColor"/>
            </svg>
            <span class="feedloop-error-text">Something went wrong. Please try again.</span>
          </div>
        </div>
      </div>
    `;
  }

  // Initialize widget
  function initWidget() {
    // Get project key from script tag
    const scriptTag = document.currentScript || document.querySelector('script[data-project-key]');
    if (!scriptTag) {
      console.error('FeeDLooP: No project key found');
      return;
    }

    widgetState.projectKey = scriptTag.getAttribute('data-project-key');
    if (!widgetState.projectKey) {
      console.error('FeeDLooP: Invalid project key');
      return;
    }

    // Inject styles
    injectStyles();

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = createWidgetHTML();
    document.body.appendChild(widgetContainer.firstElementChild);

    // Setup event listeners
    setupEventListeners();

    // Collect diagnostic data
    collectDiagnosticData();
  }

  // Setup all event listeners
  function setupEventListeners() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    if (!widget) return;

    // Trigger button
    widget.querySelector('.feedloop-trigger-btn').addEventListener('click', openWidget);

    // Close button
    widget.querySelector('.feedloop-close-btn').addEventListener('click', closeWidget);

    // Minimize button
    widget.querySelector('.feedloop-minimize-btn').addEventListener('click', toggleMinimize);

    // Cancel button
    widget.querySelector('.feedloop-cancel-btn').addEventListener('click', closeWidget);

    // Report type buttons
    widget.querySelectorAll('.feedloop-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => selectReportType(e.currentTarget));
    });

    // Rich text editor toolbar
    widget.querySelectorAll('.feedloop-tool').forEach(tool => {
      tool.addEventListener('click', (e) => {
        e.preventDefault();
        const command = e.currentTarget.getAttribute('data-command');
        document.execCommand(command, false, null);
        widget.querySelector('.feedloop-editor').focus();
      });
    });

    // File attachment
    const attachBtn = widget.querySelector('.feedloop-attach-btn');
    const fileInput = widget.querySelector('#feedloop-file-input');

    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelection);

    // Form submission
    widget.querySelector('.feedloop-form').addEventListener('submit', handleSubmit);

    // Email validation
    const emailInput = widget.querySelector('#feedloop-email');
    emailInput.addEventListener('blur', validateEmail);
  }

  // Open widget
  function openWidget() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    widget.setAttribute('data-state', 'open');
    widgetState.isOpen = true;
  }

  // Close widget
  function closeWidget() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    widget.setAttribute('data-state', 'closed');
    widgetState.isOpen = false;
    resetForm();
  }

  // Toggle minimize
  function toggleMinimize() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    widgetState.isMinimized = !widgetState.isMinimized;
    widget.setAttribute('data-minimized', widgetState.isMinimized);
  }

  // Select report type
  function selectReportType(button) {
    const widget = document.getElementById(WIDGET_NAMESPACE);

    // Update active state
    widget.querySelectorAll('.feedloop-type-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    // Update state
    widgetState.reportType = button.getAttribute('data-type');

    // Show/hide priority field for bugs
    const priorityField = widget.querySelector('.feedloop-priority-field');
    priorityField.style.display = widgetState.reportType === 'bug' ? 'block' : 'none';
  }

  // Handle file selection
  function handleFileSelection(e) {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const files = Array.from(e.target.files);
    const fileList = widget.querySelector('.feedloop-file-list');

    // Validate file count
    if (widgetState.attachments.length + files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }

    // Validate and add files
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }

      widgetState.attachments.push(file);

      // Create file item
      const fileItem = document.createElement('div');
      fileItem.className = 'feedloop-file-item';
      fileItem.innerHTML = `
        <span class="feedloop-file-name">${file.name}</span>
        <span class="feedloop-file-size">(${formatFileSize(file.size)})</span>
        <button type="button" class="feedloop-file-remove" data-index="${widgetState.attachments.length - 1}">×</button>
      `;

      fileItem.querySelector('.feedloop-file-remove').addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.getAttribute('data-index'));
        removeFile(index);
      });

      fileList.appendChild(fileItem);
    });

    // Clear input
    e.target.value = '';
  }

  // Remove file
  function removeFile(index) {
    widgetState.attachments.splice(index, 1);
    updateFileList();
  }

  // Update file list display
  function updateFileList() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const fileList = widget.querySelector('.feedloop-file-list');
    fileList.innerHTML = '';

    widgetState.attachments.forEach((file, index) => {
      const fileItem = document.createElement('div');
      fileItem.className = 'feedloop-file-item';
      fileItem.innerHTML = `
        <span class="feedloop-file-name">${file.name}</span>
        <span class="feedloop-file-size">(${formatFileSize(file.size)})</span>
        <button type="button" class="feedloop-file-remove" data-index="${index}">×</button>
      `;

      fileItem.querySelector('.feedloop-file-remove').addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        removeFile(idx);
      });

      fileList.appendChild(fileItem);
    });
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Validate email
  function validateEmail(e) {
    const email = e.target.value;
    const errorSpan = e.target.nextElementSibling;

    if (email && !isValidEmail(email)) {
      errorSpan.textContent = 'Please enter a valid email address';
      e.target.classList.add('error');
    } else {
      errorSpan.textContent = '';
      e.target.classList.remove('error');
    }
  }

  // Email validation helper
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Collect diagnostic data
  function collectDiagnosticData() {
    widgetState.diagnosticData = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      platform: navigator.platform,
      consoleLogs: [],
      networkRequests: []
    };

    // Capture console logs
    captureConsoleLogs();

    // Capture network requests (if Performance API available)
    captureNetworkRequests();
  }

  // Capture console logs
  function captureConsoleLogs() {
    const maxLogs = 50;
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn
    };

    ['log', 'error', 'warn'].forEach(method => {
      console[method] = function(...args) {
        widgetState.diagnosticData.consoleLogs.push({
          type: method,
          message: args.map(arg => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch (e) {
              return String(arg);
            }
          }).join(' '),
          timestamp: new Date().toISOString()
        });

        // Keep only last N logs
        if (widgetState.diagnosticData.consoleLogs.length > maxLogs) {
          widgetState.diagnosticData.consoleLogs.shift();
        }

        // Call original console method
        originalConsole[method].apply(console, args);
      };
    });
  }

  // Capture network requests
  function captureNetworkRequests() {
    if (window.performance && window.performance.getEntriesByType) {
      const requests = window.performance.getEntriesByType('resource');
      widgetState.diagnosticData.networkRequests = requests.slice(-20).map(req => ({
        name: req.name,
        duration: Math.round(req.duration),
        size: req.transferSize || 0,
        type: req.initiatorType
      }));
    }
  }

  // Handle form submission
  async function handleSubmit(e) {
    e.preventDefault();

    const widget = document.getElementById(WIDGET_NAMESPACE);
    const form = e.target;

    // Clear previous messages
    hideMessages();

    // Validate form
    if (!validateForm(form)) {
      return;
    }

    // Gather form data
    const formData = gatherFormData(form);

    // Show loading state
    showLoading(true);

    try {
      // Submit to API
      const response = await submitFeedback(formData);

      if (response.ok) {
        showSuccessMessage();
        setTimeout(() => {
          closeWidget();
        }, 3000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('FeeDLooP submission error:', error);
      showErrorMessage(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  // Validate form
  function validateForm(form) {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    let isValid = true;

    // Validate title
    const title = form.querySelector('#feedloop-title').value.trim();
    if (!title) {
      showFieldError('#feedloop-title', 'Title is required');
      isValid = false;
    }

    // Validate description
    const description = widget.querySelector('.feedloop-editor').textContent.trim();
    if (!description) {
      showFieldError('.feedloop-editor', 'Description is required');
      isValid = false;
    }

    // Validate email if provided
    const email = form.querySelector('#feedloop-email').value.trim();
    if (email && !isValidEmail(email)) {
      showFieldError('#feedloop-email', 'Please enter a valid email');
      isValid = false;
    }

    return isValid;
  }

  // Show field error
  function showFieldError(selector, message) {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const field = widget.querySelector(selector);
    const errorSpan = field.closest('.feedloop-field').querySelector('.feedloop-field-error');

    if (errorSpan) {
      errorSpan.textContent = message;
      field.classList.add('error');
    }
  }

  // Gather form data
  function gatherFormData(form) {
    const widget = document.getElementById(WIDGET_NAMESPACE);

    return {
      project_key: widgetState.projectKey,
      type: widgetState.reportType,
      title: form.querySelector('#feedloop-title').value.trim(),
      description: widget.querySelector('.feedloop-editor').innerHTML,
      priority: widgetState.reportType === 'bug' ? form.querySelector('#feedloop-priority').value : null,
      reporter_name: form.querySelector('#feedloop-name').value.trim() || null,
      reporter_email: form.querySelector('#feedloop-email').value.trim() || null,
      url: widgetState.diagnosticData.url,
      user_agent: widgetState.diagnosticData.userAgent,
      console_logs: widgetState.diagnosticData.consoleLogs,
      network_requests: widgetState.diagnosticData.networkRequests,
      attachments: widgetState.attachments
    };
  }

  // Submit feedback to API
  async function submitFeedback(data) {
    const formData = new FormData();

    // Add text fields
    Object.keys(data).forEach(key => {
      if (key !== 'attachments' && data[key] !== null) {
        formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
      }
    });

    // Add attachments
    data.attachments.forEach((file, index) => {
      formData.append(`attachment_${index}`, file);
    });

    // Submit to API
    return fetch(`${WIDGET_API_BASE}/api/widget/submit`, {
      method: 'POST',
      body: formData
    });
  }

  // Show/hide loading state
  function showLoading(show) {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const submitBtn = widget.querySelector('.feedloop-submit-btn');
    const submitText = submitBtn.querySelector('.feedloop-submit-text');
    const loadingText = submitBtn.querySelector('.feedloop-loading');

    submitBtn.disabled = show;
    submitText.style.display = show ? 'none' : 'inline';
    loadingText.style.display = show ? 'inline' : 'none';
  }

  // Show success message
  function showSuccessMessage() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const success = widget.querySelector('.feedloop-success');
    const content = widget.querySelector('.feedloop-content');

    content.style.display = 'none';
    success.style.display = 'flex';
  }

  // Show error message
  function showErrorMessage(message) {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const error = widget.querySelector('.feedloop-error');
    const errorText = error.querySelector('.feedloop-error-text');

    errorText.textContent = message;
    error.style.display = 'flex';
  }

  // Hide all messages
  function hideMessages() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    widget.querySelector('.feedloop-success').style.display = 'none';
    widget.querySelector('.feedloop-error').style.display = 'none';
    widget.querySelector('.feedloop-content').style.display = 'block';
  }

  // Reset form
  function resetForm() {
    const widget = document.getElementById(WIDGET_NAMESPACE);

    // Reset form fields
    widget.querySelector('.feedloop-form').reset();
    widget.querySelector('.feedloop-editor').innerHTML = '';

    // Clear attachments
    widgetState.attachments = [];
    updateFileList();

    // Reset report type
    widgetState.reportType = 'bug';
    widget.querySelectorAll('.feedloop-type-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    widget.querySelector('[data-type="bug"]').classList.add('active');

    // Hide messages
    hideMessages();

    // Clear errors
    widget.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    widget.querySelectorAll('.feedloop-field-error').forEach(el => el.textContent = '');
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Export for testing
  if (typeof window !== 'undefined') {
    window.FeeDLooPWidget = {
      version: WIDGET_VERSION,
      open: openWidget,
      close: closeWidget,
      reset: resetForm,
      getState: () => widgetState
    };
  }
})();