
import { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';
import type { PlotParams } from 'react-plotly.js';
import { useTheme } from '../../context/ThemeContext';
import { AlertTriangle, BarChart3 } from 'lucide-react';

interface PlotlyChartProps {
    data: string; // JSON string
}

interface ChartState {
    data: Data[];
    layout: Partial<Layout>;
    config?: Partial<Config>;
}

export function PlotlyChart({ data }: PlotlyChartProps) {
    const { actualTheme } = useTheme();
    const [renderError, setRenderError] = useState<string | null>(null);

    const { chartData, parseError } = useMemo(() => {
        try {
            const parsed = JSON.parse(data) as ChartState;
            return { chartData: parsed, parseError: null };
        } catch {
            return { chartData: null, parseError: 'Invalid JSON for Plotly chart' };
        }
    }, [data]);

    // JSON 파싱 에러
    if (parseError) {
        return (
            <div className="plotly-error" role="alert">
                <AlertTriangle size={24} aria-hidden="true" />
                <p className="plotly-error-title">차트 데이터 오류</p>
                <p className="plotly-error-message">{parseError}</p>
                <details className="plotly-error-details">
                    <summary>원본 데이터 보기</summary>
                    <pre>{data}</pre>
                </details>
            </div>
        );
    }

    // 렌더링 에러
    if (renderError) {
        return (
            <div className="plotly-error" role="alert">
                <AlertTriangle size={24} aria-hidden="true" />
                <p className="plotly-error-title">차트 렌더링 오류</p>
                <p className="plotly-error-message">{renderError}</p>
            </div>
        );
    }

    if (!chartData) return null;

    // 빈 데이터 처리
    if (!chartData.data || chartData.data.length === 0) {
        return (
            <div className="plotly-empty" role="status">
                <BarChart3 size={32} aria-hidden="true" />
                <p>차트 데이터가 비어있습니다</p>
            </div>
        );
    }

    // 높이 계산: layout에서 height가 지정되어 있으면 사용, 아니면 기본값 400
    const chartHeight = chartData.layout?.height || 400;

    // 기본 테마 설정 적용
    const layout: Partial<Layout> = {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
            color: actualTheme === 'dark' ? '#e5e7eb' : '#374151',
        },
        margin: { t: 40, r: 20, l: 50, b: 40 },
        autosize: true,
        ...chartData.layout,
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        ...chartData.config,
    } satisfies Partial<Config> as PlotParams['config'];

    return (
        <div
            className="plotly-wrapper"
            style={{ height: `${chartHeight}px`, minHeight: '150px' }}
        >
            <Plot
                data={chartData.data}
                layout={layout}
                config={config}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                onError={(err) => setRenderError(err?.message || '알 수 없는 렌더링 오류')}
            />
        </div>
    );
}
