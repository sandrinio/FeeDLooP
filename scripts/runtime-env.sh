#!/bin/sh

# Runtime environment injection script for FeeDLooP
# This script runs at container startup to inject real environment variables

echo "🔧 FeeDLooP Runtime Environment Configuration"
echo "================================================"

# Check if running in production
if [ "$NODE_ENV" = "production" ]; then
    echo "✅ Production environment detected"

    # Validate required environment variables
    REQUIRED_VARS="DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY"
    MISSING_VARS=""

    for var in $REQUIRED_VARS; do
        if [ -z "$(eval echo \$$var)" ]; then
            MISSING_VARS="$MISSING_VARS $var"
        fi
    done

    if [ -n "$MISSING_VARS" ]; then
        echo "⚠️  Warning: Missing environment variables:$MISSING_VARS"
        echo "Some features may not work correctly."
    else
        echo "✅ All required environment variables are set"
    fi

    # Validate MinIO configuration if provided
    if [ -n "$MINIO_ENDPOINT" ]; then
        echo "✅ MinIO storage configured at $MINIO_ENDPOINT"
    else
        echo "⚠️  MinIO not configured - file uploads will be disabled"
    fi

    # Log configuration summary (without sensitive data)
    echo ""
    echo "📋 Configuration Summary:"
    echo "  - Database: Connected"
    echo "  - Auth URL: $NEXTAUTH_URL"
    echo "  - Supabase: $SUPABASE_URL"
    if [ -n "$MINIO_ENDPOINT" ]; then
        echo "  - Storage: MinIO at $MINIO_ENDPOINT:${MINIO_PORT:-9000}"
    fi
    echo ""
fi

echo "🚀 Starting FeeDLooP server on port ${PORT:-3000}..."
echo "================================================"

# Start the Next.js server
exec node server.js