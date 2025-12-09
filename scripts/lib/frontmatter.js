/**
 * Frontmatter 파싱 및 조작 유틸리티
 * 마크다운 문서의 YAML frontmatter를 처리하는 공통 모듈
 */

/**
 * 마크다운 문서에서 frontmatter 파싱
 * @param {string} content - 마크다운 문서 전체 내용
 * @returns {Object} { frontmatter: Object, body: string, raw: string }
 */
export function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return {
      frontmatter: {},
      body: content,
      raw: '',
    };
  }

  const rawFrontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length).trim();
  const frontmatter = {};

  // YAML 파싱 (간단한 key: value 형식)
  for (const line of rawFrontmatter.split('\n')) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // 배열 형식 처리 ([item1, item2])
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/^["']|["']$/g, ''));
      }
      // 따옴표 제거
      else if (value.startsWith('"') || value.startsWith("'")) {
        frontmatter[key] = value.slice(1, -1);
      } else {
        frontmatter[key] = value;
      }
    }
  }

  return {
    frontmatter,
    body,
    raw: rawFrontmatter,
  };
}

/**
 * frontmatter에서 특정 필드 값 추출
 * @param {string} content - 마크다운 문서 내용
 * @param {string} field - 추출할 필드명
 * @returns {string|null} 필드 값 또는 null
 */
export function extractFrontmatterField(content, field) {
  const { frontmatter } = parseFrontmatter(content);
  return frontmatter[field] || null;
}

/**
 * frontmatter 상태(status) 변경
 * @param {string} content - 문서 내용
 * @param {string} newStatus - 새 상태 (draft, published, needs_review, deleted)
 * @returns {string} 수정된 문서 내용
 */
export function updateFrontmatterStatus(content, newStatus) {
  return updateFrontmatterField(content, 'status', newStatus);
}

/**
 * frontmatter의 특정 필드 업데이트
 * @param {string} content - 문서 내용
 * @param {string} field - 변경할 필드명
 * @param {string} value - 새 값
 * @returns {string} 수정된 문서 내용
 */
export function updateFrontmatterField(content, field, value) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return `---\n${field}: ${value}\n---\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const rest = content.slice(frontmatterMatch[0].length);
  const fieldRegex = new RegExp(`^${field}:.*$`, 'm');

  if (fieldRegex.test(frontmatter)) {
    const newFrontmatter = frontmatter.replace(fieldRegex, `${field}: ${value}`);
    return `---\n${newFrontmatter}\n---${rest}`;
  } else {
    const newFrontmatter = `${frontmatter}\n${field}: ${value}`;
    return `---\n${newFrontmatter}\n---${rest}`;
  }
}

/**
 * frontmatter에 여러 필드 한번에 병합
 * @param {string} content - 문서 내용
 * @param {Object} updates - 업데이트할 필드들 { field: value }
 * @returns {string} 수정된 문서 내용
 */
export function mergeFrontmatter(content, updates) {
  let result = content;
  for (const [field, value] of Object.entries(updates)) {
    result = updateFrontmatterField(result, field, value);
  }
  return result;
}

/**
 * frontmatter 객체를 YAML 문자열로 직렬화
 * @param {Object} frontmatter - frontmatter 객체
 * @returns {string} YAML 문자열
 */
export function serializeFrontmatter(frontmatter) {
  const lines = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `"${v}"`).join(', ')}]`);
    } else if (typeof value === 'string' && value.includes(':')) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * 새로운 frontmatter와 body로 문서 생성
 * @param {Object} frontmatter - frontmatter 객체
 * @param {string} body - 문서 본문
 * @returns {string} 완성된 마크다운 문서
 */
export function createDocument(frontmatter, body) {
  const yaml = serializeFrontmatter(frontmatter);
  return `---\n${yaml}\n---\n\n${body}`;
}
