/**
 * 주간 상태 보고서 생성 작업
 * 매주 월요일 실행
 *
 * scripts/maintenance/generate-status-report.js를 호출
 */
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { BaseJob } from './base-job';
import { JobResult, JobRunOptions } from '../types';

export class GenerateStatusReportJob extends BaseJob {
  readonly name = 'generate-status-report';
  readonly description = '주간 상태 보고서 생성';
  readonly schedule = '0 1 * * 1'; // 매주 월요일 01시

  private readonly scriptPath = join(
    process.cwd(),
    'scripts',
    'maintenance',
    'generate-status-report.js'
  );

  async isEnabled(): Promise<boolean> {
    const hasScript = existsSync(this.scriptPath);
    if (!hasScript) {
      this.warn(`스크립트를 찾을 수 없음: ${this.scriptPath}`);
    }
    return hasScript;
  }

  protected async execute(options?: JobRunOptions): Promise<JobResult> {
    return new Promise((resolve) => {
      this.log('주간 상태 보고서 생성 스크립트 실행 중...');

      let resolved = false;

      const child = spawn('node', [this.scriptPath], {
        env: {
          ...process.env,
          ...(options?.dryRun !== undefined ? { DRY_RUN: String(options.dryRun) } : {}),
        },
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

      const MAX_BUF = 1024 * 1024; // 1MB
      let stdout = '';
      let stderr = '';

      const safeResolve = (result: JobResult) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      child.stdout.on('data', (data) => {
        const text = data.toString();
        if (stdout.length < MAX_BUF) stdout += text;
        text.split('\n').forEach((line: string) => {
          if (line.trim()) this.log(line.trim());
        });
      });

      child.stderr.on('data', (data) => {
        if (stderr.length < MAX_BUF) stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          safeResolve({
            success: true,
            message: '주간 상태 보고서 생성 완료',
            data: { output: stdout.slice(0, 500) },
          });
        } else {
          safeResolve({
            success: false,
            message: `스크립트 실행 실패 (exit code: ${code})`,
            error: stderr || stdout,
          });
        }
      });

      child.on('error', (error) => {
        safeResolve({
          success: false,
          message: '스크립트 실행 중 오류 발생',
          error: error.message,
        });
      });

      // 10분 타임아웃 + SIGKILL 2단계
      setTimeout(() => {
        try {
          if (child.pid) process.kill(-child.pid, 'SIGTERM');
        } catch { child.kill('SIGTERM'); }
        setTimeout(() => {
          if (!resolved) {
            try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch { /* 이미 종료됨 */ }
          }
        }, 10000);
        safeResolve({
          success: false,
          message: '스크립트 실행 타임아웃 (10분)',
        });
      }, 10 * 60 * 1000);
    });
  }
}
