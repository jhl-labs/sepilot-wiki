import type { ThemeConfig } from './src/types';

/**
 * 테마 설정
 *
 * 이 파일에서 위키의 색상, 폰트, 레이아웃을 커스터마이징합니다.
 * CSS 변수로 자동 변환되어 적용됩니다.
 *
 * 색상 형식: HEX (#ffffff), RGB (rgb(255, 255, 255)), HSL (hsl(0, 0%, 100%))
 */
export const themeConfig: ThemeConfig = {
  colors: {
    // 라이트 테마 색상
    light: {
      // 메인 브랜드 색상
      primary: '#3b82f6', // blue-500
      primaryHover: '#2563eb', // blue-600

      // 배경색
      background: '#ffffff',
      backgroundSecondary: '#f8fafc', // slate-50
      backgroundTertiary: '#f1f5f9', // slate-100

      // 텍스트 색상
      text: '#0f172a', // slate-900
      textSecondary: '#475569', // slate-600
      textMuted: '#94a3b8', // slate-400

      // 테두리 색상
      border: '#e2e8f0', // slate-200

      // 강조 색상
      accent: '#8b5cf6', // violet-500

      // 상태 색상
      success: '#10b981', // emerald-500
      warning: '#f59e0b', // amber-500
      error: '#ef4444', // red-500
      info: '#3b82f6', // blue-500
    },

    // 다크 테마 색상
    dark: {
      // 메인 브랜드 색상
      primary: '#60a5fa', // blue-400
      primaryHover: '#93c5fd', // blue-300

      // 배경색
      background: '#0f172a', // slate-900
      backgroundSecondary: '#1e293b', // slate-800
      backgroundTertiary: '#334155', // slate-700

      // 텍스트 색상
      text: '#f8fafc', // slate-50
      textSecondary: '#cbd5e1', // slate-300
      textMuted: '#64748b', // slate-500

      // 테두리 색상
      border: '#334155', // slate-700

      // 강조 색상
      accent: '#a78bfa', // violet-400

      // 상태 색상
      success: '#34d399', // emerald-400
      warning: '#fbbf24', // amber-400
      error: '#f87171', // red-400
      info: '#60a5fa', // blue-400
    },
  },

  // 폰트 설정 (선택사항)
  // Google Fonts URL이나 시스템 폰트 스택 사용 가능
  fonts: {
    // 본문 폰트
    sans: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    // 코드 폰트
    mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    // 제목 폰트 (선택사항, 미지정시 sans 사용)
    // heading: "'Noto Sans KR', sans-serif",
  },

  // 레이아웃 설정 (선택사항)
  layout: {
    headerHeight: '64px',
    sidebarWidth: '280px',
    contentMaxWidth: '900px',
    tocWidth: '240px',
  },

  // 테두리 반경 설정 (선택사항)
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
  },
};

export default themeConfig;
