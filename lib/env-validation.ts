/**
 * 환경변수 검증 유틸리티
 * 서버 시작 시 필수 환경변수 확인
 */

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
}

// 환경변수 설정
const ENV_CONFIGS: EnvConfig[] = [
  // GitHub 관련
  {
    name: 'GITHUB_REPO',
    required: true,
    description: 'GitHub 저장소 (owner/repo 형식)',
  },
  {
    name: 'GITHUB_TOKEN',
    required: false,
    description: 'GitHub API 토큰 (private 저장소 접근용)',
  },
  {
    name: 'GITHUB_WEBHOOK_SECRET',
    required: false,
    description: 'GitHub Webhook 서명 검증용 시크릿',
  },
  // 인증 관련
  {
    name: 'AUTH_MODE',
    required: false,
    description: '인증 모드 (public/private, 기본: public)',
  },
  {
    name: 'KEYCLOAK_CLIENT_ID',
    required: false,
    description: 'Keycloak 클라이언트 ID (AUTH_MODE=private 시 필수)',
  },
  {
    name: 'KEYCLOAK_CLIENT_SECRET',
    required: false,
    description: 'Keycloak 클라이언트 시크릿 (AUTH_MODE=private 시 필수)',
  },
  {
    name: 'KEYCLOAK_ISSUER',
    required: false,
    description: 'Keycloak Issuer URL (AUTH_MODE=private 시 필수)',
  },
  // Redis 관련
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis 연결 URL (분산 환경에서 리더 선출용)',
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 환경변수 검증
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_CONFIGS) {
    const value = process.env[config.name];

    if (config.required && !value) {
      errors.push(`필수 환경변수 누락: ${config.name} - ${config.description}`);
    }
  }

  // AUTH_MODE=private일 때 Keycloak 환경변수 필수
  if (process.env.AUTH_MODE === 'private') {
    const keycloakVars = ['KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET', 'KEYCLOAK_ISSUER'];
    for (const varName of keycloakVars) {
      if (!process.env[varName]) {
        errors.push(`AUTH_MODE=private 시 필수: ${varName}`);
      }
    }
  }

  // Webhook 사용 시 시크릿 권장
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    warnings.push('GITHUB_WEBHOOK_SECRET 미설정 - Webhook이 비활성화됩니다');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 환경변수 검증 및 로그 출력
 */
export function validateAndLogEnv(): boolean {
  const result = validateEnv();

  // 경고 출력
  for (const warning of result.warnings) {
    console.warn(`[ENV] ⚠️ ${warning}`);
  }

  // 에러 출력
  for (const error of result.errors) {
    console.error(`[ENV] ❌ ${error}`);
  }

  if (result.valid) {
    console.log('[ENV] ✅ 환경변수 검증 통과');
  } else {
    console.error('[ENV] ❌ 환경변수 검증 실패');
  }

  return result.valid;
}
