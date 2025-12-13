
import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout, Config } from 'plotly.js';
import { useTheme } from '../../context/ThemeContext';

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

    const { chartData, error } = useMemo(() => {
        try {
            const parsed = JSON.parse(data) as ChartState;
            return { chartData: parsed, error: null };
        } catch {
            return { chartData: null, error: 'Invalid JSON for Plotly chart' };
        }
    }, [data]);

    if (error) {
        return (
            <div className="p-4 border border-red-500 rounded text-red-500 bg-red-50/10">
                <p className="font-bold">Plotly Error:</p>
                <p>{error}</p>
                <pre className="text-xs mt-2 overflow-auto max-h-32">{data}</pre>
            </div>
        );
    }

    if (!chartData) return null;

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

    const config: Partial<Config> = {
        responsive: true,
        displayModeBar: false,
        ...chartData.config,
    };

    return (
        <div
            className="plotly-wrapper w-full my-4 border rounded-lg border-[var(--border-color)] overflow-hidden"
            style={{ height: `${chartHeight}px`, minHeight: '150px' }}
        >
            <Plot
                data={chartData.data || []}
                layout={layout}
                config={config}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}
