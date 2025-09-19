#!/usr/bin/env node

/**
 * Docker debug script for FeeDLooP
 * Provides startup diagnostics and system information
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🐛 FeeDLooP Docker Debug Information');
console.log('====================================');

function getSystemInfo() {
  console.log('📱 System Information:');
  console.log(`   Platform: ${os.platform()}`);
  console.log(`   Architecture: ${os.arch()}`);
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
  console.log(`   Free Memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
  console.log(`   CPU Count: ${os.cpus().length}`);
  console.log(`   Uptime: ${Math.round(os.uptime() / 60)} minutes`);
}

function checkFileSystem() {
  console.log('\n📁 File System Check:');

  const checkPaths = [
    './server.js',
    './public',
    './.next',
    './.next/static',
    './.env.production',
    './scripts/setup-env.js'
  ];

  checkPaths.forEach(filePath => {
    try {
      const fullPath = path.resolve(filePath);
      const exists = fs.existsSync(fullPath);
      const stat = exists ? fs.statSync(fullPath) : null;

      if (exists) {
        const type = stat.isDirectory() ? 'DIR' : 'FILE';
        const size = stat.isFile() ? ` (${Math.round(stat.size / 1024)}KB)` : '';
        console.log(`   ✅ ${filePath} [${type}]${size}`);
      } else {
        console.log(`   ❌ ${filePath} [MISSING]`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${filePath} [ERROR: ${error.message}]`);
    }
  });
}

function checkEnvironment() {
  console.log('\n🌍 Environment Variables:');

  const criticalVars = [
    'NODE_ENV',
    'PORT',
    'HOSTNAME',
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  criticalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      const isSensitive = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD');
      const displayValue = isSensitive ? '***HIDDEN***' : value;
      console.log(`   ✅ ${varName}=${displayValue}`);
    } else {
      console.log(`   ❌ ${varName}=NOT_SET`);
    }
  });

  // Check optional MinIO variables
  const minioVars = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_PORT', 'MINIO_USE_SSL'];
  const minioPresent = minioVars.filter(v => process.env[v]);

  if (minioPresent.length > 0) {
    console.log(`\n📦 MinIO Configuration (${minioPresent.length}/${minioVars.length} vars set):`);
    minioVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        const isSensitive = varName.includes('KEY') || varName.includes('SECRET');
        const displayValue = isSensitive ? '***HIDDEN***' : value;
        console.log(`   ✅ ${varName}=${displayValue}`);
      } else {
        console.log(`   ⚪ ${varName}=NOT_SET`);
      }
    });
  }
}

function checkNetworking() {
  console.log('\n🌐 Network Configuration:');
  console.log(`   Listening on: ${process.env.HOSTNAME || '0.0.0.0'}:${process.env.PORT || 3000}`);
  console.log(`   Next.js URL: ${process.env.NEXTAUTH_URL || 'Not configured'}`);

  // Check if we can resolve localhost
  try {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = Object.keys(networkInterfaces).length;
    console.log(`   Network Interfaces: ${interfaces} found`);
  } catch (error) {
    console.log(`   Network Interfaces: Error - ${error.message}`);
  }
}

function checkServices() {
  console.log('\n🔗 External Services:');

  // Database check
  if (process.env.DATABASE_URL) {
    try {
      const dbUrl = new URL(process.env.DATABASE_URL);
      console.log(`   📊 Database: ${dbUrl.hostname}:${dbUrl.port || 5432} (${dbUrl.protocol.replace(':', '')})`);
    } catch (error) {
      console.log(`   📊 Database: Invalid URL format`);
    }
  } else {
    console.log(`   📊 Database: Not configured`);
  }

  // Supabase check
  if (process.env.SUPABASE_URL) {
    try {
      const supabaseUrl = new URL(process.env.SUPABASE_URL);
      console.log(`   🔥 Supabase: ${supabaseUrl.hostname} (${supabaseUrl.protocol.replace(':', '')})`);
    } catch (error) {
      console.log(`   🔥 Supabase: Invalid URL format`);
    }
  } else {
    console.log(`   🔥 Supabase: Not configured`);
  }

  // MinIO check
  if (process.env.MINIO_ENDPOINT) {
    const port = process.env.MINIO_PORT || '9000';
    const ssl = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    console.log(`   📦 MinIO: ${process.env.MINIO_ENDPOINT}:${port} (${ssl})`);
  } else {
    console.log(`   📦 MinIO: Not configured`);
  }
}

function main() {
  try {
    getSystemInfo();
    checkFileSystem();
    checkEnvironment();
    checkNetworking();
    checkServices();

    console.log('\n🚀 Ready to start FeeDLooP server!');
    console.log('====================================\n');

  } catch (error) {
    console.error('❌ Debug script error:', error.message);
    console.log('Continuing with startup...\n');
  }
}

// Run debug checks
main();