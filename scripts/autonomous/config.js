/**
 * 자율 운영 설정
 *
 * 트렌드 모니터링, 변경 감지, 갭 분석의 대상 및 임계값 관리
 */

/** 안전장치: 한 번 실행당 자동 생성할 최대 Issue 수 */
export const MAX_AUTO_ISSUES = 3;

/** 관련도 임계값 (이 값 이상만 액션 수행) */
export const RELEVANCE_THRESHOLD = 60;

/** RSS 피드 모니터링 대상 */
export const RSS_FEEDS = [
  {
    name: 'Kubernetes Blog',
    url: 'https://kubernetes.io/feed.xml',
    topics: ['kubernetes', 'k8s', '쿠버네티스', 'container', 'orchestration'],
  },
  {
    name: 'Docker Blog',
    url: 'https://www.docker.com/blog/feed/',
    topics: ['docker', '도커', 'container', 'containerization'],
  },
  {
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    topics: ['github', 'git', 'actions', 'ci/cd', 'devops'],
  },
  {
    name: 'Node.js Blog',
    url: 'https://nodejs.org/en/feed/blog.xml',
    topics: ['nodejs', 'node', 'javascript', 'bun', 'runtime'],
  },
];

/** GitHub Releases 모니터링 대상 (owner/repo) */
export const MONITORED_REPOS = [
  'kubernetes/kubernetes',
  'docker/compose',
  'oven-sh/bun',
  'vitejs/vite',
  'facebook/react',
];

/** 트렌드 분석 기간 (일) */
export const TREND_LOOKBACK_DAYS = 14;

/** URL 스냅샷 확인 간격 (일) */
export const URL_CHECK_INTERVAL_DAYS = 7;

/** 갭 분석에서 무시할 디렉토리 */
export const GAP_ANALYSIS_IGNORE = [
  'node_modules',
  'dist',
  '.git',
  'coverage',
  'public/data',
];

/** 갭 분석에서 스캔할 소스 코드 확장자 */
export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.yml', '.yaml'];

/* ── Issue Processor 설정 ── */

/** Issue Processor: 한 번 실행당 최대 GitHub 액션 수 */
export const MAX_ACTIONS_PER_RUN = parseInt(process.env.MAX_ACTIONS_PER_RUN, 10) || 5;

/** Issue Processor: 미활동 판단 임계값 (일) */
export const STALENESS_THRESHOLD_DAYS = parseInt(process.env.STALENESS_THRESHOLD_DAYS, 10) || 14;

/** Issue Processor: 자동 발행 품질 점수 임계값 */
export const QUALITY_AUTO_PUBLISH_THRESHOLD = parseInt(process.env.QUALITY_AUTO_PUBLISH_THRESHOLD, 10) || 80;

/** Issue Processor: 활성화할 에이전트 목록 */
export const ISSUE_PROCESSOR_ENABLED_AGENTS = (process.env.ENABLED_AGENTS || 'quality_review,maintenance,staleness,deduplication,retrigger')
  .split(',').map(s => s.trim());

/* ── Knowledge Expander / Content Reviewer 설정 ── */

/** Knowledge Expander: AI 확장 제안 시 최대 제안 수 */
export const MAX_EXPANSION_SUGGESTIONS = 10;

/** Content Reviewer: AI 평가 대상 최대 문서 수 */
export const MAX_REVIEW_BATCH = 10;

/** Content Reviewer: 최신성 경고 기준 (일) */
export const FRESHNESS_WARNING_DAYS = 90;

/** Content Reviewer: 최소 문서 길이 (자) */
export const MIN_DOCUMENT_LENGTH = 500;

/* ── News Intelligence 설정 ── */

/** euno.news RSS 피드 URL */
export const EUNO_RSS_URL = 'https://euno.news/rss.xml';

/** euno.news 베이스 URL */
export const EUNO_BASE_URL = 'https://euno.news';

/** RSS 최대 파싱 아이템 수 */
export const NEWS_RSS_MAX_ITEMS = 200;

/** GUID 북마크 롤링 윈도우 크기 */
export const NEWS_BOOKMARK_WINDOW = 500;

/** AI 관련성 분석 최대 배치 크기 */
export const NEWS_MAX_AI_BATCH = 30;

/** 관련성 점수 임계값 (0-100) */
export const NEWS_RELEVANCE_THRESHOLD = 65;

/** 한 번 실행당 최대 생성 Issue 수 */
export const NEWS_MAX_ISSUES = 3;

/** 원본 출처 fetch 최대 건수 */
export const NEWS_MAX_SOURCE_FETCH = 5;

/** 뉴스 페이지 fetch 타임아웃 (ms) */
export const NEWS_FETCH_TIMEOUT = 15000;

/** 북마크 데이터 파일명 */
export const NEWS_BOOKMARK_FILE = 'news-bookmark.json';

/** 인텔리전스 보고서 파일명 */
export const NEWS_REPORT_FILE = 'news-intelligence-report.json';
