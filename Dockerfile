# Production-optimized Dockerfile for Coolify deployment
# Handles environment variables via mounted .env.production file

FROM node:20-alpine AS deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Stage 2: Build dependencies and application
FROM node:20-alpine AS builder
WORKDIR /app

# Install system dependencies needed for build
RUN apk add --no-cache libc6-compat

# Copy package files for full install
COPY package*.json ./

# Set build environment for native modules
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install ALL dependencies (including dev) for build only
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Configure Next.js for standalone build
RUN echo 'module.exports = { output: "standalone" }' > next.config.js

# Build the application
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime utilities
RUN apk add --no-cache curl dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create scripts directory and environment loader
RUN mkdir -p ./scripts && \
    echo '#!/bin/sh' > /app/scripts/load-env.sh && \
    echo 'echo "🔍 FeeDLooP Environment Loader"' >> /app/scripts/load-env.sh && \
    echo 'if [ -f /app/.env.production ]; then' >> /app/scripts/load-env.sh && \
    echo '  echo "✅ Loading .env.production file"' >> /app/scripts/load-env.sh && \
    echo '  set -a' >> /app/scripts/load-env.sh && \
    echo '  . /app/.env.production' >> /app/scripts/load-env.sh && \
    echo '  set +a' >> /app/scripts/load-env.sh && \
    echo '  echo "✅ Environment variables loaded successfully"' >> /app/scripts/load-env.sh && \
    echo 'else' >> /app/scripts/load-env.sh && \
    echo '  echo "⚠️  No .env.production file found"' >> /app/scripts/load-env.sh && \
    echo '  echo "🔄 Using Coolify environment variables"' >> /app/scripts/load-env.sh && \
    echo 'fi' >> /app/scripts/load-env.sh && \
    echo 'echo "🚀 Starting FeeDLooP server on port $PORT"' >> /app/scripts/load-env.sh && \
    echo 'exec node server.js' >> /app/scripts/load-env.sh && \
    chmod +x /app/scripts/load-env.sh

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/test-db || exit 1

# Use environment loader script
ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/scripts/load-env.sh"]