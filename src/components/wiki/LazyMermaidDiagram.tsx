import { lazy, Suspense } from 'react';
import { Skeleton } from '../ui/Skeleton';

/**
 * Mermaid 다이어그램 lazy loading 래퍼
 *
 * Mermaid 라이브러리가 번들 크기의 상당 부분을 차지하므로,
 * 다이어그램이 필요한 페이지에서만 동적으로 로드합니다.
 */
const MermaidDiagram = lazy(() =>
  import('./MermaidDiagram').then((module) => ({
    default: module.MermaidDiagram,
  }))
);

interface LazyMermaidDiagramProps {
  /** Mermaid 차트 정의 문자열 */
  chart: string;
}

/**
 * Mermaid 다이어그램 로딩 스켈레톤
 */
function MermaidSkeleton() {
  return (
    <div
      className="mermaid-loading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '2rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        margin: '1.5rem 0',
        border: '1px solid var(--border-color)',
        minHeight: '200px',
      }}
    >
      <Skeleton variant="rectangular" width="80%" height={150} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        다이어그램 로딩 중...
      </span>
    </div>
  );
}

/**
 * Lazy loading이 적용된 Mermaid 다이어그램 컴포넌트
 *
 * @example
 * <LazyMermaidDiagram chart="graph TD; A-->B; B-->C;" />
 */
export function LazyMermaidDiagram({ chart }: LazyMermaidDiagramProps) {
  return (
    <Suspense fallback={<MermaidSkeleton />}>
      <MermaidDiagram chart={chart} />
    </Suspense>
  );
}
