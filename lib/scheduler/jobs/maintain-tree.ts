/**
 * Wiki Tree 유지보수 작업
 * 주 1회 (월요일) 실행
 *
 * 기존 스크립트 scripts/maintenance/maintain-wiki-tree.js를 호출
 */
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { BaseJob } from './base-job';
import { JobResult } from '../types';

export class MaintainTreeJob extends BaseJob {
  readonly name = 'maintain-tree';
  readonly description = 'Wiki Tree 구조 분석 및 유지보수';
  readonly schedule = '0 0 * * 1'; // 매주 월요일 자정

  private readonly scriptPath = join(
    process.cwd(),
    'scripts',
    'maintenance',
    'maintain-wiki-tree.js'
  );

  async isEnabled(): Promise<boolean> {
    // OpenAI API 키 필요
    const hasOpenAI = !!(
      process.env.OPENAI_API_KEY ||
      (process.env.OPENAI_BASE_URL && process.env.OPENAI_TOKEN)
    );

    // 스크립트 파일 존재 여부
    const hasScript = existsSync(this.scriptPath);

    if (!hasOpenAI) {
      this.warn('OpenAI API 키가 설정되지 않음');
    }
    if (!hasScript) {
      this.warn(`스크립트를 찾을 수 없음: ${this.scriptPath}`);
    }

    return hasOpenAI && hasScript;
  }

  protected async execute(): Promise<JobResult> {
    return new Promise((resolve) => {
      this.log('Wiki Tree 유지보수 스크립트 실행 중...');

      const child = spawn('node', [this.scriptPath], {
        env: {
          ...process.env,
          // DRY_RUN 모드로 실행하지 않음 (실제 적용)
          DRY_RUN: 'false',
        },
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        // 실시간 로그 출력
        text.split('\n').forEach((line: string) => {
          if (line.trim()) {
            this.log(line.trim());
          }
        });
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          // 결과 파싱 시도
          const appliedMatch = stdout.match(/(\d+)개 자동 적용/);
          const skippedMatch = stdout.match(/(\d+)개 보류/);
          const issuesMatch = stdout.match(/(\d+)개 Issue/);

          resolve({
            success: true,
            message: 'Wiki Tree 유지보수 완료',
            data: {
              applied: appliedMatch ? parseInt(appliedMatch[1]) : 0,
              skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
              issuesCreated: issuesMatch ? parseInt(issuesMatch[1]) : 0,
            },
          });
        } else {
          resolve({
            success: false,
            message: `스크립트 실행 실패 (exit code: ${code})`,
            error: stderr || stdout,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          message: '스크립트 실행 중 오류 발생',
          error: error.message,
        });
      });

      // 10분 타임아웃
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          message: '스크립트 실행 타임아웃 (10분)',
        });
      }, 10 * 60 * 1000);
    });
  }
}
