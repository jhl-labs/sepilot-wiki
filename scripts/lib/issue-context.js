/**
 * GitHub Issue의 전체 컨텍스트를 수집하는 공통 모듈
 *
 * Issue의 body와 모든 comments를 수집하여 LLM이 전체 문맥을 이해할 수 있도록 함
 * - 문서 생성 이력
 * - 이전 피드백 및 수정 사항
 * - 문서 위치 정보
 * - 관련 토론 내용
 * - 참고 URL 웹 콘텐츠 자동 수집
 */

import { fetchReferenceContents } from './web-fetcher.js';

/**
 * GitHub API를 통해 Issue의 모든 댓글을 가져옴
 * @param {string} owner - 레포 소유자
 * @param {string} repo - 레포 이름
 * @param {number} issueNumber - Issue 번호
 * @param {string} token - GitHub 토큰
 * @returns {Promise<Array>} 댓글 배열
 */
export async function fetchIssueComments(owner, repo, issueNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.warn(`댓글 가져오기 실패: ${response.status}`);
    return [];
  }

  return response.json();
}

/**
 * GitHub API를 통해 Issue 정보를 가져옴
 * @param {string} owner - 레포 소유자
 * @param {string} repo - 레포 이름
 * @param {number} issueNumber - Issue 번호
 * @param {string} token - GitHub 토큰
 * @returns {Promise<Object|null>} Issue 정보
 */
export async function fetchIssueInfo(owner, repo, issueNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.warn(`Issue 정보 가져오기 실패: ${response.status}`);
    return null;
  }

  return response.json();
}

/**
 * Issue의 전체 컨텍스트를 수집하여 구조화된 형태로 반환
 * @param {Object} options
 * @param {string} options.owner - 레포 소유자
 * @param {string} options.repo - 레포 이름
 * @param {number} options.issueNumber - Issue 번호
 * @param {string} options.issueTitle - Issue 제목 (선택, API에서 가져올 수도 있음)
 * @param {string} options.issueBody - Issue 본문 (선택, API에서 가져올 수도 있음)
 * @param {string} options.token - GitHub 토큰
 * @returns {Promise<Object>} 전체 컨텍스트
 */
export async function collectIssueContext(options) {
  const { owner, repo, issueNumber, token } = options;
  let { issueTitle, issueBody } = options;

  console.log(`📋 Issue #${issueNumber} 컨텍스트 수집 중...`);

  // Issue 정보가 없으면 API에서 가져옴
  let issueLabels = [];
  if (!issueTitle || !issueBody) {
    const issueInfo = await fetchIssueInfo(owner, repo, issueNumber, token);
    if (issueInfo) {
      issueTitle = issueTitle || issueInfo.title;
      issueBody = issueBody || issueInfo.body || '';
      issueLabels = (issueInfo.labels || []).map(l => l.name);
    }
  } else {
    // issueTitle과 issueBody가 이미 있어도 라벨 정보는 API에서 가져옴
    const issueInfo = await fetchIssueInfo(owner, repo, issueNumber, token);
    if (issueInfo) {
      issueLabels = (issueInfo.labels || []).map(l => l.name);
    }
  }

  // 댓글 가져오기
  const comments = await fetchIssueComments(owner, repo, issueNumber, token);

  // 참고 URL 웹 콘텐츠 수집
  // Issue body와 댓글에서 URL 추출 후 실제 내용 가져오기
  const allText = [issueBody, ...comments.map((c) => c.body)].filter(Boolean).join('\n');
  const referenceContents = await fetchReferenceContents(allText);

  // 컨텍스트 구조화
  const context = {
    issueNumber,
    issueTitle,
    issueBody,
    labels: issueLabels,
    comments: comments.map((c) => ({
      id: c.id,
      author: c.user.login,
      body: c.body,
      createdAt: c.created_at,
      isBot: c.user.type === 'Bot',
    })),
    // 참고 URL에서 가져온 웹 콘텐츠
    referenceContents,
    // 문서 위치 정보 추출 (이전 댓글에서)
    documentInfo: extractDocumentInfo(comments),
    // 전체 타임라인 (LLM 프롬프트용)
    timeline: buildTimeline(issueTitle, issueBody, comments, referenceContents),
  };

  console.log(`   - 제목: ${context.issueTitle}`);
  console.log(`   - 댓글 수: ${context.comments.length}`);
  console.log(`   - 참고 자료: ${referenceContents.length}개 수집됨`);
  console.log(`   - 문서 정보: ${context.documentInfo ? '발견됨' : '없음'}`);

  return context;
}

/**
 * 댓글에서 문서 위치 정보를 추출
 * GitHub Action bot이 남긴 "문서 위치" 정보를 파싱
 */
function extractDocumentInfo(comments) {
  for (const comment of comments) {
    // "📄 **문서 위치**: `wiki/xxx.md`" 패턴 찾기
    const locationMatch = comment.body.match(/문서 위치[^\`]*\`([^`]+)\`/);
    // "🔗 **미리보기**: [문서 보기](https://...)" 패턴 찾기
    const previewMatch = comment.body.match(/미리보기[^\(]*\(([^)]+)\)/);
    // 슬러그 추출
    const slugMatch = comment.body.match(/\/wiki\/([^)"\s]+)/);

    if (locationMatch || slugMatch) {
      return {
        path: locationMatch ? locationMatch[1] : null,
        previewUrl: previewMatch ? previewMatch[1] : null,
        slug: slugMatch ? slugMatch[1] : null,
        sourceComment: comment.body,
      };
    }
  }

  return null;
}

/**
 * Issue의 전체 타임라인을 LLM이 이해하기 쉬운 형태로 구성
 * @param {string} issueTitle - Issue 제목
 * @param {string} issueBody - Issue 본문
 * @param {Array} comments - 댓글 배열
 * @param {Array} referenceContents - 참고 URL 콘텐츠 배열
 */
function buildTimeline(issueTitle, issueBody, comments, referenceContents = []) {
  const lines = [];

  lines.push('=== Issue 컨텍스트 ===');
  lines.push('');
  lines.push(`## 제목: ${issueTitle}`);
  lines.push('');
  lines.push('## 원본 요청:');
  lines.push(issueBody || '(내용 없음)');
  lines.push('');

  if (referenceContents.length > 0) {
    lines.push('## 참고 자료 내용:');
    lines.push('');
    lines.push('아래는 요청에 포함된 참고 URL에서 가져온 실제 내용입니다. 문서 작성 시 이 내용을 반영해주세요.');
    lines.push('');

    for (const ref of referenceContents) {
      lines.push(`### 📄 ${ref.title}`);
      lines.push(`URL: ${ref.url}`);
      lines.push('');
      lines.push(ref.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  if (comments.length > 0) {
    lines.push('## 이후 진행 상황:');
    lines.push('');

    for (const comment of comments) {
      const author = comment.user.login;
      const isBot = comment.user.type === 'Bot';
      const date = new Date(comment.created_at).toLocaleString('ko-KR');
      const role = isBot ? '[시스템]' : '[사용자]';

      lines.push(`### ${role} ${author} (${date}):`);
      lines.push(comment.body);
      lines.push('');
    }
  }

  lines.push('=== 컨텍스트 끝 ===');

  return lines.join('\n');
}

/**
 * Issue 제목에서 URL-safe 슬러그를 생성
 * @param {string} title - Issue 제목
 * @returns {string} 슬러그
 */
function generateSlugFromTitle(title) {
  return (
    title
      // 공통 접두사 제거: [요청], [수정], [삭제], [질문] 등
      .replace(/^\[.*?\]\s*/, '')
      // 한국어 제거 (URL에 부적합)
      .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]+/g, ' ')
      .toLowerCase()
      // 특수문자를 공백으로 치환 (괄호 등이 단어를 붙이지 않도록)
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  );
}

/**
 * 슬러그가 유효한지 검증 (한국어, 특수문자 등 URL에 부적합한 문자 포함 여부)
 * @param {string} slug - 검증할 슬러그
 * @returns {boolean} 유효하면 true
 */
function isValidSlug(slug) {
  if (!slug) return false;
  // 한국어 또는 기타 비ASCII 문자가 포함되면 유효하지 않음
  return !/[가-힣ㄱ-ㅎㅏ-ㅣ\u3000-\u303F\u4E00-\u9FFF]/.test(slug);
}

/**
 * 컨텍스트에서 관련 문서 경로를 찾음
 * 우선순위: documentInfo > issueTitle에서 슬러그 생성
 * 단, 댓글에서 가져온 슬러그가 유효하지 않으면 (한국어 등 포함) 제목 기반으로 재생성
 * @param {Object} context - Issue 컨텍스트
 * @param {string} wikiDir - Wiki 디렉토리 경로
 * @param {Object} options - 옵션
 * @param {boolean} options.forceFromTitle - true이면 항상 제목 기반 슬러그 생성 (기존 댓글 경로 무시)
 * @param {string} options.category - AI가 결정한 카테고리 경로 (예: "bun/ci")
 */
export function resolveDocumentPath(context, wikiDir, options = {}) {
  // 0. AI가 결정한 카테고리가 있으면 해당 경로에 문서 생성
  if (options.category) {
    const slug = generateSlugFromTitle(context.issueTitle);
    const categorySlug = `${options.category}/${slug}`;
    const filename = `${categorySlug}.md`;
    return {
      filepath: `${wikiDir}/${filename}`,
      filename,
      slug: categorySlug,
      source: 'auto_category',
    };
  }

  if (!options.forceFromTitle) {
    // 1. 이전 댓글에서 문서 위치가 발견된 경우
    if (context.documentInfo?.path) {
      const path = context.documentInfo.path;
      const filename = path.replace(/^wiki\//, '');
      const slug = context.documentInfo.slug || filename.replace('.md', '');

      // 슬러그 유효성 검증: 한국어 등 비정상 문자가 포함되면 제목 기반으로 재생성
      if (isValidSlug(slug)) {
        return {
          filepath: `${wikiDir}/${filename}`,
          filename,
          slug,
          source: 'comment',
        };
      }
      console.warn(`⚠️ 댓글의 슬러그가 유효하지 않아 제목 기반으로 재생성: ${slug}`);
    }

    // 2. 슬러그만 있는 경우
    if (context.documentInfo?.slug && isValidSlug(context.documentInfo.slug)) {
      const slug = context.documentInfo.slug;
      const filename = `${slug}.md`;
      return {
        filepath: `${wikiDir}/${filename}`,
        filename,
        slug,
        source: 'comment_slug',
      };
    }
  }

  // 3. Issue 제목에서 슬러그 생성
  const slug = generateSlugFromTitle(context.issueTitle);

  const filename = `${slug}.md`;
  return {
    filepath: `${wikiDir}/${filename}`,
    filename,
    slug,
    source: 'title',
  };
}

/**
 * 환경 변수에서 GitHub 정보 추출
 */
export function getGitHubInfoFromEnv() {
  const githubRepository = process.env.GITHUB_REPOSITORY || '';
  const [owner, repo] = githubRepository.split('/');

  return {
    owner: owner || '',
    repo: repo || '',
    token: process.env.GITHUB_TOKEN || '',
  };
}

/**
 * GitHub API를 통해 PR의 변경된 파일 목록을 가져옴
 * @param {string} owner
 * @param {string} repo
 * @param {number} pullNumber
 * @param {string} token
 * @returns {Promise<Array>} 변경된 파일 목록
 */
export async function fetchPullRequestFiles(owner, repo, pullNumber, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.warn(`PR 파일 목록 가져오기 실패: ${response.status}`);
    return [];
  }

  return response.json();
}
