import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { useTheme } from '../../context/ThemeContext';

interface MermaidDiagramProps {
    chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState('');
    const { actualTheme } = useTheme();

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: actualTheme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
        });
    }, [actualTheme]);

    useEffect(() => {
        const renderChart = async () => {
            try {
                const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                // Mermaid는 렌더링 시 DOM 요소가 필요한 경우가 있어, 
                // parse로 먼저 유효성 검사 후 render
                if (await mermaid.parse(chart)) {
                    const { svg } = await mermaid.render(id, chart);
                    // XSS 방지: DOMPurify로 SVG 정제
                    const sanitizedSvg = DOMPurify.sanitize(svg, {
                        USE_PROFILES: { svg: true, svgFilters: true },
                        ADD_TAGS: ['foreignObject'],
                    });
                    setSvg(sanitizedSvg);
                }
            } catch (error) {
                console.error('Mermaid render error:', error);
                // 에러 발생 시 원본 코드 보여주기 혹은 에러 메시지 표시
                // 여기서는 에러 메시지를 붉은 텍스트로 표시
                // XSS 방지: 에러 메시지도 정제
                const errorMessage = error instanceof Error ? error.message : String(error);
                const sanitizedError = DOMPurify.sanitize(errorMessage);
                setSvg(`<div style="color: #ef4444; padding: 1rem; border: 1px solid #ef4444; border-radius: 4px;">
          <strong>Mermaid Error:</strong><br/>
          <pre>${sanitizedError}</pre>
        </div>`);
            }
        };

        renderChart();
    }, [chart, actualTheme]);

    return (
        <div
            className="mermaid-wrapper"
            ref={ref}
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '1.5rem',
                overflowX: 'auto',
                background: actualTheme === 'dark' ? 'rgba(0,0,0,0.2)' : 'var(--bg-secondary)',
                borderRadius: '8px',
                margin: '1.5rem 0',
                border: '1px solid var(--border-color)'
            }}
        />
    );
}
