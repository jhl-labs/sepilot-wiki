import { lazy, Suspense } from 'react';
import { Skeleton } from '../ui/Skeleton';

/**
 * Plotly 차트 lazy loading 래퍼
 *
 * Plotly.js는 매우 큰 라이브러리이므로,
 * 차트가 필요한 페이지에서만 동적으로 로드합니다.
 */
const PlotlyChart = lazy(() =>
  import('./PlotlyChart').then((module) => ({
    default: module.PlotlyChart,
  }))
);

interface LazyPlotlyChartProps {
  /** Plotly 차트 데이터 (JSON 문자열) */
  data: string;
}

/**
 * Plotly 차트 로딩 스켈레톤
 */
function PlotlySkeleton() {
  return (
    <div
      className="plotly-loading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '2rem',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        margin: '1rem 0',
        border: '1px solid var(--border-color)',
        minHeight: '250px',
      }}
    >
      <Skeleton variant="rectangular" width="90%" height={200} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        차트 로딩 중...
      </span>
    </div>
  );
}

/**
 * Lazy loading이 적용된 Plotly 차트 컴포넌트
 *
 * @example
 * const chartData = JSON.stringify({
 *   data: [{ x: [1,2,3], y: [4,5,6], type: 'scatter' }],
 *   layout: { title: 'My Chart' }
 * });
 * <LazyPlotlyChart data={chartData} />
 */
export function LazyPlotlyChart({ data }: LazyPlotlyChartProps) {
  return (
    <Suspense fallback={<PlotlySkeleton />}>
      <PlotlyChart data={data} />
    </Suspense>
  );
}
