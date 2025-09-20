#!/usr/bin/env node

/**
 * Widget Build and Minification Script
 * T067: Widget build and minification script in scripts/build-widget.js
 *
 * This script:
 * 1. Combines CSS and JS files
 * 2. Minifies the code for production
 * 3. Creates both development and production builds
 * 4. Adds version information and build timestamps
 * 5. Generates integrity hashes for security
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const config = {
  sourceDir: path.join(__dirname, '../public/widget'),
  buildDir: path.join(__dirname, '../public/widget/dist'),
  files: {
    css: 'widget.css',
    js: 'feedloop-widget.js'
  },
  version: process.env.npm_package_version || '1.0.0',
  buildId: Date.now().toString(36)
}

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function createBuildDirectory() {
  if (!fs.existsSync(config.buildDir)) {
    fs.mkdirSync(config.buildDir, { recursive: true })
    log(`✓ Created build directory: ${config.buildDir}`, colors.green)
  }
}

function readSourceFile(filename) {
  const filePath = path.join(config.sourceDir, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf8')
}

function minifyCSS(css) {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around specific characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove leading/trailing whitespace
    .trim()
}

function minifyJS(js) {
  return js
    // Remove single-line comments (entire line comments only)
    .replace(/^[\t ]*\/\/.*$/gm, '')
    // Remove inline comments (at end of lines)
    .replace(/([^:"])\/\/.*$/gm, '$1')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace (but preserve strings)
    .replace(/\s+/g, ' ')
    // Remove whitespace around operators and punctuation
    .replace(/\s*([=+\-*/%<>!&|^~?:;,{}()[\]])\s*/g, '$1')
    // Remove whitespace after keywords
    .replace(/\b(var|let|const|if|else|for|while|do|switch|case|default|break|continue|function|return|try|catch|finally|throw|new|delete|typeof|instanceof|in|of)\s+/g, '$1 ')
    // Restore some necessary spaces
    .replace(/}else/g, '}else ')
    .replace(/}catch/g, '}catch ')
    .replace(/}finally/g, '}finally ')
    // Remove semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove leading/trailing whitespace
    .trim()
}

function generateIntegrityHash(content) {
  return crypto.createHash('sha384').update(content).digest('base64')
}

function createBuildInfo() {
  return {
    version: config.version,
    buildId: config.buildId,
    buildTime: new Date().toISOString(),
    files: {}
  }
}

function injectCSS(js, css) {
  // Find the CSS injection point in the JavaScript
  const cssPlaceholder = '/* CSS_PLACEHOLDER */'
  if (js.includes(cssPlaceholder)) {
    // Replace placeholder with actual CSS
    return js.replace(cssPlaceholder, css.replace(/'/g, "\\'").replace(/\n/g, '\\n'))
  } else {
    // If no placeholder, inject CSS at the beginning of the script
    const cssInjection = `
(function() {
  var style = document.createElement('style');
  style.textContent = '${css.replace(/'/g, "\\'").replace(/\n/g, '\\n')}';
  document.head.appendChild(style);
})();
`
    return cssInjection + js
  }
}

function addVersionInfo(js, buildInfo) {
  // Add version information to the widget
  const versionInfo = `
// FeeDLooP Widget v${buildInfo.version} (Build: ${buildInfo.buildId})
// Built on: ${buildInfo.buildTime}
// For more info: https://feedloop.com
`
  return versionInfo + js
}

function buildProduction() {
  log('\n🏗️  Building production widget...', colors.cyan)

  try {
    // Read source files
    log('📖 Reading source files...', colors.blue)
    const cssContent = readSourceFile(config.files.css)
    const jsContent = readSourceFile(config.files.js)

    // Minify files
    log('⚡ Minifying CSS...', colors.yellow)
    const minifiedCSS = minifyCSS(cssContent)

    log('⚡ Minifying JavaScript...', colors.yellow)
    const minifiedJS = minifyJS(jsContent)

    // Combine files
    log('🔗 Combining CSS and JavaScript...', colors.magenta)
    const combinedJS = injectCSS(minifiedJS, minifiedCSS)

    // Add build info
    const buildInfo = createBuildInfo()
    const finalJS = addVersionInfo(combinedJS, buildInfo)

    // Generate integrity hash
    const integrityHash = generateIntegrityHash(finalJS)
    buildInfo.files.widget = {
      filename: 'feedloop-widget.min.js',
      size: finalJS.length,
      integrity: `sha384-${integrityHash}`
    }

    // Write production files
    const prodFilePath = path.join(config.buildDir, 'feedloop-widget.min.js')
    fs.writeFileSync(prodFilePath, finalJS)

    // Write build info
    const buildInfoPath = path.join(config.buildDir, 'build-info.json')
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2))

    // Write integrity file for CDN usage
    const integrityPath = path.join(config.buildDir, 'integrity.txt')
    fs.writeFileSync(integrityPath, `sha384-${integrityHash}`)

    log('✅ Production build completed!', colors.green)
    log(`📦 Output: ${prodFilePath}`, colors.blue)
    log(`📊 Size: ${Math.round(finalJS.length / 1024 * 100) / 100} KB`, colors.blue)
    log(`🔒 Integrity: sha384-${integrityHash}`, colors.blue)

    return buildInfo

  } catch (error) {
    log(`❌ Production build failed: ${error.message}`, colors.red)
    throw error
  }
}

function buildDevelopment() {
  log('\n🛠️  Building development widget...', colors.cyan)

  try {
    // Read source files
    const cssContent = readSourceFile(config.files.css)
    const jsContent = readSourceFile(config.files.js)

    // For development, just combine without minification
    const combinedJS = injectCSS(jsContent, cssContent)

    // Add build info (unminified)
    const buildInfo = createBuildInfo()
    buildInfo.environment = 'development'
    const finalJS = addVersionInfo(combinedJS, buildInfo)

    // Write development file
    const devFilePath = path.join(config.buildDir, 'feedloop-widget.dev.js')
    fs.writeFileSync(devFilePath, finalJS)

    log('✅ Development build completed!', colors.green)
    log(`📦 Output: ${devFilePath}`, colors.blue)
    log(`📊 Size: ${Math.round(finalJS.length / 1024 * 100) / 100} KB`, colors.blue)

    return buildInfo

  } catch (error) {
    log(`❌ Development build failed: ${error.message}`, colors.red)
    throw error
  }
}

function generateUsageExamples(buildInfo) {
  const examples = `
# FeeDLooP Widget Usage Examples

## Production Usage
\`\`\`html
<!-- CDN Usage with integrity check -->
<script
  src="https://your-domain.com/widget/dist/feedloop-widget.min.js"
  integrity="${buildInfo.files.widget.integrity}"
  crossorigin="anonymous"
  data-project-key="YOUR_PROJECT_KEY"
></script>

<!-- Self-hosted without integrity -->
<script
  src="/widget/dist/feedloop-widget.min.js"
  data-project-key="YOUR_PROJECT_KEY"
></script>
\`\`\`

## Development Usage
\`\`\`html
<script src="/widget/dist/feedloop-widget.dev.js" data-project-key="YOUR_PROJECT_KEY"></script>
\`\`\`

## Configuration Options
\`\`\`html
<script
  src="/widget/dist/feedloop-widget.min.js"
  data-project-key="YOUR_PROJECT_KEY"
  data-position="bottom-right"
  data-theme="default"
></script>
\`\`\`

## Build Information
- Version: ${buildInfo.version}
- Build ID: ${buildInfo.buildId}
- Built: ${buildInfo.buildTime}
- Production Size: ${Math.round(buildInfo.files.widget.size / 1024 * 100) / 100} KB
`

  const examplesPath = path.join(config.buildDir, 'USAGE.md')
  fs.writeFileSync(examplesPath, examples.trim())

  log(`📝 Usage examples written to: ${examplesPath}`, colors.blue)
}

function createManifest(prodBuildInfo, devBuildInfo) {
  const manifest = {
    name: "FeeDLooP Widget",
    version: prodBuildInfo.version,
    description: "Embeddable feedback collection widget",
    buildTime: prodBuildInfo.buildTime,
    files: {
      production: {
        main: "feedloop-widget.min.js",
        size: prodBuildInfo.files.widget.size,
        integrity: prodBuildInfo.files.widget.integrity
      },
      development: {
        main: "feedloop-widget.dev.js"
      }
    },
    integration: {
      script: '<script src="/widget/dist/feedloop-widget.min.js" data-project-key="YOUR_PROJECT_KEY"></script>',
      attributes: {
        "data-project-key": "Required: Your project integration key",
        "data-position": "Optional: bottom-right|bottom-left|top-right|top-left",
        "data-theme": "Optional: default|dark|light"
      }
    }
  }

  const manifestPath = path.join(config.buildDir, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  log(`📋 Manifest created: ${manifestPath}`, colors.blue)
}

async function main() {
  try {
    log('🚀 FeeDLooP Widget Build Script', colors.bright)
    log('=====================================', colors.bright)

    // Setup
    createBuildDirectory()

    // Build both versions
    const prodBuildInfo = buildProduction()
    const devBuildInfo = buildDevelopment()

    // Generate additional files
    generateUsageExamples(prodBuildInfo)
    createManifest(prodBuildInfo, devBuildInfo)

    // Summary
    log('\n🎉 Build completed successfully!', colors.green)
    log('=====================================', colors.bright)
    log(`📁 Build directory: ${config.buildDir}`, colors.blue)
    log(`📦 Production: feedloop-widget.min.js (${Math.round(prodBuildInfo.files.widget.size / 1024 * 100) / 100} KB)`, colors.blue)
    log(`🛠️  Development: feedloop-widget.dev.js`, colors.blue)
    log(`📋 Manifest: manifest.json`, colors.blue)
    log(`📝 Usage: USAGE.md`, colors.blue)
    log(`🔒 Integrity: ${prodBuildInfo.files.widget.integrity}`, colors.blue)

  } catch (error) {
    log(`\n💥 Build failed: ${error.message}`, colors.red)
    process.exit(1)
  }
}

// Run the build script
main()