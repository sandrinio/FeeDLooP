# FeeDLooP Coolify Deployment Guide

## Overview

This guide provides complete instructions for deploying FeeDLooP to production using Coolify, a self-hosted PaaS platform. FeeDLooP is configured for production deployment with Docker containers, environment variable management, and health monitoring.

## 📋 Prerequisites

### Coolify Requirements
- **Coolify v4+** installed on your VPS
- **Docker** and **Docker Compose** available
- **Domain name** configured for your application
- **SSL certificate** (handled automatically by Coolify)

### External Services Required
- **Supabase Project** (PostgreSQL database)
- **MinIO Instance** (S3-compatible storage) - Optional but recommended
- **GitHub Repository** (for source code)

## 🚀 Quick Deployment

### Step 1: Repository Configuration

1. **Fork or Clone Repository**:
   ```bash
   git clone https://github.com/your-username/FeeDLooP.git
   cd FeeDLooP
   ```

2. **Verify Required Files**:
   - ✅ `Dockerfile.coolify` - Production Docker configuration
   - ✅ `next.config.ts` - Next.js standalone build configuration
   - ✅ `package.json` - Dependencies and build scripts

### Step 2: Coolify Application Setup

1. **Create New Application** in Coolify Dashboard
2. **Select Source**: Choose "Git Repository"
3. **Repository URL**: `https://github.com/your-username/FeeDLooP.git`
4. **Branch**: `main` (or your production branch)
5. **Build Configuration**:
   - **Dockerfile**: `Dockerfile.coolify`
   - **Build Command**: `npm run build`
   - **Port**: `3000`

### Step 3: Environment Variables

Configure the following environment variables in Coolify:

#### Core Application
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-very-secure-random-32-character-string
PORT=3000
HOSTNAME=0.0.0.0
```

#### Database (Supabase)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
```

#### Split Keys Support (For Long Keys)
If your Supabase keys are too long for Coolify's environment variable limits:
```bash
SUPABASE_ANON_KEY_PART1=first-part-of-anon-key
SUPABASE_ANON_KEY_PART2=second-part-of-anon-key
SUPABASE_SERVICE_KEY_PART1=first-part-of-service-key
SUPABASE_SERVICE_KEY_PART2=second-part-of-service-key
```

#### File Storage (MinIO - Optional)
```bash
MINIO_ENDPOINT=your-minio-endpoint.com
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key
MINIO_BUCKET=feedloop-attachments
MINIO_PORT=9000
MINIO_USE_SSL=true
```

#### Widget Configuration
```bash
WIDGET_ALLOWED_DOMAINS=your-domain.com,*.your-domain.com
CORS_ORIGIN=https://your-domain.com
```

### Step 4: Health Check Configuration

Coolify will automatically use the health check defined in `Dockerfile.coolify`:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

### Step 5: Domain and SSL

1. **Configure Domain** in Coolify Application Settings
2. **SSL Certificate** is automatically provisioned via Let's Encrypt
3. **Test Endpoint**: `https://your-domain.com/api/health`

## 🔧 Advanced Configuration

### Custom Build Arguments

Add build arguments in Coolify if needed:
```bash
NODE_OPTIONS=--max-old-space-size=4096
NEXT_TELEMETRY_DISABLED=1
```

### Resource Limits

Configure resource limits in Coolify:
- **Memory Limit**: 2GB (recommended)
- **CPU Limit**: 2 cores (recommended)
- **Storage**: 10GB minimum

### Persistent Data

Configure volumes for persistent storage:
```bash
# Widget builds and assets
/app/public/widget -> persistent volume

# Application logs (optional)
/app/logs -> persistent volume
```

## 📊 Monitoring and Logs

### Health Monitoring

FeeDLooP includes comprehensive health checks:

1. **API Health**: `GET /api/health`
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-12-19T10:00:00Z",
     "version": "1.0.0",
     "services": {
       "database": "healthy",
       "storage": "healthy",
       "auth": "healthy"
     }
   }
   ```

2. **Database Test**: `GET /api/test-db`
3. **Widget Test**: `GET /widget-demo.html`

### Application Logs

Monitor logs in Coolify dashboard:
```bash
# View real-time logs
docker logs -f container-name

# Check startup logs
docker logs container-name | head -50
```

### Performance Monitoring

Monitor key metrics:
- **Response Time**: API endpoints should respond <200ms
- **Widget Load Time**: Should load <500ms
- **Memory Usage**: Should stay under 1GB
- **Error Rate**: Should be <1%

## 🔐 Security Configuration

### Environment Security
- ✅ All secrets stored in Coolify environment variables
- ✅ No `.env` files in Docker images
- ✅ Split key support for long credentials

### Network Security
- ✅ HTTPS enforced with SSL certificates
- ✅ CORS configured for widget embedding
- ✅ Security headers implemented
- ✅ Rate limiting enabled

### Database Security
- ✅ Row Level Security (RLS) policies enabled
- ✅ Service role key for admin operations
- ✅ Anon key for public widget access

## 🚨 Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs for startup errors
docker logs container-name

# Common fixes:
- Verify all required environment variables are set
- Check Supabase connection (DATABASE_URL)
- Ensure split keys are properly configured
```

#### 2. Database Connection Errors
```bash
# Test database connectivity
curl https://your-domain.com/api/test-db

# Verify:
- SUPABASE_URL is correct
- DATABASE_URL includes correct password
- Service role key has proper permissions
```

#### 3. Widget Not Loading
```bash
# Test widget endpoint
curl https://your-domain.com/widget/feedloop-widget.js

# Check:
- CORS headers are properly configured
- Widget files are included in build
- CDN settings if applicable
```

#### 4. File Upload Issues
```bash
# Test MinIO connection
curl https://your-domain.com/api/uploads

# Verify:
- MinIO credentials are correct
- Bucket exists and is accessible
- Network connectivity to MinIO endpoint
```

### Performance Issues

#### High Memory Usage
```bash
# Increase memory limit in Coolify
Memory Limit: 2GB → 4GB

# Or optimize Node.js
NODE_OPTIONS=--max-old-space-size=2048
```

#### Slow Response Times
```bash
# Enable Next.js optimizations
NEXT_TELEMETRY_DISABLED=1

# Check database performance
- Review Supabase dashboard for slow queries
- Consider database connection pooling
```

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=production
DEBUG=feedloop:*
LOG_LEVEL=debug
```

## 📈 Scaling and Updates

### Horizontal Scaling

Coolify supports horizontal scaling:
1. **Multiple Instances**: Deploy multiple containers
2. **Load Balancing**: Configure load balancer
3. **Database Scaling**: Use Supabase read replicas

### Zero-Downtime Deployments

Configure rolling updates:
1. **Health Checks**: Ensure health endpoint is working
2. **Graceful Shutdown**: Docker containers handle SIGTERM
3. **Database Migrations**: Run during deployment

### Automatic Updates

Set up automatic deployments:
1. **GitHub Webhooks**: Configure in Coolify
2. **Branch Protection**: Use staging → production workflow
3. **Rollback Strategy**: Keep previous Docker images

## 🔄 CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Coolify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Coolify
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}"
```

### Environment-Specific Deployments

Configure multiple environments:
- **Development**: `dev.your-domain.com`
- **Staging**: `staging.your-domain.com`
- **Production**: `your-domain.com`

## ✅ Post-Deployment Checklist

### Verification Steps

1. **Application Health**:
   - [ ] `https://your-domain.com/api/health` returns 200
   - [ ] Database connection working
   - [ ] Authentication system functional

2. **Widget Functionality**:
   - [ ] Widget loads on test page: `/widget-demo.html`
   - [ ] Feedback submission works
   - [ ] File uploads functional (if MinIO configured)

3. **Performance**:
   - [ ] Page load times <2 seconds
   - [ ] API responses <200ms
   - [ ] Widget loads <500ms

4. **Security**:
   - [ ] HTTPS enabled and working
   - [ ] CORS headers properly configured
   - [ ] No sensitive data in logs

5. **Monitoring**:
   - [ ] Health checks passing
   - [ ] Logs accessible in Coolify
   - [ ] Error tracking configured

### Production Testing

Test core functionality:
```bash
# Test user registration
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'

# Test project creation (requires auth)
curl -X POST https://your-domain.com/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: session-cookie" \
  -d '{"name":"Test Project"}'

# Test widget submission
curl -X POST https://your-domain.com/api/widget/submit \
  -F "project_key=your-project-key" \
  -F "type=feedback" \
  -F "title=Test Feedback" \
  -F "description=Testing deployment"
```

## 📞 Support

### Resources
- **Coolify Documentation**: https://coolify.io/docs
- **FeeDLooP API Docs**: `/docs/api-specification.yaml`
- **Widget Integration**: `/docs/FRAMEWORK_INTEGRATION.md`

### Getting Help
1. **Check Application Logs** in Coolify dashboard
2. **Review Health Endpoints** for system status
3. **Verify Environment Variables** are correctly set
4. **Test Database Connectivity** via health checks

### Emergency Procedures
1. **Rollback**: Use previous Docker image in Coolify
2. **Scale Down**: Reduce resources if overloaded
3. **Database Issues**: Check Supabase dashboard
4. **Contact Support**: Create issue in repository

---

## 📋 Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Application base URL | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | JWT signing secret | `random-32-char-string` |
| `SUPABASE_URL` | Supabase project URL | `https://abc.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | MinIO storage endpoint | `localhost` |
| `MINIO_ACCESS_KEY` | MinIO access key | - |
| `MINIO_SECRET_KEY` | MinIO secret key | - |
| `WIDGET_ALLOWED_DOMAINS` | Domains for widget CORS | `*` |
| `LOG_LEVEL` | Application log level | `info` |

## 🎯 Performance Targets

### Response Time Goals
- **API Endpoints**: <200ms average
- **Widget Load**: <500ms initial load
- **Page Render**: <2s first contentful paint
- **Database Queries**: <50ms average

### Resource Usage
- **Memory**: <1GB normal operation
- **CPU**: <50% average utilization
- **Storage**: 10GB minimum, scales with attachments
- **Network**: Minimal bandwidth usage

This deployment guide ensures a production-ready FeeDLooP installation with proper monitoring, security, and scaling capabilities.