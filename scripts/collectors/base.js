/**
 * 동적 페이지 생성을 위한 Collector 베이스 클래스
 *
 * 새로운 Collector를 만들려면:
 * 1. 이 클래스를 상속
 * 2. name, outputPath, frontmatter 정의
 * 3. collect() 메서드 구현
 * 4. collectors/index.js에 등록
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export class BaseCollector {
  /**
   * Collector 이름 (로깅용)
   * @type {string}
   */
  name = 'base';

  /**
   * 출력 파일 경로 (wiki/ 기준 상대 경로)
   * @type {string}
   */
  outputPath = '';

  /**
   * 이 Collector가 활성화되어 있는지 확인
   * 환경변수나 조건에 따라 스킵 가능
   * @returns {Promise<boolean>}
   */
  async isEnabled() {
    return true;
  }

  /**
   * Frontmatter 기본값
   * @returns {object}
   */
  getFrontmatter() {
    return {
      title: '',
      description: '',
      category: 'Dashboard',
      tags: [],
      status: 'published',
    };
  }

  /**
   * 데이터 수집 (서브클래스에서 구현)
   * @returns {Promise<object|null>} 수집된 데이터 또는 null (실패 시)
   */
  async collect() {
    throw new Error('collect() must be implemented by subclass');
  }

  /**
   * 마크다운 본문 생성 (서브클래스에서 구현)
   * @param {object} data - collect()에서 반환된 데이터
   * @returns {string} 마크다운 본문
   */
  generateMarkdown(data) {
    throw new Error('generateMarkdown() must be implemented by subclass');
  }

  /**
   * Frontmatter를 YAML 문자열로 변환
   * @param {object} frontmatter
   * @returns {string}
   */
  formatFrontmatter(frontmatter) {
    const lines = ['---'];
    for (const [key, value] of Object.entries(frontmatter)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    lines.push('---');
    return lines.join('\n');
  }

  /**
   * 전체 실행 프로세스
   * @returns {Promise<boolean>} 성공 여부
   */
  async run() {
    const startTime = Date.now();
    console.log(`\n📊 [${this.name}] 수집 시작...`);

    // 활성화 확인
    if (!(await this.isEnabled())) {
      console.log(`   ⏭️ 스킵됨 (비활성화)`);
      return true;
    }

    try {
      // 데이터 수집
      const data = await this.collect();
      if (!data) {
        console.log(`   ⚠️ 데이터 없음, 스킵`);
        return true;
      }

      // Frontmatter 생성
      const now = new Date().toISOString();
      const frontmatter = {
        ...this.getFrontmatter(),
        createdAt: now,
        updatedAt: now,
      };

      // 마크다운 생성
      const markdown = this.generateMarkdown(data);
      const content = `${this.formatFrontmatter(frontmatter)}\n\n${markdown}`;

      // 파일 저장
      const outputFile = join(process.cwd(), 'wiki', this.outputPath);
      await mkdir(dirname(outputFile), { recursive: true });
      await writeFile(outputFile, content);

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ 완료 (${elapsed}ms)`);
      console.log(`   📄 ${outputFile}`);
      return true;
    } catch (error) {
      console.error(`   ❌ 실패: ${error.message}`);
      return false;
    }
  }
}

/**
 * 쉘 명령 실행 유틸리티
 */
import { execSync } from 'child_process';

export function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      timeout: options.timeout || 60000,
      maxBuffer: options.maxBuffer || 50 * 1024 * 1024, // 50MB
      ...options,
    }).trim();
  } catch (error) {
    if (options.throwOnError !== false) {
      throw error;
    }
    return null;
  }
}

/**
 * 메모리 포맷팅 유틸리티 (Ki -> Gi)
 */
export function formatMemory(memory) {
  if (!memory) return '0Gi';
  const value = parseInt(memory.replace(/[^0-9]/g, ''));
  if (memory.includes('Ki')) {
    return `${(value / 1024 / 1024).toFixed(1)}Gi`;
  }
  if (memory.includes('Mi')) {
    return `${(value / 1024).toFixed(1)}Gi`;
  }
  if (memory.includes('Gi')) {
    return `${value}Gi`;
  }
  return memory;
}

/**
 * 날짜 포맷팅 유틸리티 (한국 시간)
 */
export function formatDateKR(date) {
  return new Date(date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/**
 * 마크다운 테이블 생성 유틸리티
 */
export function createTable(headers, rows) {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '------').join('|')}|`;
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`);
  return [headerRow, separatorRow, ...dataRows].join('\n');
}
