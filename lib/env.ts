/**
 * Environment configuration loader for production
 * Reads from .env.production file to bypass Coolify truncation
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let envCache: Record<string, string> | null = null;

function loadProductionEnv(): Record<string, string> {
  if (envCache) {
    return envCache;
  }

  const envPath = join(process.cwd(), '.env.production');

  if (!existsSync(envPath)) {
    console.warn('⚠️  .env.production file not found, using process.env');
    envCache = process.env as Record<string, string>;
    return envCache;
  }

  const envContent = readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=');
      }
    }
  });

  // Merge with process.env, giving priority to .env.production
  envCache = { ...process.env, ...env };
  return envCache;
}

// Environment variables getter with production file fallback
export function getEnv(key: string): string | undefined {
  const env = loadProductionEnv();
  return env[key];
}

// Required environment variables with fallback
export const ENV = {
  get DATABASE_URL() {
    return getEnv('DATABASE_URL') || process.env.DATABASE_URL;
  },
  get NEXTAUTH_SECRET() {
    return getEnv('NEXTAUTH_SECRET') || process.env.NEXTAUTH_SECRET;
  },
  get NEXTAUTH_URL() {
    return getEnv('NEXTAUTH_URL') || process.env.NEXTAUTH_URL;
  },
  get SUPABASE_URL() {
    return getEnv('SUPABASE_URL') || process.env.SUPABASE_URL;
  },
  get SUPABASE_ANON_KEY() {
    return getEnv('SUPABASE_ANON_KEY') || process.env.SUPABASE_ANON_KEY;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getEnv('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
  get MINIO_ENDPOINT() {
    return getEnv('MINIO_ENDPOINT') || process.env.MINIO_ENDPOINT;
  },
  get MINIO_ACCESS_KEY() {
    return getEnv('MINIO_ACCESS_KEY') || process.env.MINIO_ACCESS_KEY;
  },
  get MINIO_SECRET_KEY() {
    return getEnv('MINIO_SECRET_KEY') || process.env.MINIO_SECRET_KEY;
  },
  get MINIO_PORT() {
    return getEnv('MINIO_PORT') || process.env.MINIO_PORT;
  },
  get MINIO_USE_SSL() {
    return getEnv('MINIO_USE_SSL') || process.env.MINIO_USE_SSL;
  },
  get NODE_ENV() {
    return getEnv('NODE_ENV') || process.env.NODE_ENV;
  }
};

// Validation function
export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !ENV[key as keyof typeof ENV]);

  return {
    valid: missing.length === 0,
    missing
  };
}