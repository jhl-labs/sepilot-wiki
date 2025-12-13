/**
 * Health Check API
 * Kubernetes liveness/readiness probe용
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.2.0',
    authMode: process.env.AUTH_MODE || 'public',
  });
}
