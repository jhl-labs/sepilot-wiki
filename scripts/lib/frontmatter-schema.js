/**
 * 프론트매터 스키마 검증 시스템
 *
 * 필수/선택 필드 정의 및 빌드 시 모든 문서 검증
 * 누락 필드 자동 보정 (예: status 없으면 'draft')
 */

/** 프론트매터 스키마 정의 */
const FRONTMATTER_SCHEMA = {
  required: {
    title: { type: 'string', description: '문서 제목' },
    status: {
      type: 'string',
      description: '문서 상태',
      default: 'draft',
      allowed: ['draft', 'published', 'needs_review', 'deleted'],
    },
  },
  optional: {
    tags: { type: 'array', description: '태그 목록', default: [] },
    author: { type: 'string', description: '작성자' },
    order: { type: 'number', description: '정렬 순서' },
    menu: { type: 'string', description: '메뉴 그룹' },
    lastModified: { type: 'string', description: '최종 수정일' },
    isDraft: { type: 'boolean', description: '초안 여부 (deprecated, status 사용 권장)' },
    isInvalid: { type: 'boolean', description: '오류 표시 (deprecated, status 사용 권장)' },
  },
};

/**
 * 프론트매터 검증 결과
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 검증 통과 여부
 * @property {string[]} errors - 에러 목록 (필수 필드 누락 등)
 * @property {string[]} warnings - 경고 목록 (권장 필드 누락 등)
 * @property {Object} corrected - 자동 보정된 메타데이터
 */

/**
 * 프론트매터 검증 및 자동 보정
 *
 * @param {Object} metadata - 파싱된 프론트매터 객체
 * @param {string} slug - 문서 슬러그 (로깅용)
 * @returns {ValidationResult}
 */
export function validateFrontmatter(metadata, slug) {
  const errors = [];
  const warnings = [];
  const corrected = { ...metadata };

  // 필수 필드 검증
  for (const [field, schema] of Object.entries(FRONTMATTER_SCHEMA.required)) {
    if (!corrected[field] || (typeof corrected[field] === 'string' && corrected[field].trim() === '')) {
      if (schema.default !== undefined) {
        corrected[field] = schema.default;
        warnings.push(`[${slug}] '${field}' 필드 누락 → 기본값 '${schema.default}' 적용`);
      } else {
        errors.push(`[${slug}] 필수 필드 '${field}' 누락`);
      }
    }

    // allowed 값 검증
    if (schema.allowed && corrected[field] && !schema.allowed.includes(corrected[field])) {
      warnings.push(
        `[${slug}] '${field}' 값 '${corrected[field]}'이 허용 목록에 없음 (허용: ${schema.allowed.join(', ')})`
      );
    }
  }

  // 선택 필드 타입 검증
  for (const [field, schema] of Object.entries(FRONTMATTER_SCHEMA.optional)) {
    if (corrected[field] !== undefined && corrected[field] !== null) {
      if (schema.type === 'array' && !Array.isArray(corrected[field])) {
        // 문자열을 배열로 변환 시도
        if (typeof corrected[field] === 'string') {
          corrected[field] = corrected[field].split(',').map((s) => s.trim()).filter(Boolean);
          warnings.push(`[${slug}] '${field}' 필드를 문자열에서 배열로 변환`);
        }
      }
      if (schema.type === 'number' && typeof corrected[field] !== 'number') {
        const parsed = parseInt(corrected[field], 10);
        if (!isNaN(parsed)) {
          corrected[field] = parsed;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    corrected,
  };
}

/**
 * 전체 문서 배열에 대한 스키마 검증 실행
 * 빌드 로그에 경고/에러 출력
 *
 * @param {Array<{slug: string, metadata: Object}>} documents - 문서 배열
 * @returns {{ totalErrors: number, totalWarnings: number, results: ValidationResult[] }}
 */
export function validateAllDocuments(documents) {
  let totalErrors = 0;
  let totalWarnings = 0;
  const results = [];

  for (const doc of documents) {
    const result = validateFrontmatter(doc.metadata, doc.slug);
    results.push(result);

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    // 에러 출력
    for (const error of result.errors) {
      console.error(`   ❌ ${error}`);
    }
    // 경고 출력
    for (const warning of result.warnings) {
      console.warn(`   ⚠️ ${warning}`);
    }
  }

  if (totalErrors > 0 || totalWarnings > 0) {
    console.log(`\n📋 프론트매터 검증 결과: ${totalErrors}개 에러, ${totalWarnings}개 경고`);
  }

  return { totalErrors, totalWarnings, results };
}

export { FRONTMATTER_SCHEMA };
