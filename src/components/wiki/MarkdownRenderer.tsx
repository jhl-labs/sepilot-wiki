'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import Link from 'next/link';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { LazyMermaidDiagram } from './LazyMermaidDiagram';
import { LazyPlotlyChart } from './LazyPlotlyChart';
import { generateHeadingId } from '../../utils';
import { SectionErrorBoundary } from '../error/ErrorBoundary';

/**
 * MarkdownRenderer 컴포넌트 Props
 */
interface MarkdownRendererProps {
  /** 렌더링할 마크다운 문자열 */
  content: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 마크다운 콘텐츠를 HTML로 렌더링하는 컴포넌트
 *
 * 지원 기능:
 * - GitHub Flavored Markdown (GFM)
 * - 코드 블록 구문 강조 (Prism)
 * - Mermaid 다이어그램 (`mermaid` 코드 블록)
 * - Plotly 차트 (`plotly` 코드 블록)
 * - 이미지, 테이블, 인용문 스타일링
 * - 내부/외부 링크 자동 처리
 *
 * @example
 * // 기본 사용법
 * <MarkdownRenderer content="# 제목\n본문 내용" />
 *
 * @example
 * // Mermaid 다이어그램 포함
 * const md = `
 * \`\`\`mermaid
 * graph TD
 *   A --> B
 * \`\`\`
 * `;
 * <MarkdownRenderer content={md} />
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { actualTheme } = useTheme();

  return (
    <div className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          code({ className, children, ref: _ref, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            if (isInline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }

            const language = match?.[1] || 'text';

            if (language === 'mermaid') {
              return (
                <SectionErrorBoundary
                  sectionName="다이어그램"
                  errorMessage="다이어그램을 렌더링할 수 없습니다"
                >
                  <LazyMermaidDiagram chart={String(children)} />
                </SectionErrorBoundary>
              );
            }

            if (language === 'plotly') {
              return (
                <SectionErrorBoundary
                  sectionName="차트"
                  errorMessage="차트를 렌더링할 수 없습니다"
                >
                  <LazyPlotlyChart data={String(children)} />
                </SectionErrorBoundary>
              );
            }

            return (
              <SectionErrorBoundary
                sectionName="코드 블록"
                errorMessage="코드를 표시할 수 없습니다"
              >
                <CodeBlock
                  language={language}
                  theme={actualTheme}
                >
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              </SectionErrorBoundary>
            );
          },
          a({ href, children, ref: _ref, ...props }) {
            const isExternal = href?.startsWith('http');
            const isWikiLink = href?.startsWith('/wiki/') || href?.startsWith('./');

            if (isWikiLink || !isExternal) {
              const linkHref = href?.startsWith('./')
                ? `/wiki/${href.slice(2).replace('.md', '')}`
                : href || '/';
              return (
                <Link href={linkHref} className="wiki-link">
                  {children}
                </Link>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link"
                {...props}
              >
                {children}
                <ExternalLink size={14} className="external-icon" />
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="table-wrapper">
                <table>{children}</table>
              </div>
            );
          },
          img({ src, alt, width, height, ref: _ref, ...props }) {
            return (
              <figure className="image-figure">
                <img
                  src={src}
                  alt={alt || ''}
                  loading="lazy"
                  decoding="async"
                  // CLS 방지를 위한 기본 크기 설정
                  width={width || 'auto'}
                  height={height || 'auto'}
                  style={{
                    // 이미지 크기가 지정되지 않은 경우 aspect-ratio 힌트 제공
                    aspectRatio: !width && !height ? '16 / 9' : undefined,
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 UI
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'image-error';
                    placeholder.textContent = '이미지를 불러올 수 없습니다';
                    target.parentNode?.insertBefore(placeholder, target);
                  }}
                  {...props}
                />
                {alt && <figcaption>{alt}</figcaption>}
              </figure>
            );
          },
          blockquote({ children }) {
            return <blockquote className="blockquote">{children}</blockquote>;
          },
          h1() {
            // H1은 페이지 헤더에서 frontmatter title로 렌더링되므로 본문에서는 숨김
            return null;
          },
          h2({ children }) {
            const text = extractTextFromChildren(children);
            const id = generateHeadingId(text);
            return <h2 id={id} className="heading heading-2">{children}</h2>;
          },
          h3({ children }) {
            const text = extractTextFromChildren(children);
            const id = generateHeadingId(text);
            return <h3 id={id} className="heading heading-3">{children}</h3>;
          },
          h4({ children }) {
            const text = extractTextFromChildren(children);
            const id = generateHeadingId(text);
            return <h4 id={id} className="heading heading-4">{children}</h4>;
          },
          ul({ children }) {
            return <ul className="list list-unordered">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list list-ordered">{children}</ol>;
          },
          li({ children }) {
            return <li className="list-item">{children}</li>;
          },
          hr() {
            return <hr className="divider" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({
  children,
  language,
  theme,
}: {
  children: string;
  language: string;
  theme: 'light' | 'dark';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API 실패 시 폴백 (구형 브라우저 또는 권한 거부)
      try {
        const textarea = document.createElement('textarea');
        textarea.value = children;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error('클립보드 복사 실패');
      }
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <button
          className="copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={theme === 'dark' ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 8px 8px',
          fontSize: '0.875rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// 헤딩 ID 생성 헬퍼 (React children에서 텍스트 추출)
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(c => typeof c === 'string' ? c : '').join('');
  }
  return '';
}
