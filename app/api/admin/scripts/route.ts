/**
 * 스크립트 목록 API
 * GET /api/admin/scripts - 실행 가능한 스크립트 목록
 */
import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';
import { checkAdminApiAuth } from '@/lib/admin-auth';
import { SCRIPT_DEFINITIONS } from '@/lib/scripts-config';

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminApiAuth(request)) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const scripts = SCRIPT_DEFINITIONS.map((script) => ({
      ...script,
      available: existsSync(join(process.cwd(), script.path)),
    }));

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('[Scripts API] 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '스크립트 목록 조회 실패' },
      { status: 500 }
    );
  }
}
