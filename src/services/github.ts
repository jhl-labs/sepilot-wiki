import { config, GITHUB_API_URL, urls } from '../config';
import type { WikiPage, GitHubIssue, WikiTree } from '../types';
import { formatTitle } from '../utils';

// 빌드 시점에 생성된 정적 wiki 데이터 캐시
let wikiDataCache: { pages: WikiPage[]; tree: WikiTree[] } | null = null;

// 정적 wiki 데이터 로드
async function loadWikiData(): Promise<{ pages: WikiPage[]; tree: WikiTree[] }> {
  if (wikiDataCache) {
    return wikiDataCache;
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}wiki-data.json`);
    if (!response.ok) {
      return { pages: [], tree: [] };
    }
    wikiDataCache = await response.json();
    return wikiDataCache!;
  } catch (error) {
    console.error('Error loading wiki data:', error);
    return { pages: [], tree: [] };
  }
}

// Wiki 페이지 목록 가져오기 (정적 데이터에서)
export async function fetchWikiPages(): Promise<WikiTree[]> {
  const data = await loadWikiData();
  return data.tree;
}

// 기본 가이드 페이지 목록 (정적)
export function getGuidePages(): WikiTree[] {
  return [
    { title: '홈', slug: '_guide/home' },
    { title: '시작하기', slug: '_guide/getting-started' },
    { title: '가이드', slug: '_guide/guide' },
    { title: 'API 문서', slug: '_guide/api' },
    { title: 'FAQ', slug: '_guide/faq' },
  ];
}

// Wiki 페이지 내용 가져오기 (정적 데이터에서)
export async function fetchWikiPage(slug: string): Promise<WikiPage | null> {
  // 가이드 페이지인 경우
  if (slug.startsWith('_guide/')) {
    const guideSlug = slug.replace('_guide/', '');
    return getGuidePage(guideSlug);
  }

  // 정적 데이터에서 페이지 찾기
  const data = await loadWikiData();
  const page = data.pages.find((p) => p.slug === slug);
  return page || null;
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

// 검색 인덱스 타입
interface SearchIndexItem {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  lastModified: string;
  author?: string;
}

// 검색 인덱스 캐시
let searchIndexCache: SearchIndexItem[] | null = null;

// 정적 검색 인덱스 로드
async function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (searchIndexCache) {
    return searchIndexCache;
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}search-index.json`);
    if (!response.ok) {
      return [];
    }
    searchIndexCache = await response.json();
    return searchIndexCache!;
  } catch (error) {
    console.error('Error loading search index:', error);
    return [];
  }
}

// 검색 기능 (정적 인덱스 기반)
export async function searchWiki(query: string): Promise<WikiPage[]> {
  try {
    const index = await loadSearchIndex();
    const normalizedQuery = query.toLowerCase().trim();
    const queryTerms = normalizedQuery.split(/\s+/);

    // 검색 결과를 점수와 함께 저장
    const scoredResults = index
      .map((item) => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();
        const tagsLower = item.tags.map((t) => t.toLowerCase());

        for (const term of queryTerms) {
          // 제목에서 매칭 (높은 점수)
          if (titleLower.includes(term)) {
            score += 10;
            if (titleLower === term) score += 5; // 정확한 매칭
          }

          // 태그에서 매칭 (중간 점수)
          if (tagsLower.some((tag) => tag.includes(term))) {
            score += 5;
          }

          // 본문에서 매칭 (낮은 점수)
          if (contentLower.includes(term)) {
            score += 1;
            // 매칭 횟수에 따라 추가 점수
            const matches = contentLower.split(term).length - 1;
            score += Math.min(matches, 5) * 0.5;
          }
        }

        return { item, score };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    // WikiPage 형태로 변환
    return scoredResults.map((result) => ({
      title: result.item.title,
      slug: result.item.slug,
      content: result.item.excerpt,
      lastModified: result.item.lastModified,
      author: result.item.author,
      tags: result.item.tags,
    }));
  } catch (error) {
    console.error('Error searching wiki:', error);
    return [];
  }
}

// 가이드 페이지 내용 (정적)
function getGuidePage(slug: string): WikiPage {
  const guidePages: Record<string, WikiPage> = {
    home: {
      title: 'SEPilot Wiki에 오신 것을 환영합니다',
      slug: '_guide/home',
      content: `
# SEPilot Wiki

AI 에이전트 기반의 자동화된 위키 시스템입니다.

## 주요 기능

- **저장소 기반 Wiki**: \`/wiki\` 폴더의 마크다운 파일을 GitHub Contents API로 관리
- **AI 기반 문서 작성**: GitHub Issue의 \`request\` 라벨을 통해 AI가 자동으로 문서 초안 작성
- **협업 워크플로우**: maintainer가 Issue 댓글로 수정 요청 시 자동 반영
- **자동 정보 수집**: cron 스케줄을 통해 시스템 상태 정보 자동 업데이트

## 시작하기

1. GitHub Issue에서 \`request\` 라벨로 문서 요청
2. AI가 초안 작성 후 검토 대기
3. Maintainer 검토 및 피드백
4. Issue close 시 정식 문서로 게시

## 문서 요청하기

새로운 문서가 필요하시면 [GitHub Issue](${urls.newIssue()})를 생성하고 \`request\` 라벨을 추가해주세요.
      `,
      lastModified: new Date().toISOString(),
      tags: ['홈', '소개'],
    },
    'getting-started': {
      title: '시작하기',
      slug: '_guide/getting-started',
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
      slug: '_guide/guide',
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
      slug: '_guide/api',
      content: `
# API 문서

SEPilot Wiki는 GitHub API를 활용합니다.

## 사용되는 API

### Contents API
- \`/wiki\` 폴더의 파일 목록 조회
- 마크다운 파일 내용 조회
- Raw URL을 통한 파일 직접 접근

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
      slug: '_guide/faq',
      content: `
# 자주 묻는 질문

## Q: 문서를 직접 수정할 수 있나요?

A: 네, 저장소의 \`/wiki\` 폴더에서 마크다운 파일을 직접 수정하거나 PR을 통해 변경할 수 있습니다. 또한 GitHub Issue를 통해 AI에게 수정을 요청할 수도 있습니다.

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

  return guidePages[slug] || {
    title: formatTitle(slug),
    slug: `_guide/${slug}`,
    content: `# ${formatTitle(slug)}\n\n이 페이지는 아직 작성되지 않았습니다.`,
    lastModified: new Date().toISOString(),
  };
}
