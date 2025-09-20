# FeeDLooP Widget Framework Integration Guide

## Overview

The FeeDLooP widget is designed to be **framework-agnostic** and works seamlessly with any JavaScript framework or vanilla HTML. It uses a self-contained approach that prevents conflicts with your application.

## ✅ Button Visibility Solutions

### Current Enhancements
- **Fixed positioning** with 20px margin from viewport edges
- **Dynamic visibility detection** that auto-adjusts if button gets clipped
- **Responsive design** with mobile-optimized layouts
- **Viewport overflow protection** prevents button from extending beyond screen

### Positioning Methods

```javascript
// Automatic visibility detection (built-in)
function ensureButtonVisibility() {
  const button = document.querySelector('.feedloop-trigger-btn');
  const rect = button.getBoundingClientRect();

  if (rect.right > window.innerWidth) {
    // Auto-adjust position to stay visible
    widget.style.right = `${20 + overflow}px`;
  }
}
```

## 🚀 Framework Compatibility

### ✅ React Integration

#### Method 1: Static Script Tag (Recommended)
```jsx
// In public/index.html
<script
  src="/widget/dist/feedloop-widget.min.js"
  data-project-key="your-project-key"
  integrity="sha384-JbHr1znDTuaqWaawscdEZfcOwRhoY3GkyzGxOAPS/KxthkBwErbjrx1gSVx/wQIP"
  crossorigin="anonymous">
</script>
```

#### Method 2: Dynamic Loading
```jsx
import { useEffect } from 'react';

const FeedLoopWidget = ({ projectKey }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/widget/dist/feedloop-widget.min.js';
    script.setAttribute('data-project-key', projectKey);
    script.setAttribute('crossorigin', 'anonymous');
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const widgets = document.querySelectorAll('.feedloop-widget-container');
      widgets.forEach(widget => widget.remove());
      document.head.removeChild(script);
    };
  }, [projectKey]);

  return null; // Widget renders itself
};

// Usage
<FeedLoopWidget projectKey="your-project-key" />
```

#### Method 3: React Hook
```jsx
import { useEffect } from 'react';

export const useFeedLoopWidget = (projectKey, options = {}) => {
  useEffect(() => {
    if (!projectKey) return;

    const script = document.createElement('script');
    script.src = '/widget/dist/feedloop-widget.min.js';
    script.setAttribute('data-project-key', projectKey);

    if (options.position) {
      script.setAttribute('data-position', options.position);
    }
    if (options.theme) {
      script.setAttribute('data-theme', options.theme);
    }

    document.head.appendChild(script);

    return () => {
      const widgets = document.querySelectorAll('.feedloop-widget-container');
      widgets.forEach(widget => widget.remove());
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [projectKey, options.position, options.theme]);
};

// Usage in component
function App() {
  useFeedLoopWidget('your-project-key', {
    position: 'bottom-right',
    theme: 'default'
  });

  return <div>Your app content</div>;
}
```

### ✅ Angular Integration

#### Method 1: Static Script Tag
```html
<!-- In src/index.html -->
<script
  src="/widget/dist/feedloop-widget.min.js"
  data-project-key="your-project-key"
  integrity="sha384-JbHr1znDTuaqWaawscdEZfcOwRhoY3GkyzGxOAPS/KxthkBwErbjrx1gSVx/wQIP"
  crossorigin="anonymous">
</script>
```

#### Method 2: Service Implementation
```typescript
// feedloop-widget.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeedLoopWidgetService {
  private isLoaded = false;

  loadWidget(projectKey: string, options?: { position?: string; theme?: string }) {
    if (this.isLoaded) return;

    const script = document.createElement('script');
    script.src = '/widget/dist/feedloop-widget.min.js';
    script.setAttribute('data-project-key', projectKey);

    if (options?.position) {
      script.setAttribute('data-position', options.position);
    }
    if (options?.theme) {
      script.setAttribute('data-theme', options.theme);
    }

    script.onload = () => {
      this.isLoaded = true;
      console.log('FeeDLooP widget loaded');
    };

    document.head.appendChild(script);
  }

  removeWidget() {
    const widgets = document.querySelectorAll('.feedloop-widget-container');
    widgets.forEach(widget => widget.remove());

    const scripts = document.querySelectorAll('script[data-project-key]');
    scripts.forEach(script => script.remove());

    this.isLoaded = false;
  }
}

// app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FeedLoopWidgetService } from './services/feedloop-widget.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit, OnDestroy {

  constructor(private feedLoopService: FeedLoopWidgetService) {}

  ngOnInit() {
    this.feedLoopService.loadWidget('your-project-key');
  }

  ngOnDestroy() {
    this.feedLoopService.removeWidget();
  }
}
```

### ✅ Vue.js Integration

#### Method 1: Static Script Tag
```html
<!-- In public/index.html -->
<script
  src="/widget/dist/feedloop-widget.min.js"
  data-project-key="your-project-key"
  integrity="sha384-JbHr1znDTuaqWaawscdEZfcOwRhoY3GkyzGxOAPS/KxthkBwErbjrx1gSVx/wQIP"
  crossorigin="anonymous">
</script>
```

#### Method 2: Vue Component
```vue
<!-- FeedLoopWidget.vue -->
<template>
  <!-- Widget renders itself, no template needed -->
</template>

<script>
export default {
  name: 'FeedLoopWidget',
  props: {
    projectKey: {
      type: String,
      required: true
    },
    position: {
      type: String,
      default: 'bottom-right'
    },
    theme: {
      type: String,
      default: 'default'
    }
  },
  mounted() {
    this.loadWidget();
  },
  beforeUnmount() {
    this.removeWidget();
  },
  methods: {
    loadWidget() {
      const script = document.createElement('script');
      script.src = '/widget/dist/feedloop-widget.min.js';
      script.setAttribute('data-project-key', this.projectKey);
      script.setAttribute('data-position', this.position);
      script.setAttribute('data-theme', this.theme);

      script.onload = () => {
        console.log('FeeDLooP widget loaded');
      };

      document.head.appendChild(script);
    },
    removeWidget() {
      const widgets = document.querySelectorAll('.feedloop-widget-container');
      widgets.forEach(widget => widget.remove());
    }
  },
  watch: {
    projectKey() {
      this.removeWidget();
      this.$nextTick(() => {
        this.loadWidget();
      });
    }
  }
}
</script>
```

#### Usage:
```vue
<template>
  <div id="app">
    <FeedLoopWidget
      project-key="your-project-key"
      position="bottom-right"
      theme="default"
    />
    <!-- Your app content -->
  </div>
</template>
```

### ✅ Svelte Integration

```svelte
<!-- FeedLoopWidget.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';

  export let projectKey;
  export let position = 'bottom-right';
  export let theme = 'default';

  let scriptElement;

  onMount(() => {
    scriptElement = document.createElement('script');
    scriptElement.src = '/widget/dist/feedloop-widget.min.js';
    scriptElement.setAttribute('data-project-key', projectKey);
    scriptElement.setAttribute('data-position', position);
    scriptElement.setAttribute('data-theme', theme);

    document.head.appendChild(scriptElement);
  });

  onDestroy(() => {
    if (scriptElement) {
      document.head.removeChild(scriptElement);
    }
    const widgets = document.querySelectorAll('.feedloop-widget-container');
    widgets.forEach(widget => widget.remove());
  });
</script>

<!-- No template needed, widget renders itself -->
```

### ✅ Next.js Integration

```jsx
// components/FeedLoopWidget.js
import { useEffect } from 'react';
import Script from 'next/script';

const FeedLoopWidget = ({ projectKey }) => {
  return (
    <Script
      src="/widget/dist/feedloop-widget.min.js"
      data-project-key={projectKey}
      strategy="afterInteractive"
      integrity="sha384-JbHr1znDTuaqWaawscdEZfcOwRhoY3GkyzGxOAPS/KxthkBwErbjrx1gSVx/wQIP"
      crossOrigin="anonymous"
    />
  );
};

export default FeedLoopWidget;

// pages/_app.js
import FeedLoopWidget from '../components/FeedLoopWidget';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <FeedLoopWidget projectKey="your-project-key" />
    </>
  );
}

export default MyApp;
```

### ✅ Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <!-- Your content -->

  <!-- FeeDLooP Widget -->
  <script
    src="/widget/dist/feedloop-widget.min.js"
    data-project-key="your-project-key"
    integrity="sha384-JbHr1znDTuaqWaawscdEZfcOwRhoY3GkyzGxOAPS/KxthkBwErbjrx1gSVx/wQIP"
    crossorigin="anonymous">
  </script>
</body>
</html>
```

## 🔧 Configuration Options

All configuration is done via data attributes on the script tag:

```html
<script
  src="/widget/dist/feedloop-widget.min.js"
  data-project-key="your-project-key"        <!-- Required -->
  data-position="bottom-right"                <!-- Optional: bottom-right, bottom-left, top-right, top-left -->
  data-theme="default"                        <!-- Optional: default, dark, light -->
  integrity="sha384-..."                      <!-- Optional but recommended -->
  crossorigin="anonymous">                    <!-- Optional but recommended -->
</script>
```

## 🧪 Testing

The widget includes a comprehensive test page at `/test-framework-compatibility.html` that tests:

- ✅ Static loading
- ✅ Dynamic loading
- ✅ Multiple instances
- ✅ Remove and reload
- ✅ Responsive behavior
- ✅ Button visibility detection

## 🔒 Security Features

1. **Content Security Policy (CSP)** compatible
2. **Integrity hashes** for CDN deployment
3. **Cross-origin** support with proper headers
4. **Scoped CSS** prevents style conflicts
5. **Isolated DOM** tree prevents interference

## 📱 Responsive Design

The widget automatically adapts to different screen sizes:

- **Desktop (>768px)**: Fixed positioning bottom-right
- **Tablet (768px-480px)**: Responsive positioning
- **Mobile (<480px)**: Full-width overlay mode

## 🔍 Debugging

Access widget state and methods via the global object:

```javascript
// Check if widget is loaded
console.log(window.FeeDLooPWidget);

// Programmatically control widget
window.FeeDLooPWidget.open();    // Open widget
window.FeeDLooPWidget.close();   // Close widget
window.FeeDLooPWidget.reset();   // Reset form
window.FeeDLooPWidget.getState(); // Get current state
```

## 📊 Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 Best Practices

1. **Load early**: Include the script in `<head>` or early in `<body>`
2. **Use integrity hashes**: Protects against CDN tampering
3. **Test responsiveness**: Verify button visibility on all screen sizes
4. **Monitor console**: Widget logs debug information for troubleshooting
5. **CSP compatibility**: Widget works with strict Content Security Policies

## 🚨 Common Issues & Solutions

### Button Not Visible
- Check browser console for positioning adjustments
- Verify no conflicting CSS with high z-index
- Test on different viewport sizes

### Form Submission Fails
- Verify project key is correct
- Check network requests in browser DevTools
- Ensure API endpoint is accessible

### Multiple Widgets
- Only one widget instance should be active
- Use framework cleanup methods to remove widgets properly
- Check for duplicate script tags

## 📈 Framework-Specific Benefits

| Framework | Benefits |
|-----------|----------|
| **React** | Works with SSR, component lifecycle, hooks |
| **Angular** | Service injection, TypeScript support, lifecycle hooks |
| **Vue.js** | Reactivity, component props, template-free integration |
| **Svelte** | Minimal bundle impact, reactive declarations |
| **Next.js** | SSR compatible, automatic code splitting |
| **Vanilla** | Zero dependencies, fastest loading |

The FeeDLooP widget's framework-agnostic design ensures it works reliably across all modern web frameworks while maintaining optimal performance and security.