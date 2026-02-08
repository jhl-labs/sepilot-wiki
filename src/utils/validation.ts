/**
 * 콘텐츠 검증 유틸리티
 * 마크다운 에디터 및 폼 검증에 사용
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

/**
 * 마크다운 콘텐츠 검증
 */
export function validateMarkdownContent(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  // 빈 콘텐츠 체크
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    errors.push({
      field: 'content',
      code: 'EMPTY_CONTENT',
      message: '문서 내용을 입력해주세요.',
    });
    return { valid: false, errors };
  }

  // 최소 길이 체크 (frontmatter 제외하고 최소 10자)
  const contentWithoutFrontmatter = removeFrontmatter(trimmedContent);
  if (contentWithoutFrontmatter.trim().length < 10) {
    errors.push({
      field: 'content',
      code: 'CONTENT_TOO_SHORT',
      message: '문서 내용이 너무 짧습니다. (최소 10자)',
    });
  }

  // 최대 길이 체크 (100KB)
  const byteLength = new TextEncoder().encode(content).length;
  if (byteLength > 100 * 1024) {
    errors.push({
      field: 'content',
      code: 'CONTENT_TOO_LARGE',
      message: '문서 크기가 너무 큽니다. (최대 100KB)',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Frontmatter 검증
 */
export function validateFrontmatter(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const frontmatter = extractFrontmatter(content);

  if (!frontmatter) {
    // frontmatter가 없어도 허용
    return { valid: true, errors: [] };
  }

  // title 필드 확인
  if (frontmatter.title !== undefined && frontmatter.title !== null && typeof frontmatter.title === 'string' && !frontmatter.title.trim()) {
    errors.push({
      field: 'frontmatter.title',
      code: 'EMPTY_TITLE',
      message: 'title이 비어있습니다.',
    });
  }

  // tags 필드 확인 (배열인지)
  if (frontmatter.tags !== undefined) {
    if (!Array.isArray(frontmatter.tags)) {
      errors.push({
        field: 'frontmatter.tags',
        code: 'INVALID_TAGS',
        message: 'tags는 배열 형식이어야 합니다.',
      });
    } else if (frontmatter.tags.some((t: unknown) => typeof t !== 'string')) {
      errors.push({
        field: 'frontmatter.tags',
        code: 'INVALID_TAG_TYPE',
        message: 'tags의 각 항목은 문자열이어야 합니다.',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 제목 검증
 */
export function validateTitle(title: string): ValidationResult {
  const errors: ValidationError[] = [];
  const trimmed = title.trim();

  if (!trimmed) {
    errors.push({
      field: 'title',
      code: 'EMPTY_TITLE',
      message: '제목을 입력해주세요.',
    });
    return { valid: false, errors };
  }

  if (trimmed.length < 2) {
    errors.push({
      field: 'title',
      code: 'TITLE_TOO_SHORT',
      message: '제목이 너무 짧습니다. (최소 2자)',
    });
  }

  if (trimmed.length > 100) {
    errors.push({
      field: 'title',
      code: 'TITLE_TOO_LONG',
      message: '제목이 너무 깁니다. (최대 100자)',
    });
  }

  // 특수문자 체크 (슬러그 생성에 문제가 될 수 있는 문자)
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(trimmed)) {
    errors.push({
      field: 'title',
      code: 'INVALID_TITLE_CHARS',
      message: '제목에 사용할 수 없는 문자가 포함되어 있습니다.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 슬러그 검증
 */
export function validateSlug(slug: string): ValidationResult {
  const errors: ValidationError[] = [];
  const trimmed = slug.trim();

  if (!trimmed) {
    errors.push({
      field: 'slug',
      code: 'EMPTY_SLUG',
      message: '슬러그를 입력해주세요.',
    });
    return { valid: false, errors };
  }

  // 영문, 숫자, 하이픈, 한글만 허용
  const validSlugPattern = /^[a-z0-9가-힣-/]+$/;
  if (!validSlugPattern.test(trimmed)) {
    errors.push({
      field: 'slug',
      code: 'INVALID_SLUG_FORMAT',
      message: '슬러그는 소문자, 숫자, 하이픈, 한글만 사용할 수 있습니다.',
    });
  }

  // 연속 하이픈 체크
  if (/--/.test(trimmed)) {
    errors.push({
      field: 'slug',
      code: 'CONSECUTIVE_HYPHENS',
      message: '슬러그에 연속된 하이픈을 사용할 수 없습니다.',
    });
  }

  // 시작/끝 하이픈 체크
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    errors.push({
      field: 'slug',
      code: 'EDGE_HYPHENS',
      message: '슬러그는 하이픈으로 시작하거나 끝날 수 없습니다.',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 여러 검증 결과 병합
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Frontmatter 추출 헬퍼
 */
function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    // 간단한 YAML 파싱 (기본적인 key: value 형식만)
    const lines = match[1].split('\n');
    const result: Record<string, unknown> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value: unknown = line.slice(colonIndex + 1).trim();

      // 배열 처리 (다음 줄들이 - 로 시작하는 경우)
      if (value === '') {
        const arrayItems: string[] = [];
        const startIndex = lines.indexOf(line) + 1;
        for (let i = startIndex; i < lines.length; i++) {
          const nextLine = lines[i];
          if (nextLine.trim().startsWith('- ')) {
            arrayItems.push(nextLine.trim().slice(2));
          } else if (nextLine.trim() && !nextLine.includes(':')) {
            break;
          }
        }
        if (arrayItems.length > 0) {
          value = arrayItems;
        }
      }

      result[key] = value;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Frontmatter 제거 헬퍼
 */
function removeFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}
