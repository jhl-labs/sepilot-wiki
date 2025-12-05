/**
 * GitHub Issue의 전체 컨텍스트를 수집하는 공통 모듈
 *
 * Issue의 body와 모든 comments를 수집하여 LLM이 전체 문맥을 이해할 수 있도록 함
 * - 문서 생성 이력
 * - 이전 피드백 및 수정 사항
 * - 문서 위치 정보
 * - 관련 토론 내용
 */

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
  if (!issueTitle || !issueBody) {
    const issueInfo = await fetchIssueInfo(owner, repo, issueNumber, token);
    if (issueInfo) {
      issueTitle = issueTitle || issueInfo.title;
      issueBody = issueBody || issueInfo.body || '';
    }
  }

  // 댓글 가져오기
  const comments = await fetchIssueComments(owner, repo, issueNumber, token);

  // 컨텍스트 구조화
  const context = {
    issueNumber,
    issueTitle,
    issueBody,
    comments: comments.map((c) => ({
      id: c.id,
      author: c.user.login,
      body: c.body,
      createdAt: c.created_at,
      isBot: c.user.type === 'Bot',
    })),
    // 문서 위치 정보 추출 (이전 댓글에서)
    documentInfo: extractDocumentInfo(comments),
    // 전체 타임라인 (LLM 프롬프트용)
    timeline: buildTimeline(issueTitle, issueBody, comments),
  };

  console.log(`   - 제목: ${context.issueTitle}`);
  console.log(`   - 댓글 수: ${context.comments.length}`);
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
 */
function buildTimeline(issueTitle, issueBody, comments) {
  const lines = [];

  lines.push('=== Issue 컨텍스트 ===');
  lines.push('');
  lines.push(`## 제목: ${issueTitle}`);
  lines.push('');
  lines.push('## 원본 요청:');
  lines.push(issueBody || '(내용 없음)');
  lines.push('');

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
 * 컨텍스트에서 관련 문서 경로를 찾음
 * 우선순위: documentInfo > issueTitle에서 슬러그 생성
 */
export function resolveDocumentPath(context, wikiDir) {
  // 1. 이전 댓글에서 문서 위치가 발견된 경우
  if (context.documentInfo?.path) {
    const path = context.documentInfo.path;
    // wiki/ 접두사 제거 후 다시 추가 (정규화)
    const filename = path.replace(/^wiki\//, '');
    return {
      filepath: `${wikiDir}/${filename}`,
      filename,
      slug: context.documentInfo.slug || filename.replace('.md', ''),
      source: 'comment',
    };
  }

  // 2. 슬러그만 있는 경우
  if (context.documentInfo?.slug) {
    const slug = context.documentInfo.slug;
    const filename = `${slug}.md`;
    return {
      filepath: `${wikiDir}/${filename}`,
      filename,
      slug,
      source: 'comment_slug',
    };
  }

  // 3. Issue 제목에서 슬러그 생성
  const slug = context.issueTitle
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);

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
