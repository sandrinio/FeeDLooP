import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker containers and monitoring
 * Returns basic system status and service availability
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Basic health check response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      services: {
        database: process.env.DATABASE_URL ? 'configured' : 'not_configured',
        supabase: process.env.SUPABASE_URL ? 'configured' : 'not_configured',
        minio: process.env.MINIO_ENDPOINT ? 'configured' : 'not_configured',
        nextauth: process.env.NEXTAUTH_SECRET ? 'configured' : 'not_configured',
      },
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}