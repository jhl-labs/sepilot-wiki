import { config, GITHUB_API_URL, GITHUB_RAW_URL } from '../config';
import type { WikiPage, GitHubIssue, WikiTree } from '../types';

// GitHub Wiki 페이지 목록 가져오기
export async function fetchWikiPages(): Promise<WikiTree[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/wiki`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      // Wiki 폴더가 없으면 빈 배열 반환
      if (response.status === 404) {
        return getDefaultWikiStructure();
      }
      throw new Error('Failed to fetch wiki pages');
    }

    const files = await response.json();
    return parseWikiStructure(files);
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
    return getDefaultWikiStructure();
  }
}

// Wiki 페이지 내용 가져오기
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
  try {
    // 먼저 wiki 폴더에서 시도
    let response = await fetch(
      `${GITHUB_RAW_URL}/${config.owner}/${config.repo}/main/wiki/${slug}.md`
    );

    if (!response.ok) {
      // 기본 데모 페이지 반환
      return getDefaultPage(slug);
    }

    const content = await response.text();
    const { metadata, body } = parseMarkdownWithFrontmatter(content);

    return {
      title: metadata.title || formatTitle(slug),
      slug,
      content: body,
      lastModified: metadata.lastModified || new Date().toISOString(),
      author: metadata.author,
      isDraft: metadata.isDraft || false,
      isInvalid: metadata.isInvalid || false,
      tags: metadata.tags || [],
    };
  } catch (error) {
    console.error('Error fetching wiki page:', error);
    return getDefaultPage(slug);
  }
}

// GitHub Issues 가져오기
export async function fetchIssues(label?: string): Promise<GitHubIssue[]> {
  try {
    let url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/issues?state=all&per_page=50`;
    if (label) {
      url += `&labels=${encodeURIComponent(label)}`;
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

// 특정 Issue 가져오기
export async function fetchIssue(issueNumber: number): Promise<GitHubIssue | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/issues/${issueNumber}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching issue:', error);
    return null;
  }
}

// 검색 기능
export async function searchWiki(query: string): Promise<WikiPage[]> {
  // GitHub Code Search API 사용 (제한적)
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/search/code?q=${encodeURIComponent(query)}+repo:${config.owner}/${config.repo}+path:wiki`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.items?.map((item: { name: string; path: string }) => ({
      title: formatTitle(item.name.replace('.md', '')),
      slug: item.name.replace('.md', ''),
      content: '',
      lastModified: new Date().toISOString(),
    })) || [];
  } catch (error) {
    console.error('Error searching wiki:', error);
    return [];
  }
}

// 마크다운 프론트매터 파싱
function parseMarkdownWithFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, frontmatter, body] = match;
  const metadata: Record<string, unknown> = {};

  frontmatter.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      // YAML 배열 파싱
      if (value.startsWith('[') && value.endsWith(']')) {
        metadata[key.trim()] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/['"]/g, ''));
      } else {
        metadata[key.trim()] = value.replace(/['"]/g, '');
      }
    }
  });

  return { metadata, body };
}

// Wiki 구조 파싱
function parseWikiStructure(files: Array<{ name: string; type: string; path: string }>): WikiTree[] {
  return files
    .filter((file) => file.name.endsWith('.md'))
    .map((file) => ({
      title: formatTitle(file.name.replace('.md', '')),
      slug: file.name.replace('.md', ''),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

// 슬러그를 제목으로 변환
function formatTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// 기본 Wiki 구조
function getDefaultWikiStructure(): WikiTree[] {
  return [
    { title: '홈', slug: 'home' },
    { title: '시작하기', slug: 'getting-started' },
    { title: '가이드', slug: 'guide' },
    { title: 'API 문서', slug: 'api' },
    { title: 'FAQ', slug: 'faq' },
  ];
}

// 기본 페이지 내용
function getDefaultPage(slug: string): WikiPage {
  const defaultPages: Record<string, WikiPage> = {
    home: {
      title: 'SEPilot Wiki에 오신 것을 환영합니다',
      slug: 'home',
      content: `
# SEPilot Wiki

AI 에이전트 기반의 자동화된 위키 시스템입니다.

## 주요 기능

- **GitHub Wiki 통합**: GitHub Wiki를 데이터 저장소로 활용
- **AI 기반 문서 작성**: GitHub Issue의 \`request\` 라벨을 통해 AI가 자동으로 문서 초안 작성
- **협업 워크플로우**: maintainer가 Issue 댓글로 수정 요청 시 자동 반영
- **자동 정보 수집**: cron 스케줄을 통해 시스템 상태 정보 자동 업데이트

## 시작하기

1. GitHub Issue에서 \`request\` 라벨로 문서 요청
2. AI가 초안 작성 후 검토 대기
3. Maintainer 검토 및 피드백
4. Issue close 시 정식 문서로 게시

## 문서 요청하기

새로운 문서가 필요하시면 [GitHub Issue](https://github.com/jhl-labs/sepilot-wiki/issues/new)를 생성하고 \`request\` 라벨을 추가해주세요.
      `,
      lastModified: new Date().toISOString(),
      tags: ['홈', '소개'],
    },
    'getting-started': {
      title: '시작하기',
      slug: 'getting-started',
      content: `
# 시작하기

SEPilot Wiki를 사용하는 방법을 안내합니다.

## 문서 찾아보기

왼쪽 사이드바에서 원하는 문서를 찾아볼 수 있습니다. 검색 기능을 사용하여 빠르게 원하는 내용을 찾을 수도 있습니다.

## 새 문서 요청하기

1. GitHub Issues 페이지로 이동
2. 새 Issue 생성
3. \`request\` 라벨 추가
4. 원하는 문서 내용 설명

## 문서 수정 요청하기

기존 문서의 수정이 필요한 경우:

1. 해당 문서의 Issue를 찾거나 새로 생성
2. 수정이 필요한 내용을 댓글로 작성
3. Maintainer 검토 후 반영
      `,
      lastModified: new Date().toISOString(),
      tags: ['시작하기', '가이드'],
    },
    guide: {
      title: '가이드',
      slug: 'guide',
      content: `
# 사용자 가이드

SEPilot Wiki의 상세 사용법입니다.

## 문서 구조

모든 문서는 마크다운 형식으로 작성됩니다.

### 지원하는 마크다운 기능

- **제목** (H1 ~ H6)
- **굵게**, *기울임*, ~~취소선~~
- 순서 있는/없는 목록
- 코드 블록 (구문 강조 포함)
- 테이블
- 이미지 및 링크
- 인용문
- 체크박스

## 라벨 시스템

| 라벨 | 설명 |
|------|------|
| \`request\` | 새 문서 작성 요청 |
| \`invalid\` | 문서 오류 신고 |
| \`draft\` | 초안 상태 |
| \`ai-generated\` | AI가 작성한 문서 |
      `,
      lastModified: new Date().toISOString(),
      tags: ['가이드', '문서'],
    },
    api: {
      title: 'API 문서',
      slug: 'api',
      content: `
# API 문서

SEPilot Wiki는 GitHub API를 활용합니다.

## 사용되는 API

### Wiki API
- 문서 목록 조회
- 문서 내용 조회

### Issues API
- Issue 생성/조회
- 라벨 관리
- 댓글 관리

## 인증

공개 저장소의 경우 인증 없이 조회가 가능합니다.
비공개 저장소의 경우 GitHub Token이 필요합니다.

\`\`\`bash
# 환경 변수 설정
export GITHUB_TOKEN=your_token_here
\`\`\`
      `,
      lastModified: new Date().toISOString(),
      tags: ['API', '개발'],
    },
    faq: {
      title: 'FAQ',
      slug: 'faq',
      content: `
# 자주 묻는 질문

## Q: 문서를 직접 수정할 수 있나요?

A: 현재는 GitHub Issue를 통한 요청 방식만 지원합니다. 직접 Wiki를 수정하면 자동으로 반영됩니다.

## Q: AI가 작성한 문서는 신뢰할 수 있나요?

A: AI가 작성한 문서는 "(초안)" 표시와 함께 게시되며, Maintainer의 검토를 거친 후 정식 문서가 됩니다.

## Q: 문서에 오류가 있으면 어떻게 하나요?

A: Issue에 \`invalid\` 라벨을 추가하면 해당 문서에 "수정 필요" 경고가 표시됩니다.

## Q: 검색이 되지 않아요

A: 검색 기능은 GitHub Code Search API를 사용하며, 일부 제한이 있을 수 있습니다.
      `,
      lastModified: new Date().toISOString(),
      tags: ['FAQ', '도움말'],
    },
  };

  return defaultPages[slug] || {
    title: formatTitle(slug),
    slug,
    content: `# ${formatTitle(slug)}\n\n이 페이지는 아직 작성되지 않았습니다.\n\n[문서 요청하기](https://github.com/jhl-labs/sepilot-wiki/issues/new)`,
    lastModified: new Date().toISOString(),
  };
}
