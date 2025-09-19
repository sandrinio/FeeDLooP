#!/bin/bash
set -e

echo "🚀 Starting FeeDLooP server with environment setup..."

# Run environment setup script
echo "📁 Setting up environment variables..."
node scripts/setup-env.js

# Source the .env.production file to set environment variables in current shell
if [ -f ".env.production" ]; then
    echo "📁 Loading environment variables from .env.production..."
    set -o allexport
    source .env.production
    set +o allexport

    # Verify critical environment variables are set
    echo "✅ Environment verification:"
    echo "   DATABASE_URL: ${DATABASE_URL:0:50}..."
    echo "   SUPABASE_URL: ${SUPABASE_URL}"
    echo "   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:50}... (${#SUPABASE_ANON_KEY} chars)"
    echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:50}... (${#SUPABASE_SERVICE_ROLE_KEY} chars)"
    echo "   NEXTAUTH_URL: ${NEXTAUTH_URL}"
    echo "   MINIO_ENDPOINT: ${MINIO_ENDPOINT}"
else
    echo "⚠️  .env.production file not found!"
fi

# Run debug script
echo "🐛 Running debug diagnostics..."
node docker-debug.js

# Start the Next.js server
echo "🌐 Starting Next.js server..."
exec node server.js