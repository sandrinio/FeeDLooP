/**
 * FeeDLooP Widget Core JavaScript
 * T063: Widget core JavaScript with CSS isolation
 * Embeddable feedback collection widget with isolated styling and functionality
 */

(function() {
  'use strict';

  // Widget configuration
  const WIDGET_VERSION = '2.0.0';

  // API Base URL detection
  let WIDGET_API_BASE = '';
  if (typeof window !== 'undefined') {
    if (window.FEEDLOOP_API_BASE) {
      // Allow explicit override
      WIDGET_API_BASE = window.FEEDLOOP_API_BASE;
    } else {
      // First check if widget is loaded from production CDN
      const scripts = document.getElementsByTagName('script');
      let isProductionWidget = false;
      for (let script of scripts) {
        if (script.src && script.src.includes('feedloop.soula.ge')) {
          WIDGET_API_BASE = 'https://feedloop.soula.ge';
          isProductionWidget = true;
          break;
        }
      }

      // Only use localhost API if widget is NOT from production AND we're on localhost:3000
      if (!isProductionWidget && window.location.hostname === 'localhost' && window.location.port === '3000') {
        WIDGET_API_BASE = 'http://localhost:3001';
      }
    }
  }

  const WIDGET_NAMESPACE = 'feedloop-widget';

  // Capture script tag immediately while currentScript is still available
  const SCRIPT_TAG = document.currentScript || document.querySelector('script[data-project-key]');
  const PROJECT_KEY = SCRIPT_TAG ? SCRIPT_TAG.getAttribute('data-project-key') : null;
  const SCRIPT_NONCE = SCRIPT_TAG ? SCRIPT_TAG.getAttribute('nonce') : null;

  // Debug logging for project key extraction
  console.log('FeeDLooP Debug: Script tag detection');
  console.log('- document.currentScript:', document.currentScript);
  console.log('- querySelector result:', document.querySelector('script[data-project-key]'));
  console.log('- SCRIPT_TAG:', SCRIPT_TAG);
  console.log('- PROJECT_KEY extracted:', PROJECT_KEY);
  console.log('- SCRIPT_NONCE extracted:', SCRIPT_NONCE);

  // Widget state
  let widgetState = {
    isOpen: false,
    isMinimized: false,
    projectKey: PROJECT_KEY,
    reportType: 'bug',
    attachments: [],
    formData: {
      title: '',
      description: '',
      reporter_name: '',
      reporter_email: '',
      priority: 'medium'
    },
    // Enhanced data collection
    diagnosticData: {
      performanceMetrics: null,
      interactionData: null,
      errorContext: null,
      consentGiven: null
    }
  };

  // Create isolated style container with inline CSS
  function injectStyles() {
    if (document.getElementById('feedloop-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'feedloop-widget-styles';

    // Apply nonce if available for CSP compliance
    if (SCRIPT_NONCE) {
      style.setAttribute('nonce', SCRIPT_NONCE);
    }

    // Inline CSS content (populated by build process)
    style.textContent = '.feedloop-widget-container,.feedloop-widget-container *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;line-height:1.5}.feedloop-widget-container{position:fixed;bottom:20px;right:20px;z-index:999999;font-size:14px;color:#333}.feedloop-trigger-btn{position:relative;display:flex;align-items:center;gap:8px;padding:12px 20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:50px 0 0 50px;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,0.1),0 2px 4px rgba(0,0,0,0.06);transition:all 0.3s ease;font-size:14px;font-weight:500;transform:translateX(0)}.feedloop-trigger-btn:hover{transform:translateX(0) translateY(-2px);box-shadow:0 10px 15px rgba(0,0,0,0.15),0 4px 6px rgba(0,0,0,0.1)}.feedloop-trigger-btn svg{width:20px;height:20px;stroke-width:2}.feedloop-trigger-text{display:inline-block}.feedloop-widget-container[data-state="open"] .feedloop-trigger-btn{display:none}.feedloop-panel{position:absolute;bottom:0;right:0;width:400px;max-width:calc(100vw - 40px);max-height:600px;background:white;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);display:none;flex-direction:column;overflow:hidden}.feedloop-widget-container[data-state="open"] .feedloop-panel{display:flex;animation:feedloop-slide-up 0.3s ease-out}.feedloop-widget-container[data-minimized="true"] .feedloop-panel{max-height:50px}@keyframes feedloop-slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}.feedloop-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white}.feedloop-title{font-size:16px;font-weight:600;color:white}.feedloop-header-actions{display:flex;gap:8px}.feedloop-minimize-btn,.feedloop-close-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);border:none;border-radius:6px;cursor:pointer;transition:background 0.2s;color:white}.feedloop-minimize-btn:hover,.feedloop-close-btn:hover{background:rgba(255,255,255,0.3)}.feedloop-content{flex:1;overflow-y:auto;padding:20px}.feedloop-widget-container[data-minimized="true"] .feedloop-content{display:none}.feedloop-type-selector{display:flex;gap:8px;margin-bottom:20px}.feedloop-type-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;background:#f7f7f7;border:2px solid #e5e5e5;border-radius:8px;cursor:pointer;transition:all 0.2s;font-size:12px;color:#666}.feedloop-type-btn:hover{background:#f0f0f0;border-color:#d0d0d0}.feedloop-type-btn.active{background:#f0f4ff;border-color:#667eea;color:#667eea}.feedloop-type-icon{font-size:20px}.feedloop-form{display:flex;flex-direction:column;gap:16px}.feedloop-field{display:flex;flex-direction:column;gap:6px}.feedloop-field label{font-size:13px;font-weight:500;color:#555}.feedloop-field input[type="text"],.feedloop-field input[type="email"],.feedloop-field select{padding:8px 12px;border:1px solid #e0e0e0;border-radius:6px;font-size:14px;transition:border-color 0.2s;background:white}.feedloop-field input:focus,.feedloop-field select:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.1)}.feedloop-field input.error,.feedloop-field .feedloop-editor.error{border-color:#ef4444}.feedloop-field-error{font-size:12px;color:#ef4444;min-height:16px}.feedloop-field-group{display:grid;grid-template-columns:1fr 1fr;gap:12px}.feedloop-rich-text{border:1px solid #e0e0e0;border-radius:6px;overflow:hidden}.feedloop-toolbar{display:flex;gap:4px;padding:6px;background:#f7f7f7;border-bottom:1px solid #e0e0e0}.feedloop-tool{min-width:32px;height:28px;display:flex;align-items:center;justify-content:center;background:white;border:1px solid #d0d0d0;border-radius:4px;cursor:pointer;font-size:12px;color:#555;transition:all 0.2s;padding:0 6px}.feedloop-tool:hover{background:#f0f0f0;border-color:#b0b0b0}.feedloop-editor{min-height:120px;max-height:250px;padding:16px 16px 16px 24px;overflow-y:auto;font-size:14px;line-height:1.6;background:white;border:none;resize:none}.feedloop-editor ul{padding-left:20px;margin:8px 0}.feedloop-editor ol{padding-left:20px;margin:8px 0}.feedloop-editor li{margin:4px 0}.feedloop-editor:focus{outline:none;box-shadow:inset 0 0 0 1px #667eea}.feedloop-editor[data-placeholder]:empty:before{content:attr(data-placeholder);color:#999}.feedloop-attachments{display:flex;flex-direction:column;gap:8px}.feedloop-drop-zone{display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;border:2px dashed #d0d0d0;border-radius:8px;background:#fafafa;transition:all 0.2s;text-align:center;cursor:pointer}.feedloop-drop-zone:hover{border-color:#667eea;background:#f8faff}.feedloop-drop-zone.drag-over{border-color:#667eea;background:#f0f4ff;transform:scale(1.02)}.feedloop-drop-text{font-size:14px;color:#666;font-weight:500}.feedloop-file-list{display:flex;flex-direction:column;gap:6px}.feedloop-file-item{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f7f7f7;border-radius:6px;font-size:13px}.feedloop-file-name{flex:1;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.feedloop-file-size{color:#999;font-size:12px}.feedloop-file-remove{width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:#e0e0e0;border:none;border-radius:50%;cursor:pointer;font-size:16px;color:#666;transition:all 0.2s}.feedloop-file-remove:hover{background:#d0d0d0;color:#333}.feedloop-consent-banner{background:#f8faff;border:1px solid #e1ebf7;border-radius:8px;margin-bottom:16px;overflow:hidden}.feedloop-consent-content{padding:16px}.feedloop-consent-content h4{margin:0 0 12px 0;color:#4c51bf;font-size:14px}.feedloop-consent-content p{margin:0 0 12px 0;font-size:13px;line-height:1.4;color:#555}.feedloop-consent-details{background:white;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin:12px 0;font-size:12px}.feedloop-consent-details strong{color:#374151;font-size:13px}.feedloop-consent-details ul{margin:8px 0;padding-left:20px}.feedloop-consent-details li{margin:4px 0;color:#555}.feedloop-consent-actions{display:flex;gap:8px;margin-top:16px}.feedloop-consent-decline{background:white;color:#6b7280;border:1px solid #d1d5db;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;transition:all 0.2s}.feedloop-consent-decline:hover{background:#f9fafb;border-color:#9ca3af}.feedloop-consent-accept{background:#667eea;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;transition:all 0.2s}.feedloop-consent-accept:hover{background:#5a67d8}.feedloop-notice{padding:10px;background:#f0f4ff;border-radius:6px;font-size:12px;color:#555}.feedloop-actions{display:flex;gap:12px;margin-top:8px}.feedloop-cancel-btn,.feedloop-submit-btn{flex:1;padding:10px 16px;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s}.feedloop-cancel-btn{background:white;color:#666;border:1px solid #e0e0e0}.feedloop-cancel-btn:hover{background:#f7f7f7;border-color:#d0d0d0}.feedloop-submit-btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white}.feedloop-submit-btn:hover:not(:disabled){opacity:0.9;transform:translateY(-1px);box-shadow:0 4px 6px rgba(0,0,0,0.1)}.feedloop-submit-btn:disabled{opacity:0.6;cursor:not-allowed}.feedloop-message{display:flex;align-items:center;gap:12px;padding:16px 20px;margin:20px;border-radius:8px;font-size:14px}.feedloop-success{background:#d1fae5;color:#065f46}.feedloop-success svg{fill:#10b981;flex-shrink:0}.feedloop-error{background:#fee2e2;color:#991b1b}.feedloop-error svg{fill:#ef4444;flex-shrink:0}.feedloop-loading{display:inline-flex;align-items:center;gap:8px}.feedloop-loading::before{content:\'\';width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:feedloop-spin 0.6s linear infinite}@keyframes feedloop-spin{to{transform:rotate(360deg)}}@media (max-width:480px){.feedloop-widget-container{bottom:0;right:0;left:0}.feedloop-trigger-btn{bottom:20px;right:20px;position:fixed}.feedloop-panel{width:100%;max-width:100%;height:100vh;max-height:100vh;border-radius:0}.feedloop-field-group{grid-template-columns:1fr}.feedloop-type-btn{font-size:11px;padding:10px 4px}.feedloop-type-icon{font-size:18px}}@media print{.feedloop-widget-container{display:none !important}}';

    document.head.appendChild(style);
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
                      •
                    </button>
                    <button type="button" class="feedloop-tool" data-command="insertOrderedList" title="Numbered List">
                      1.
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
                  <label for="feedloop-name">Your Name (optional)</label>
                  <input
                    type="text"
                    id="feedloop-name"
                    name="reporter_name"
                    maxlength="100"
                    placeholder="John Doe"
                  />
                </div>
                <div class="feedloop-field">
                  <label for="feedloop-email">Your Email (optional)</label>
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
                  <div class="feedloop-drop-zone">
                    <svg width="48" height="48" viewBox="0 0 48 48" style="color: #999; margin-bottom: 8px;">
                      <path d="M38 18v-4c0-9.4-7.6-17-17-17S4 4.6 4 14v4c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h40c2.2 0 4-1.8 4-4V22c0-2.2-1.8-4-4-4zM8 14c0-7.2 5.8-13 13-13s13 5.8 13 13v4H8v-4zm36 28H4V22h40v20z" fill="currentColor"/>
                      <path d="M21 30v-6h6v6h6l-9 9-9-9h6z" fill="currentColor"/>
                    </svg>
                    <span class="feedloop-drop-text">Drag and drop or click to upload</span>
                  </div>
                  <div class="feedloop-file-list"></div>
                </div>
              </div>

              <!-- Privacy Consent Banner -->
              <div class="feedloop-consent-banner" id="feedloop-consent-banner" style="display: none;">
                <div class="feedloop-consent-content">
                  <h4>Enhanced Data Collection</h4>
                  <p>To provide better debugging insights, we can collect additional performance metrics and user interaction data. This helps us understand how your experience compares to others and identify specific issues.</p>
                  <div class="feedloop-consent-details">
                    <strong>What we collect with your consent:</strong>
                    <ul>
                      <li>Core Web Vitals (page load performance)</li>
                      <li>Anonymized interaction patterns (clicks, scrolls)</li>
                      <li>Enhanced error context and patterns</li>
                      <li>Resource loading performance data</li>
                    </ul>
                    <p><strong>Privacy:</strong> All data is anonymized and used solely for debugging purposes. No personal information is collected.</p>
                  </div>
                  <div class="feedloop-consent-actions">
                    <button type="button" class="feedloop-consent-decline">No Thanks</button>
                    <button type="button" class="feedloop-consent-accept">Accept Enhanced Collection</button>
                  </div>
                </div>
              </div>

              <!-- Diagnostic Data Notice -->
              <div class="feedloop-notice">
                <small>
                  <strong>Note:</strong> We'll automatically collect browser info and console logs to help diagnose issues.
                  <span class="feedloop-enhanced-notice" style="display: none;">
                    Enhanced performance and interaction data collection is enabled.
                    <button type="button" class="feedloop-manage-consent" style="background: none; border: none; color: #667eea; text-decoration: underline; cursor: pointer; font-size: inherit;">Manage preferences</button>
                  </span>
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
    // Check if widget already exists (double-check for safety)
    if (document.getElementById(WIDGET_NAMESPACE)) {
      console.log('FeeDLooP: Widget container already exists, skipping initialization');
      return;
    }

    // Debug logging
    console.log('FeeDLooP Debug: initWidget called');
    console.log('- widgetState.projectKey:', widgetState.projectKey);
    console.log('- All script tags with data-project-key:', document.querySelectorAll('script[data-project-key]'));

    // Validate project key that was captured earlier
    if (!widgetState.projectKey) {
      console.error('FeeDLooP: No project key found. Make sure the script tag has data-project-key attribute.');
      console.error('FeeDLooP: Script tag details:', SCRIPT_TAG);
      console.error('FeeDLooP: All script tags:', document.querySelectorAll('script'));
      return;
    }

    console.log('FeeDLooP Debug: Project key successfully loaded:', widgetState.projectKey);

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

    // Image paste functionality
    const editor = widget.querySelector('.feedloop-editor');
    editor.addEventListener('paste', handlePaste);

    // File attachment
    const fileInput = widget.querySelector('#feedloop-file-input');
    const dropZone = widget.querySelector('.feedloop-drop-zone');


    if (dropZone && fileInput) {
      dropZone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          fileInput.click();
        } catch (error) {
          console.error('Error clicking file input:', error);
        }
      });
      fileInput.addEventListener('change', handleFileSelection);
    } else {
      console.error('Drop zone or file input not found');
    }

    // Drag and drop functionality
    if (dropZone) {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('dragenter', handleDragEnter);
      dropZone.addEventListener('dragleave', handleDragLeave);
      dropZone.addEventListener('drop', handleDrop);
    }

    // Form submission
    widget.querySelector('.feedloop-form').addEventListener('submit', handleSubmit);

    // Email validation
    const emailInput = widget.querySelector('#feedloop-email');
    emailInput.addEventListener('blur', validateEmail);

    // Consent banner handlers
    const consentAccept = widget.querySelector('.feedloop-consent-accept');
    const consentDecline = widget.querySelector('.feedloop-consent-decline');
    const manageConsent = widget.querySelector('.feedloop-manage-consent');

    if (consentAccept) {
      consentAccept.addEventListener('click', handleConsentAccept);
    }
    if (consentDecline) {
      consentDecline.addEventListener('click', handleConsentDecline);
    }
    if (manageConsent) {
      manageConsent.addEventListener('click', showConsentBanner);
    }

    // Show consent banner on first widget open if no consent recorded
    setTimeout(checkAndShowConsentBanner, 500);
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

  // Drag and drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropZone = e.currentTarget;
    dropZone.classList.add('drag-over');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    // Only remove highlight if leaving the drop zone itself, not child elements
    if (!e.currentTarget.contains(e.relatedTarget)) {
      const dropZone = e.currentTarget;
      dropZone.classList.remove('drag-over');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const dropZone = e.currentTarget;
    dropZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Create a fake event object for handleFileSelection
    const fakeEvent = {
      target: { files: files, value: '' }
    };

    handleFileSelection(fakeEvent);
  }

  // Handle paste events (for image pasting)
  function handlePaste(e) {
    const clipboardData = e.clipboardData || window.clipboardData;

    if (!clipboardData) {
      console.log('No clipboard data available');
      return;
    }

    const items = clipboardData.items;
    console.log('Clipboard items:', items);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log('Item type:', item.type);

      // Check if the item is an image
      if (item.type.indexOf('image') !== -1) {
        console.log('Image found in clipboard');
        e.preventDefault();

        const file = item.getAsFile();
        if (file) {
          // Check file count limit
          if (widgetState.attachments.length >= 5) {
            alert('Maximum 5 files allowed');
            return;
          }

          // Check file size limit (10MB)
          if (file.size > 10 * 1024 * 1024) {
            alert('Pasted image is too large. Maximum size is 10MB.');
            return;
          }

          // Generate a filename for the pasted image
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = file.type.split('/')[1] || 'png';
          const fileName = `pasted-image-${timestamp}.${extension}`;

          // Create a new file object with a proper name
          const namedFile = new File([file], fileName, { type: file.type });

          // Add to attachments
          widgetState.attachments.push(namedFile);
          updateFileList();

          // Show feedback to user
          const editor = e.target;

          // Insert a temporary indicator where the image was pasted
          const indicator = document.createElement('span');
          indicator.style.background = '#e3f2fd';
          indicator.style.padding = '2px 8px';
          indicator.style.borderRadius = '4px';
          indicator.style.fontSize = '12px';
          indicator.style.margin = '0 4px';
          indicator.textContent = `📎 ${fileName} attached`;

          // Try to insert at cursor position, fallback to append
          try {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.insertNode(indicator);
            } else {
              editor.appendChild(indicator);
            }
          } catch (error) {
            editor.appendChild(indicator);
          }

          // Remove the indicator after 3 seconds
          setTimeout(() => {
            if (indicator.parentNode) {
              indicator.parentNode.removeChild(indicator);
            }
          }, 3000);
        }
        break;
      }
    }
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

  // ============================================================================
  // Privacy Consent Management (T014)
  // ============================================================================

  // Check and show consent banner if needed
  function checkAndShowConsentBanner() {
    try {
      const consentStatus = localStorage.getItem('feedloop_interaction_consent');

      if (!consentStatus) {
        // No consent recorded, show banner
        showConsentBanner();
      } else {
        // Update UI based on consent status
        updateConsentUI(consentStatus === 'accepted');
      }
    } catch (e) {
      console.log('FeeDLooP: Unable to check consent status (localStorage unavailable)');
    }
  }

  // Show consent banner
  function showConsentBanner() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const banner = widget.querySelector('#feedloop-consent-banner');

    if (banner) {
      banner.style.display = 'block';
      banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Hide consent banner
  function hideConsentBanner() {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const banner = widget.querySelector('#feedloop-consent-banner');

    if (banner) {
      banner.style.display = 'none';
    }
  }

  // Handle consent acceptance
  function handleConsentAccept() {
    try {
      localStorage.setItem('feedloop_interaction_consent', 'accepted');
      localStorage.setItem('feedloop_consent_timestamp', new Date().toISOString());

      hideConsentBanner();
      updateConsentUI(true);

      // Start collecting interaction data
      collectInteractionData();

      console.log('FeeDLooP: Enhanced data collection consent accepted');
    } catch (e) {
      console.error('FeeDLooP: Error saving consent:', e);
    }
  }

  // Handle consent decline
  function handleConsentDecline() {
    try {
      localStorage.setItem('feedloop_interaction_consent', 'declined');
      localStorage.setItem('feedloop_consent_timestamp', new Date().toISOString());

      hideConsentBanner();
      updateConsentUI(false);

      console.log('FeeDLooP: Enhanced data collection consent declined');
    } catch (e) {
      console.error('FeeDLooP: Error saving consent:', e);
    }
  }

  // Update UI based on consent status
  function updateConsentUI(consentGiven) {
    const widget = document.getElementById(WIDGET_NAMESPACE);
    const enhancedNotice = widget.querySelector('.feedloop-enhanced-notice');

    if (enhancedNotice) {
      enhancedNotice.style.display = consentGiven ? 'inline' : 'none';
    }

    // Store consent status in widget state
    widgetState.diagnosticData.consentGiven = consentGiven;
  }

  // ============================================================================
  // Enhanced Performance Data Collection (T012-T016)
  // ============================================================================

  // Check for consent in localStorage
  function checkPerformanceConsent() {
    try {
      const consent = localStorage.getItem('feedloop_interaction_consent');
      return consent === 'accepted';
    } catch (e) {
      return false;
    }
  }

  // Collect Core Web Vitals using Performance Observer API
  function collectPerformanceMetrics() {
    if (!window.PerformanceObserver) {
      console.log('FeeDLooP: Performance Observer not supported');
      return null;
    }

    const metrics = {
      web_vitals: {},
      custom_metrics: {},
      resource_timing: {
        scripts: [],
        stylesheets: [],
        images: [],
        fonts: []
      },
      memory: null,
      categorization: null
    };

    try {
      // Collect navigation timing
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;

        metrics.custom_metrics = {
          dom_ready: timing.domContentLoadedEventEnd - navigationStart,
          window_load: timing.loadEventEnd - navigationStart,
          first_paint: 0 // Will be updated by observer
        };
      }

      // Collect memory information
      if (window.performance && window.performance.memory) {
        metrics.memory = {
          used_js_heap_size: window.performance.memory.usedJSHeapSize,
          total_js_heap_size: window.performance.memory.totalJSHeapSize,
          limit: window.performance.memory.jsHeapSizeLimit
        };
      }

      // Performance Observer for Web Vitals
      const webVitalsPromise = new Promise((resolve) => {
        const observedMetrics = {};
        let observersCount = 0;
        const totalObservers = 5; // FCP, LCP, CLS, FID, TTFB

        function checkComplete() {
          observersCount++;
          if (observersCount >= totalObservers) {
            resolve(observedMetrics);
          }
        }

        // First Contentful Paint
        try {
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              observedMetrics.fcp = Math.round(entries[0].startTime);
              fcpObserver.disconnect();
            }
            checkComplete();
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          checkComplete();
        }

        // Largest Contentful Paint
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              observedMetrics.lcp = Math.round(entries[entries.length - 1].startTime);
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // LCP can keep updating, so we'll disconnect after a timeout
          setTimeout(() => {
            lcpObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          checkComplete();
        }

        // Cumulative Layout Shift
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            observedMetrics.cls = Math.round(clsValue * 1000) / 1000; // Round to 3 decimals
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => {
            clsObserver.disconnect();
            checkComplete();
          }, 2000);
        } catch (e) {
          checkComplete();
        }

        // First Input Delay (will only fire on actual user input)
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              observedMetrics.fid = Math.round(entries[0].processingStart - entries[0].startTime);
              fidObserver.disconnect();
            }
            checkComplete();
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // FID might not fire if no user input, timeout after 5 seconds
          setTimeout(() => {
            fidObserver.disconnect();
            checkComplete();
          }, 5000);
        } catch (e) {
          checkComplete();
        }

        // Time to First Byte (from navigation timing)
        try {
          if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            observedMetrics.ttfb = timing.responseStart - timing.navigationStart;
          }
          checkComplete();
        } catch (e) {
          checkComplete();
        }

        // Fallback timeout
        setTimeout(() => {
          resolve(observedMetrics);
        }, 6000);
      });

      // Wait for web vitals collection
      webVitalsPromise.then((webVitals) => {
        metrics.web_vitals = webVitals;

        // Categorize performance
        metrics.categorization = categorizePerformanceMetrics(webVitals);

        // Store in widget state
        widgetState.diagnosticData.performanceMetrics = metrics;
      });

      // Collect resource timing
      collectResourceTiming(metrics);

    } catch (error) {
      console.error('FeeDLooP: Error collecting performance metrics:', error);
    }

    return metrics;
  }

  // Categorize performance based on Web Vitals thresholds
  function categorizePerformanceMetrics(webVitals) {
    const thresholds = {
      fcp: { good: 1000, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      fid: { good: 100, needsImprovement: 300 }
    };

    let score = 0;
    let totalMetrics = 0;

    Object.keys(thresholds).forEach(metric => {
      if (webVitals[metric] !== undefined) {
        totalMetrics++;
        const value = webVitals[metric];
        const threshold = thresholds[metric];

        if (value <= threshold.good) {
          score += 2; // Good
        } else if (value <= threshold.needsImprovement) {
          score += 1; // Needs improvement
        }
        // Poor = 0 points
      }
    });

    const avgScore = totalMetrics > 0 ? score / (totalMetrics * 2) : 0;

    let overall, details;
    if (avgScore >= 0.8) {
      overall = 'low';
      details = 'Excellent performance across Core Web Vitals';
    } else if (avgScore >= 0.5) {
      overall = 'medium';
      details = 'Good performance with some metrics needing improvement';
    } else if (avgScore >= 0.25) {
      overall = 'high';
      details = 'Performance issues detected affecting user experience';
    } else {
      overall = 'critical';
      details = 'Significant performance problems requiring attention';
    }

    return { overall, details };
  }

  // Collect resource timing data
  function collectResourceTiming(metrics) {
    if (!window.performance || !window.performance.getEntriesByType) return;

    try {
      const resources = window.performance.getEntriesByType('resource');

      resources.forEach(resource => {
        const resourceData = {
          name: resource.name.split('/').pop() || resource.name,
          duration: Math.round(resource.duration),
          size: resource.transferSize || 0,
          cache_status: resource.transferSize === 0 && resource.decodedBodySize > 0 ? 'hit' : 'miss'
        };

        // Categorize by resource type
        if (resource.initiatorType === 'script' || resource.name.includes('.js')) {
          metrics.resource_timing.scripts.push(resourceData);
        } else if (resource.initiatorType === 'link' || resource.name.includes('.css')) {
          metrics.resource_timing.stylesheets.push(resourceData);
        } else if (resource.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(resource.name)) {
          metrics.resource_timing.images.push(resourceData);
        } else if (/\.(woff|woff2|ttf|otf)$/i.test(resource.name)) {
          metrics.resource_timing.fonts.push(resourceData);
        }
      });

      // Limit number of entries to prevent payload bloat
      Object.keys(metrics.resource_timing).forEach(type => {
        metrics.resource_timing[type] = metrics.resource_timing[type]
          .sort((a, b) => b.duration - a.duration) // Sort by duration descending
          .slice(0, 10); // Keep top 10
      });

    } catch (error) {
      console.error('FeeDLooP: Error collecting resource timing:', error);
    }
  }

  // Enhanced error context collection
  function collectErrorContext() {
    const errorContext = {
      unhandled_errors: [],
      promise_rejections: [],
      cors_errors: [],
      csp_violations: [],
      total_error_count: 0,
      error_rate: 0,
      patterns: []
    };

    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      const error = {
        message: event.message,
        stack: event.error ? event.error.stack : '',
        timestamp: new Date().toISOString(),
        type: event.error ? event.error.name : 'Error',
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        user_agent_specific: false,
        frequency: 1
      };

      errorContext.unhandled_errors.push(error);
      errorContext.total_error_count++;
      updateErrorPatterns(errorContext, error.message);
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const rejection = {
        reason: event.reason ? event.reason.toString() : 'Unknown rejection',
        promise_id: 'promise-' + Date.now(),
        timestamp: new Date().toISOString(),
        handled: false
      };

      errorContext.promise_rejections.push(rejection);
      errorContext.total_error_count++;
    });

    // Store in widget state
    widgetState.diagnosticData.errorContext = errorContext;

    return errorContext;
  }

  // Update error patterns for pattern detection
  function updateErrorPatterns(errorContext, message) {
    // Simple pattern detection - could be enhanced
    const pattern = message.replace(/\d+/g, 'N').replace(/["'][^"']*["']/g, 'STRING');

    let existingPattern = errorContext.patterns.find(p => p.pattern === pattern);
    if (existingPattern) {
      existingPattern.count++;
      existingPattern.last_seen = new Date().toISOString();
    } else {
      errorContext.patterns.push({
        pattern: pattern,
        count: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      });
    }
  }

  // Collect user interaction data (with consent)
  function collectInteractionData() {
    if (!checkPerformanceConsent()) {
      return null;
    }

    const interactionData = {
      consent_given: true,
      consent_timestamp: localStorage.getItem('feedloop_consent_timestamp'),
      events: [],
      session_duration: 0,
      engagement_score: 0
    };

    const sessionStart = Date.now();
    let interactionCount = 0;
    let scrollDepth = 0;

    // Track various user interactions
    const trackEvent = (type, target, metadata = {}) => {
      if (interactionData.events.length >= 100) return; // Limit events

      interactionData.events.push({
        type,
        timestamp: new Date().toISOString(),
        target: {
          element: target.tagName ? target.tagName.toLowerCase() : 'unknown',
          id: target.id || undefined,
          class: target.className || undefined,
          text: target.textContent ? target.textContent.substring(0, 50) : undefined
        },
        metadata,
        anonymized: true
      });

      interactionCount++;
    };

    // Click tracking
    document.addEventListener('click', (e) => {
      trackEvent('click', e.target, {
        x: Math.round(e.clientX / 10) * 10, // Quantize for privacy
        y: Math.round(e.clientY / 10) * 10
      });
    });

    // Scroll tracking
    let lastScrollTime = 0;
    document.addEventListener('scroll', () => {
      const now = Date.now();
      if (now - lastScrollTime < 250) return; // Throttle
      lastScrollTime = now;

      const currentScrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (currentScrollDepth > scrollDepth) {
        scrollDepth = currentScrollDepth;
        trackEvent('scroll', document.body, {
          scroll_depth: currentScrollDepth / 100
        });
      }
    });

    // Calculate engagement score periodically
    const updateEngagement = () => {
      interactionData.session_duration = Date.now() - sessionStart;
      interactionData.engagement_score = Math.min(1, (interactionCount * 0.1 + scrollDepth * 0.01) / 2);
    };

    setInterval(updateEngagement, 5000);

    // Store in widget state
    widgetState.diagnosticData.interactionData = interactionData;

    return interactionData;
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

    // NEW: Collect enhanced performance data
    collectPerformanceMetrics();

    // NEW: Collect error context
    collectErrorContext();

    // NEW: Collect interaction data (if consent given)
    if (checkPerformanceConsent()) {
      collectInteractionData();
    }
  }

  // Capture console logs
  function captureConsoleLogs() {
    const maxLogs = 50; // Capture more initially, optimize later
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
      widgetState.diagnosticData.networkRequests = requests.slice(-30).map(req => ({
        name: req.name, // Keep full URLs initially, optimize later
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

    console.log('FeeDLooP Debug: gatherFormData called');
    console.log('- widgetState.projectKey at form submission:', widgetState.projectKey);
    console.log('- SCRIPT_TAG at form submission:', SCRIPT_TAG);
    console.log('- PROJECT_KEY at form submission:', PROJECT_KEY);
    console.log('- widgetState object:', widgetState);

    // Smart diagnostic data collection that adapts to content size
    const diagnosticData = optimizeDiagnosticData();

    // Enhanced data collection
    const enhancedData = {
      performance_metrics: widgetState.diagnosticData.performanceMetrics,
      interaction_data: widgetState.diagnosticData.interactionData,
      error_context: widgetState.diagnosticData.errorContext
    };

    const formData = {
      project_key: widgetState.projectKey,
      type: widgetState.reportType,
      title: form.querySelector('#feedloop-title').value.trim(),
      description: widget.querySelector('.feedloop-editor').innerHTML,
      priority: widgetState.reportType === 'bug' ? form.querySelector('#feedloop-priority').value : null,
      reporter_name: form.querySelector('#feedloop-name').value.trim() || null,
      reporter_email: form.querySelector('#feedloop-email').value.trim() || null,
      url: widgetState.diagnosticData.url,
      user_agent: widgetState.diagnosticData.userAgent,
      console_logs: JSON.stringify({
        entries: diagnosticData.consoleLogs,
        // Enhanced: Embed performance and error data in console_logs for Option 1
        performance_metrics: enhancedData.performance_metrics,
        error_context: enhancedData.error_context,
        metadata: {
          total_count: diagnosticData.consoleLogs.length,
          error_count: diagnosticData.consoleLogs.filter(log => log.type === 'error').length,
          warning_count: diagnosticData.consoleLogs.filter(log => log.type === 'warn').length,
          truncated: false
        }
      }),
      network_requests: JSON.stringify({
        entries: diagnosticData.networkRequests.map(req => ({
          id: 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          url: req.name,
          method: 'GET', // Default for resource timing
          status: 200, // Assume success for resource timing
          duration: req.duration,
          timestamp: new Date().toISOString(),
          type: req.type || 'other',
          size: {
            request: 0,
            response: req.size || 0,
            total: req.size || 0
          },
          timing: {
            dns: 0,
            tcp: 0,
            request: Math.round(req.duration * 0.3),
            response: Math.round(req.duration * 0.7),
            total: req.duration
          },
          priority: 'medium',
          cache_status: req.cache_status || 'miss'
        })),
        metadata: {
          total_requests: diagnosticData.networkRequests.length,
          failed_requests: 0,
          total_duration: diagnosticData.networkRequests.reduce((sum, req) => sum + req.duration, 0),
          total_size: diagnosticData.networkRequests.reduce((sum, req) => sum + (req.size || 0), 0)
        }
      }),
      // NEW: Enhanced fields for Option 2 (dedicated columns)
      performance_metrics: enhancedData.performance_metrics ? JSON.stringify(enhancedData.performance_metrics) : null,
      interaction_data: enhancedData.interaction_data ? JSON.stringify(enhancedData.interaction_data) : null,
      error_context: enhancedData.error_context ? JSON.stringify(enhancedData.error_context) : null,
      attachments: widgetState.attachments
    };

    console.log('FeeDLooP Debug: Final form data object:', formData);
    console.log('FeeDLooP Debug: project_key in formData:', formData.project_key);
    console.log('FeeDLooP Debug: Enhanced data included:', {
      performance_metrics: !!formData.performance_metrics,
      interaction_data: !!formData.interaction_data,
      error_context: !!formData.error_context
    });

    return formData;
  }

  // Intelligent diagnostic data optimization
  function optimizeDiagnosticData() {
    const MAX_DIAGNOSTIC_SIZE = 8000000; // ~8MB for diagnostic data (leaves room for form content)

    // Start with full data and iteratively reduce if needed
    let consoleLogs = [...widgetState.diagnosticData.consoleLogs];
    let networkRequests = [...widgetState.diagnosticData.networkRequests];

    // Prioritize recent and error logs
    consoleLogs = consoleLogs
      .sort((a, b) => {
        // Errors first, then warnings, then recent logs
        if (a.type === 'error' && b.type !== 'error') return -1;
        if (b.type === 'error' && a.type !== 'error') return 1;
        if (a.type === 'warn' && b.type === 'log') return -1;
        if (b.type === 'warn' && a.type === 'log') return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

    // Prioritize failed requests and recent requests
    networkRequests = networkRequests
      .filter(req => req.name && !req.name.includes('data:')) // Remove data URLs
      .sort((a, b) => {
        // Failed requests first (duration 0 often indicates failure)
        if (a.duration === 0 && b.duration > 0) return -1;
        if (b.duration === 0 && a.duration > 0) return 1;
        return b.duration - a.duration; // Then by duration (longer requests more interesting)
      });

    // Iteratively reduce data size
    while (true) {
      // Create current payload
      const currentLogs = consoleLogs.map(log => ({
        type: log.type,
        message: log.message.substring(0, 1000), // Start with longer messages
        timestamp: log.timestamp
      }));

      const currentRequests = networkRequests.map(req => ({
        name: req.name.substring(0, 150),
        duration: req.duration,
        size: req.size,
        type: req.type
      }));

      // Estimate size (rough JSON size calculation)
      const estimatedSize = JSON.stringify({
        console_logs: currentLogs,
        network_requests: currentRequests
      }).length;

      if (estimatedSize <= MAX_DIAGNOSTIC_SIZE) {
        return {
          consoleLogs: currentLogs,
          networkRequests: currentRequests
        };
      }

      // Reduce data progressively
      if (consoleLogs.length > 5) {
        // Keep errors and warnings, reduce regular logs
        const errors = consoleLogs.filter(log => log.type === 'error');
        const warnings = consoleLogs.filter(log => log.type === 'warn');
        const logs = consoleLogs.filter(log => log.type === 'log').slice(0, Math.max(2, 8 - errors.length - warnings.length));
        consoleLogs = [...errors, ...warnings, ...logs];
      } else if (networkRequests.length > 3) {
        networkRequests = networkRequests.slice(0, Math.max(3, networkRequests.length - 2));
      } else {
        // Final fallback - truncate messages more aggressively
        return {
          consoleLogs: consoleLogs.slice(0, 3).map(log => ({
            type: log.type,
            message: log.message.substring(0, 200),
            timestamp: log.timestamp
          })),
          networkRequests: networkRequests.slice(0, 2).map(req => ({
            name: req.name.substring(0, 50),
            duration: req.duration,
            size: req.size,
            type: req.type
          }))
        };
      }
    }
  }

  // Compression utilities
  async function compressData(data) {
    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);

      // Use browser's built-in compression
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      // Write the data
      writer.write(new TextEncoder().encode(jsonString));
      writer.close();

      // Read compressed data
      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      // Convert to base64 for transport
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      const base64 = btoa(String.fromCharCode(...compressed));

      console.log('FeeDLooP Compression:', {
        original: jsonString.length,
        compressed: base64.length,
        ratio: ((jsonString.length - base64.length) / jsonString.length * 100).toFixed(1) + '%'
      });

      return base64;
    } catch (error) {
      console.log('FeeDLooP: Compression failed, sending uncompressed:', error);
      return null;
    }
  }

  // Submit feedback to API
  async function submitFeedback(data) {
    console.log('FeeDLooP Debug: submitFeedback called');
    console.log('- Input data:', data);
    console.log('- WIDGET_API_BASE:', WIDGET_API_BASE);

    const formData = new FormData();

    // Try to compress diagnostic data if it's large
    if (data.diagnostic_data && JSON.stringify(data.diagnostic_data).length > 50000) {
      const compressed = await compressData(data.diagnostic_data);
      if (compressed) {
        formData.append('diagnostic_data_compressed', compressed);
        formData.append('compression_type', 'gzip');
        console.log('FeeDLooP Debug: Using compressed diagnostic data');
      } else {
        formData.append('diagnostic_data', JSON.stringify(data.diagnostic_data));
        console.log('FeeDLooP Debug: Compression failed, using uncompressed diagnostic data');
      }
    } else {
      // Add text fields normally
      Object.keys(data).forEach(key => {
        if (key !== 'attachments' && data[key] !== null) {
          const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
          console.log(`FeeDLooP Debug: Adding form field ${key}:`, value);
          formData.append(key, value);
        }
      });
    }

    // Add non-diagnostic fields
    Object.keys(data).forEach(key => {
      if (key !== 'attachments' && key !== 'diagnostic_data' && data[key] !== null) {
        const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
        console.log(`FeeDLooP Debug: Adding form field ${key}:`, value);
        formData.append(key, value);
      }
    });

    // Add attachments
    data.attachments.forEach((file, index) => {
      console.log(`FeeDLooP Debug: Adding attachment ${index}:`, file.name, file.size);
      formData.append(`attachment_${index}`, file);
    });

    // Debug FormData contents
    console.log('FeeDLooP Debug: FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`- ${key}:`, value);
    }

    const apiUrl = `${WIDGET_API_BASE}/api/widget/submit`;
    console.log('FeeDLooP Debug: Submitting to URL:', apiUrl);

    // Submit to API
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      console.log('FeeDLooP Debug: Response status:', response.status);
      console.log('FeeDLooP Debug: Response OK:', response.ok);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('FeeDLooP Debug: Error response body:', responseText);
      }

      return response;
    } catch (error) {
      console.error('FeeDLooP Debug: Fetch error:', error);
      throw error;
    }
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

  // Ensure button visibility
  function ensureButtonVisibility() {
    const widget = document.querySelector('.feedloop-widget-container');
    const button = widget?.querySelector('.feedloop-trigger-btn');

    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check if button extends beyond viewport
    if (rect.right > viewportWidth) {
      const overflow = rect.right - viewportWidth + 10; // 10px margin
      widget.style.right = `${20 + overflow}px`;
      console.log('FeeDLooP: Adjusted widget position for visibility');
    }

    if (rect.bottom > viewportHeight) {
      const overflow = rect.bottom - viewportHeight + 10;
      widget.style.bottom = `${20 + overflow}px`;
      console.log('FeeDLooP: Adjusted widget vertical position for visibility');
    }
  }

  // Check button visibility on resize and orientation change
  function setupVisibilityChecks() {
    ensureButtonVisibility();
    window.addEventListener('resize', ensureButtonVisibility);
    window.addEventListener('orientationchange', () => {
      setTimeout(ensureButtonVisibility, 500); // Delay for orientation change
    });
  }

  // Singleton pattern - only initialize once
  function initOnce() {
    // Check if widget already exists
    if (document.getElementById(WIDGET_NAMESPACE)) {
      console.log('FeeDLooP: Widget already initialized, skipping duplicate initialization');
      return;
    }

    initWidget();
    setupVisibilityChecks();
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnce);
  } else {
    initOnce();
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