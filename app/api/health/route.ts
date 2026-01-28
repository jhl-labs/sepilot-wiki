/**
 * Health Check API
 * Kubernetes liveness/readiness probe용
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // 보안: 민감한 정보 노출하지 않음
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
