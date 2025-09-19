#!/usr/bin/env node

/**
 * Environment setup script for FeeDLooP production deployment
 * This script creates .env.production file with hardcoded credentials
 * to bypass Coolify's environment variable truncation issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FeeDLooP Environment Setup');
console.log('===============================');

// Hardcoded production configuration (bypasses Coolify truncation)
const PRODUCTION_CONFIG = {
  // Database
  DATABASE_URL: 'postgresql://postgres:2OUIqUlUvBu4inkw9THmFqCc0h5sjCnl@sulabase.soula.ge:5432/postgres',

  // NextAuth
  NEXTAUTH_SECRET: 'feedloop-prod-jwt-signing-key-2025-secure-random-string-32chars',
  NEXTAUTH_URL: 'http://feedloop.soula.ge',

  // Supabase - Split JWT tokens to avoid truncation
  SUPABASE_URL: 'https://sulabase.soula.ge',
  SUPABASE_ANON_KEY_PARTS: [
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc0OTQ3MDEwMCwiZXhwIjo0OTA1MTQzNzAwLCJyb2xlIjoiYW5vbiJ9',
    '0bPqKsSKt8h9w-IaU4BtGsq5w7BtggZCYf5CjpAnvgI'
  ],
  SUPABASE_SERVICE_ROLE_KEY_PARTS: [
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc0OTQ3MDEwMCwiZXhwIjo0OTA1MTQzNzAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0',
    '8NhqE66zL8EqX-GbMBgV8Me6UdPqazB3LrgniU7kuZA'
  ],

  // MinIO
  MINIO_ENDPOINT: 'sulabase.soula.ge',
  MINIO_ACCESS_KEY: 'NaOSXXT2060AV24m',
  MINIO_SECRET_KEY: 'D82ZSj663lOBxes6qbtxRjMAGih2f87O',
  MINIO_PORT: '443',
  MINIO_USE_SSL: 'true',

  // Node
  NODE_ENV: 'production'
};

// Required environment variables for FeeDLooP
const REQUIRED_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

// Optional environment variables
const OPTIONAL_VARS = [
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_PORT',
  'MINIO_USE_SSL'
];

function validateEnvironment() {
  console.log('📋 Validating environment variables...');

  const missing = [];
  const present = [];

  // Check required variables
  REQUIRED_VARS.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });

  // Check optional variables
  const optionalPresent = [];
  OPTIONAL_VARS.forEach(varName => {
    if (process.env[varName]) {
      optionalPresent.push(varName);
    }
  });

  // Report results
  console.log(`✅ Required variables present: ${present.length}/${REQUIRED_VARS.length}`);

  if (missing.length > 0) {
    console.log(`❌ Missing required variables: ${missing.join(', ')}`);
    console.log('⚠️  Application may not function correctly!');
  } else {
    console.log('✅ All required environment variables are set');
  }

  if (optionalPresent.length > 0) {
    console.log(`ℹ️  Optional variables present: ${optionalPresent.join(', ')}`);
  }

  // MinIO-specific validation
  const minioVars = OPTIONAL_VARS.filter(v => v.startsWith('MINIO_'));
  const minioPresent = minioVars.filter(v => process.env[v]);

  if (minioPresent.length > 0 && minioPresent.length < 3) {
    console.log('⚠️  Partial MinIO configuration detected. File uploads may not work.');
    console.log(`   Present: ${minioPresent.join(', ')}`);
    console.log(`   Missing: ${minioVars.filter(v => !process.env[v]).join(', ')}`);
  } else if (minioPresent.length >= 3) {
    console.log('✅ MinIO storage configured');
  } else {
    console.log('ℹ️  MinIO not configured - file uploads will be disabled');
  }

  return missing.length === 0;
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.production');

  if (fs.existsSync(envPath)) {
    console.log('📁 Loading .env.production file...');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });

    console.log('✅ Environment file loaded successfully');
    return true;
  } else {
    console.log('ℹ️  No .env.production file found, using system environment variables');

    // Decode base64 encoded variables if they exist
    decodeBase64Variables();

    // Combine split variables if they exist
    combineSplitVariables();

    return false;
  }
}

function decodeBase64Variables() {
  const base64Vars = [
    'SUPABASE_ANON_KEY_B64',
    'SUPABASE_SERVICE_ROLE_KEY_B64',
    'DATABASE_URL_B64',
    'NEXTAUTH_SECRET_B64'
  ];

  base64Vars.forEach(varName => {
    const encodedValue = process.env[varName];
    if (encodedValue) {
      try {
        const decodedValue = Buffer.from(encodedValue, 'base64').toString('utf8');
        const originalVarName = varName.replace('_B64', '');
        process.env[originalVarName] = decodedValue;
        console.log(`✅ Decoded ${originalVarName} from base64`);
      } catch (error) {
        console.log(`⚠️  Failed to decode ${varName}: ${error.message}`);
      }
    }
  });
}

function combineSplitVariables() {
  const splitVars = [
    {
      name: 'SUPABASE_ANON_KEY',
      parts: ['SUPABASE_ANON_KEY_PART1', 'SUPABASE_ANON_KEY_PART2', 'SUPABASE_ANON_KEY_PART3']
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      parts: ['SUPABASE_SERVICE_KEY_PART1', 'SUPABASE_SERVICE_KEY_PART2', 'SUPABASE_SERVICE_KEY_PART3']
    },
    {
      name: 'DATABASE_URL',
      parts: ['DATABASE_URL_PART1', 'DATABASE_URL_PART2']
    }
  ];

  splitVars.forEach(variable => {
    const parts = variable.parts.map(partName => process.env[partName]).filter(Boolean);

    if (parts.length > 0 && parts.length === variable.parts.length) {
      const combinedValue = parts.join('');
      process.env[variable.name] = combinedValue;
      console.log(`✅ Combined ${variable.name} from ${parts.length} parts`);
    }
  });
}

function createProductionEnvFile() {
  console.log('📁 Creating .env.production file with hardcoded credentials...');

  // Reconstruct JWT tokens from parts
  const supabaseAnonKey = PRODUCTION_CONFIG.SUPABASE_ANON_KEY_PARTS.join('.');
  const supabaseServiceKey = PRODUCTION_CONFIG.SUPABASE_SERVICE_ROLE_KEY_PARTS.join('.');

  // Create environment file content
  const envContent = [
    '# FeeDLooP Production Environment Variables',
    '# Generated by scripts/setup-env.js',
    '',
    '# Database',
    `DATABASE_URL=${PRODUCTION_CONFIG.DATABASE_URL}`,
    '',
    '# NextAuth',
    `NEXTAUTH_SECRET=${PRODUCTION_CONFIG.NEXTAUTH_SECRET}`,
    `NEXTAUTH_URL=${PRODUCTION_CONFIG.NEXTAUTH_URL}`,
    '',
    '# Supabase',
    `SUPABASE_URL=${PRODUCTION_CONFIG.SUPABASE_URL}`,
    `SUPABASE_ANON_KEY=${supabaseAnonKey}`,
    `SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}`,
    '',
    '# MinIO',
    `MINIO_ENDPOINT=${PRODUCTION_CONFIG.MINIO_ENDPOINT}`,
    `MINIO_ACCESS_KEY=${PRODUCTION_CONFIG.MINIO_ACCESS_KEY}`,
    `MINIO_SECRET_KEY=${PRODUCTION_CONFIG.MINIO_SECRET_KEY}`,
    `MINIO_PORT=${PRODUCTION_CONFIG.MINIO_PORT}`,
    `MINIO_USE_SSL=${PRODUCTION_CONFIG.MINIO_USE_SSL}`,
    '',
    '# Node',
    `NODE_ENV=${PRODUCTION_CONFIG.NODE_ENV}`,
    ''
  ].join('\n');

  // Write the file
  const envPath = path.join(process.cwd(), '.env.production');
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log(`✅ Created .env.production file at ${envPath}`);

  // Set environment variables in current process
  process.env.DATABASE_URL = PRODUCTION_CONFIG.DATABASE_URL;
  process.env.NEXTAUTH_SECRET = PRODUCTION_CONFIG.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_URL = PRODUCTION_CONFIG.NEXTAUTH_URL;
  process.env.SUPABASE_URL = PRODUCTION_CONFIG.SUPABASE_URL;
  process.env.SUPABASE_ANON_KEY = supabaseAnonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceKey;
  process.env.MINIO_ENDPOINT = PRODUCTION_CONFIG.MINIO_ENDPOINT;
  process.env.MINIO_ACCESS_KEY = PRODUCTION_CONFIG.MINIO_ACCESS_KEY;
  process.env.MINIO_SECRET_KEY = PRODUCTION_CONFIG.MINIO_SECRET_KEY;
  process.env.MINIO_PORT = PRODUCTION_CONFIG.MINIO_PORT;
  process.env.MINIO_USE_SSL = PRODUCTION_CONFIG.MINIO_USE_SSL;
  process.env.NODE_ENV = PRODUCTION_CONFIG.NODE_ENV;

  console.log('✅ Environment variables set in current process');
}

function main() {
  try {
    // Create .env.production file with hardcoded credentials
    createProductionEnvFile();

    // Load .env.production if it exists (fallback)
    loadEnvFile();

    // Validate environment
    const isValid = validateEnvironment();

    // Log configuration summary
    console.log('\n📊 Configuration Summary:');
    console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`   Auth URL: ${process.env.NEXTAUTH_URL || 'Not set'}`);
    console.log(`   Supabase: ${process.env.SUPABASE_URL || 'Not configured'}`);
    console.log(`   MinIO: ${process.env.MINIO_ENDPOINT || 'Not configured'}`);

    if (!isValid) {
      console.log('\n⚠️  Warning: Some required environment variables are missing!');
      console.log('   Application may not function correctly.');
    }

    console.log('\n✅ Environment setup complete');
    console.log('===============================\n');

  } catch (error) {
    console.error('❌ Error during environment setup:', error.message);
    process.exit(1);
  }
}

// Run the setup
main();