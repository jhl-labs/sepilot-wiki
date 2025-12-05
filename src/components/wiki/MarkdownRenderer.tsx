import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { actualTheme } = useTheme();

  return (
    <div className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;

            if (isInline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match?.[1] || 'text'}
                theme={actualTheme}
              >
                {String(children).replace(/\n$/, '')}
              </CodeBlock>
            );
          },
          a({ href, children, ...props }) {
            const isExternal = href?.startsWith('http');
            const isWikiLink = href?.startsWith('/wiki/') || href?.startsWith('./');

            if (isWikiLink || !isExternal) {
              const to = href?.startsWith('./')
                ? `/wiki/${href.slice(2).replace('.md', '')}`
                : href || '/';
              return (
                <Link to={to} className="wiki-link">
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
          img({ src, alt, ...props }) {
            return (
              <figure className="image-figure">
                <img src={src} alt={alt} loading="lazy" {...props} />
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
            const id = generateId(children);
            return <h2 id={id} className="heading heading-2">{children}</h2>;
          },
          h3({ children }) {
            const id = generateId(children);
            return <h3 id={id} className="heading heading-3">{children}</h3>;
          },
          h4({ children }) {
            const id = generateId(children);
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
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

function generateId(children: React.ReactNode): string {
  const text = typeof children === 'string'
    ? children
    : Array.isArray(children)
      ? children.map(c => typeof c === 'string' ? c : '').join('')
      : '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
