/**
 * Wiki 링크 유효성 검사 작업
 * 매일 실행
 */
import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { BaseJob } from './base-job';
import { JobResult } from '../types';

interface LinkError {
  file: string;
  text: string;
  url: string;
  reason: string;
}

export class ValidateLinksJob extends BaseJob {
  readonly name = 'validate-links';
  readonly description = 'Wiki 문서 내 링크 유효성 검사';
  readonly schedule = '0 0 * * *'; // 매일 자정

  private readonly wikiDir = join(process.cwd(), 'wiki');

  async isEnabled(): Promise<boolean> {
    return existsSync(this.wikiDir);
  }

  protected async execute(): Promise<JobResult> {
    if (!existsSync(this.wikiDir)) {
      return {
        success: true,
        message: 'wiki 디렉토리가 없음 (건너뜀)',
      };
    }

    try {
      const files = await this.getAllWikiFiles(this.wikiDir);
      const errors = await this.validateLinks(files);

      if (errors.length === 0) {
        return {
          success: true,
          message: `${files.length}개 파일 검사 완료 - 모든 링크 유효`,
          data: { filesChecked: files.length, errorsFound: 0 },
        };
      }

      // 오류가 있으면 Issue 생성/업데이트
      await this.reportErrors(errors);

      return {
        success: true,
        message: `${files.length}개 파일 검사 완료 - ${errors.length}개 깨진 링크 발견`,
        data: {
          filesChecked: files.length,
          errorsFound: errors.length,
          errors: errors.slice(0, 10), // 상위 10개만
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: '링크 검사 실패',
        error: errorMessage,
      };
    }
  }

  private async getAllWikiFiles(dir: string): Promise<string[]> {
    const files = await readdir(dir, { recursive: true });
    return files
      .filter((f) => f.toString().endsWith('.md'))
      .map((f) => join(dir, f.toString()));
  }

  private async validateLinks(files: string[]): Promise<LinkError[]> {
    const errors: LinkError[] = [];

    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const relativePath = file.substring(this.wikiDir.length + 1);

      // 마크다운 링크 추출 [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const [, text, url] = match;

        // 외부 링크 (http/https) - 체크 생략
        if (url.startsWith('http')) {
          continue;
        }

        // 앵커 링크 (#) - 건너뜀
        if (url.startsWith('#')) {
          continue;
        }

        // 내부 링크 확인
        let targetPath: string;

        if (url.startsWith('/wiki/')) {
          const slug = url.replace('/wiki/', '');
          targetPath = join(this.wikiDir, `${slug}.md`);
        } else if (url.startsWith('/')) {
          targetPath = join(process.cwd(), url);
        } else {
          targetPath = resolve(dirname(file), url);
          if (!targetPath.endsWith('.md') && !targetPath.includes('.')) {
            targetPath += '.md';
          }
        }

        // 쿼리 스트링/해시 제거
        targetPath = targetPath.split('#')[0].split('?')[0];

        if (!existsSync(targetPath)) {
          errors.push({
            file: relativePath,
            text,
            url,
            reason: '파일을 찾을 수 없음',
          });
        }
      }
    }

    return errors;
  }

  private async reportErrors(errors: LinkError[]): Promise<void> {
    const repo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY;
    const token = process.env.GITHUB_TOKEN;

    if (!repo || !token) {
      this.log('GitHub 토큰 없음 - Issue 생성 건너뜀');
      return;
    }

    let reportBody = '## Wiki 깨진 링크 보고서\n\n';
    reportBody += `발견된 문제: ${errors.length}개\n\n`;
    reportBody += '| 파일 | 텍스트 | 링크 | 문제 |\n';
    reportBody += '|---|---|---|---|\n';

    for (const err of errors) {
      reportBody += `| ${err.file} | ${err.text} | \`${err.url}\` | ${err.reason} |\n`;
    }

    reportBody += '\n\n---\n*이 보고서는 스케줄러에 의해 자동 생성되었습니다.*';

    // 기존 Issue 검색
    const searchUrl = `https://api.github.com/search/issues?q=repo:${repo}+state:open+"Wiki 깨진 링크 보고서"`;

    try {
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (searchRes.ok) {
        const data = (await searchRes.json()) as { total_count: number; items: Array<{ number: number }> };

        if (data.total_count > 0) {
          // 기존 Issue에 코멘트 추가
          const issueNumber = data.items[0].number;
          await fetch(
            `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                body: `### 업데이트 (재검사)\n\n${reportBody}`,
              }),
            }
          );
          this.log(`기존 Issue #${issueNumber}에 코멘트 추가`);
          return;
        }
      }

      // 새 Issue 생성
      await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Wiki 깨진 링크 보고서',
          body: reportBody,
          labels: ['maintenance', 'bug'],
        }),
      });

      this.log('새 Issue 생성 완료');
    } catch (error) {
      this.error('Issue 생성/업데이트 실패', error);
    }
  }
}
