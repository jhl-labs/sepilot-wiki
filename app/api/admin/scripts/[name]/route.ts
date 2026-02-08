/**
 * 개별 스크립트 실행 API
 * POST /api/admin/scripts/[name] - 스크립트 실행
 */
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { checkAdminApiAuth } from '@/lib/admin-auth';
import { SCRIPT_DEFINITIONS } from '@/lib/scripts-config';
import { recordScriptExecution } from '@/lib/scheduler';

interface RouteParams {
  params: Promise<{ name: string }>;
}

// 서버 사이드 동시 실행 방지
const runningScripts = new Set<string>();
const MAX_CONCURRENT_SCRIPTS = 3;

// stdout/stderr 최대 버퍼 크기 (1MB)
const MAX_OUTPUT_SIZE = 1024 * 1024;

// 스크립트 이름 → 정의 매핑
const SCRIPT_MAP = Object.fromEntries(
  SCRIPT_DEFINITIONS.map((s) => [s.name, { path: s.path, requiredEnv: s.requiredEnv }])
);

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { name } = await params;

    if (!checkAdminApiAuth(request)) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const scriptDef = SCRIPT_MAP[name];
    if (!scriptDef) {
      return NextResponse.json(
        { error: `스크립트 '${name}'을 찾을 수 없음` },
        { status: 404 }
      );
    }

    const scriptPath = join(process.cwd(), scriptDef.path);
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { error: `스크립트 파일이 존재하지 않음: ${scriptDef.path}` },
        { status: 404 }
      );
    }

    // 요청 body 파싱
    let body: { env?: Record<string, string>; dryRun?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // body 없는 경우 기본값 사용
    }

    const rawEnvVars = body.env || {};

    // 화이트리스트: requiredEnv에 정의된 키만 허용
    const allowedKeys = new Set(scriptDef.requiredEnv);
    const envVars: Record<string, string> = {};
    for (const key of allowedKeys) {
      const value = rawEnvVars[key];
      if (typeof value === 'string') {
        // 값 검증: 알파벳, 숫자, 하이픈, 점, 밑줄만 허용
        const sanitized = value.trim();
        if (sanitized && /^[a-zA-Z0-9._-]+$/.test(sanitized)) {
          envVars[key] = sanitized;
        }
      }
    }

    // 필수 환경변수 확인
    const missingEnv = scriptDef.requiredEnv.filter((key) => !envVars[key]);
    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `필수 환경변수 누락 또는 형식 오류: ${missingEnv.join(', ')}` },
        { status: 400 }
      );
    }

    // 동시 실행 방지: 동일 스크립트
    if (runningScripts.has(name)) {
      return NextResponse.json(
        { error: `스크립트 '${name}'이(가) 이미 실행 중입니다` },
        { status: 409 }
      );
    }

    // 전체 동시 실행 수 제한
    if (runningScripts.size >= MAX_CONCURRENT_SCRIPTS) {
      return NextResponse.json(
        { error: `동시 실행 제한 초과 (최대 ${MAX_CONCURRENT_SCRIPTS}개)` },
        { status: 429 }
      );
    }

    runningScripts.add(name);

    try {
      const startTime = Date.now();

      // 스크립트 실행
      const result = await runScript(scriptPath, {
        ...envVars,
        ...(body.dryRun ? { DRY_RUN: 'true' } : {}),
      });

      // 히스토리에 기록 (백그라운드)
      recordScriptExecution({
        id: `script-${name}-${startTime}`,
        jobName: `script:${name}`,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        success: result.success,
        message: result.message,
        duration: result.duration,
        error: result.error,
      }).catch(() => {});

      return NextResponse.json({
        scriptName: name,
        ...result,
      });
    } finally {
      runningScripts.delete(name);
    }
  } catch (error) {
    console.error('[Scripts API] 실행 오류:', error);
    return NextResponse.json(
      { error: '스크립트 실행 실패' },
      { status: 500 }
    );
  }
}

/**
 * 출력에서 민감 정보 마스킹
 */
function maskSensitiveInfo(text: string): string {
  let masked = text;
  // 홈 디렉토리 경로 마스킹
  masked = masked.replace(/\/home\/[a-zA-Z0-9._-]+/g, '/home/***');
  masked = masked.replace(/\/Users\/[a-zA-Z0-9._-]+/g, '/Users/***');
  // 토큰/키/비밀번호 패턴 마스킹
  masked = masked.replace(/(token|key|secret|password|auth|credential)[=:]\s*\S+/gi, '$1=***');
  // 환경변수 값 마스킹
  masked = masked.replace(/(GITHUB_TOKEN|OPENAI_API_KEY|SCHEDULER_API_KEY|DATABASE_URL|REDIS_URL|AUTH_SECRET)=\S+/g, '$1=***');
  // DB 연결 문자열 마스킹
  masked = masked.replace(/(mysql|postgresql|postgres|mongodb|redis):\/\/[^\s]+/gi, '$1://***');
  // IP 주소 마스킹 (프라이빗 대역)
  masked = masked.replace(/\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g, '***');
  return masked;
}

/**
 * 스크립트 실행 헬퍼
 */
function runScript(
  scriptPath: string,
  envVars: Record<string, string>
): Promise<{ success: boolean; message: string; output?: string; error?: string; duration: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let resolved = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let killTimeoutId: NodeJS.Timeout | null = null;

    const child = spawn('node', [scriptPath], {
      env: { ...process.env, ...envVars },
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    let stdout = '';
    let stderr = '';

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (killTimeoutId) clearTimeout(killTimeoutId);
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      child.removeAllListeners();
    };

    const safeResolve = (result: { success: boolean; message: string; output?: string; error?: string }) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({ ...result, duration: Date.now() - startTime });
    };

    child.stdout.on('data', (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        stdout += data.toString();
      }
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < MAX_OUTPUT_SIZE) {
        stderr += data.toString();
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        safeResolve({
          success: true,
          message: '스크립트 실행 완료',
          output: maskSensitiveInfo(stdout),
        });
      } else {
        safeResolve({
          success: false,
          message: `스크립트 실행 실패 (exit code: ${code})`,
          output: maskSensitiveInfo(stdout),
          error: maskSensitiveInfo(stderr || stdout),
        });
      }
    });

    child.on('error', (err) => {
      safeResolve({
        success: false,
        message: '스크립트 실행 오류',
        error: maskSensitiveInfo(err.message),
      });
    });

    // 프로세스 그룹 kill 헬퍼 (detached 모드에서 자식 프로세스 포함 종료)
    const killProcessGroup = (signal: NodeJS.Signals) => {
      try {
        if (child.pid) {
          process.kill(-child.pid, signal);
        }
      } catch {
        // 이미 종료된 프로세스 무시
        child.kill(signal);
      }
    };

    // 5분 타임아웃
    timeoutId = setTimeout(() => {
      // 파이프 명시적 정리
      child.stdout.destroy();
      child.stderr.destroy();
      killProcessGroup('SIGTERM');
      killTimeoutId = setTimeout(() => {
        if (!resolved) {
          killProcessGroup('SIGKILL');
        }
      }, 10000);

      safeResolve({
        success: false,
        message: '스크립트 실행 타임아웃 (5분)',
        output: maskSensitiveInfo(stdout),
      });
    }, 5 * 60 * 1000);
  });
}
