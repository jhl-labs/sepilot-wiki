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
