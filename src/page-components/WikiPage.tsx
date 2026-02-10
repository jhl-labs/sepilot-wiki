import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWikiPage, useDocumentAIHistory } from '../hooks/useWiki';
import { MarkdownRenderer, TableOfContents, Breadcrumb, PageMeta } from '../components/wiki';
import { RevisionHistory } from '../components/wiki/RevisionHistory';
import { Skeleton } from '../components/ui/Skeleton';
import { AlertTriangle, FileQuestion, MessageSquare, Bot, RefreshCw, AlertCircle, List, X } from 'lucide-react';
import { urls, LABELS } from '../config';
import { ApiServiceError } from '../services/api';

export function WikiPage() {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  // 와일드카드(*) 라우트에서 전체 경로를 가져옴
  const { '*': wildcardPath } = useParams();
  const slug = wildcardPath || 'home';
  const { data: page, isLoading, error, refetch } = useWikiPage(slug);
  const { data: aiHistory } = useDocumentAIHistory(slug);

  // 네트워크 에러 여부 확인
  const isNetworkError = error instanceof ApiServiceError && error.recoverable;

  if (isLoading) {
    return (
      <div className="wiki-page">
        <div className="wiki-content">
          <Skeleton className="breadcrumb-skeleton" width={200} height={20} />
          <Skeleton className="title-skeleton" width="60%" height={40} />
          <Skeleton className="meta-skeleton" width={300} height={24} />
          <div className="content-skeleton">
            <Skeleton height={20} />
            <Skeleton height={20} width="90%" />
            <Skeleton height={20} width="95%" />
            <Skeleton height={100} />
            <Skeleton height={20} width="85%" />
            <Skeleton height={20} width="80%" />
          </div>
        </div>
      </div>
    );
  }

  // 네트워크 에러 (재시도 가능)
  if (isNetworkError) {
    return (
      <div className="wiki-page">
        <div className="error-state">
          <AlertCircle size={48} />
          <h2>페이지를 불러올 수 없습니다</h2>
          <p>네트워크 연결에 문제가 있거나 서버에서 응답하지 않습니다.</p>
          <div className="error-actions">
            <button onClick={() => refetch()} className="btn btn-primary">
              <RefreshCw size={16} />
              <span>다시 시도</span>
            </button>
            <Link to="/" className="btn btn-secondary">
              홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 문서 없음
  if (error || !page) {
    return (
      <div className="wiki-page">
        <div className="error-state">
          <FileQuestion size={48} />
          <h2>페이지를 찾을 수 없습니다</h2>
          <p>요청하신 문서가 존재하지 않거나 삭제되었습니다.</p>
          <div className="error-actions">
            <a
              href={urls.newIssue({ title: `문서 요청: ${slug}`, labels: LABELS.REQUEST })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <MessageSquare size={18} />
              <span>이 문서 요청하기</span>
            </a>
            <Link to="/" className="btn btn-secondary">
              홈으로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wiki-page">
      <article className="wiki-content">
        <Breadcrumb items={[{ title: page.title }]} />

        {page.isInvalid && (
          <div className="alert alert-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>이 문서는 수정이 필요합니다</strong>
              <p>
                내용에 오류가 있거나 업데이트가 필요할 수 있습니다. 문제를
                발견하셨다면{' '}
                <a
                  href={urls.issues()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Issue
                </a>
                로 알려주세요.
              </p>
            </div>
          </div>
        )}

        {page.isDraft && (
          <div className="alert alert-info">
            <div className="alert-icon">📝</div>
            <div>
              <strong>(초안) AI가 작성한 문서입니다</strong>
              <p>
                이 문서는 아직 검토되지 않은 초안입니다. 내용이 정확하지 않을 수
                있습니다.
              </p>
            </div>
          </div>
        )}

        <header className="wiki-header">
          <h1 className="wiki-title">{page.title}</h1>
          <PageMeta page={page} />
        </header>

        <div className="wiki-body">
          <MarkdownRenderer content={page.content} />
        </div>

        {/* 가이드 페이지가 아닌 경우에만 버전 히스토리 표시 */}
        {page.history && page.history.length > 0 && !slug.startsWith('_guide/') && (
          <RevisionHistory history={page.history} slug={slug} />
        )}

        <footer className="wiki-footer">
          <div className="footer-actions">
            {aiHistory && aiHistory.length > 0 && (
              <Link to={`/ai-history/${slug}`} className="ai-history-link">
                <Bot size={16} />
                <span>AI 작업 히스토리</span>
                <span className="count">{aiHistory.length}</span>
              </Link>
            )}
            <a
              href={urls.newIssue({ title: `문서 수정 요청: ${page.title}`, labels: LABELS.REQUEST })}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              <MessageSquare size={16} />
              <span>수정 요청</span>
            </a>
          </div>
        </footer>
      </article>

      <aside className="wiki-sidebar">
        <TableOfContents content={page.content} />
      </aside>

      {/* 모바일 TOC 플로팅 버튼 */}
      <button
        className="mobile-toc-toggle"
        onClick={() => setMobileTocOpen(!mobileTocOpen)}
        aria-label={mobileTocOpen ? '목차 닫기' : '목차 열기'}
        aria-expanded={mobileTocOpen}
      >
        {mobileTocOpen ? <X size={20} /> : <List size={20} />}
      </button>

      {/* 모바일 TOC 오버레이 */}
      {mobileTocOpen && (
        <>
          <div className="mobile-toc-overlay" onClick={() => setMobileTocOpen(false)} />
          <div className="mobile-toc-panel">
            <TableOfContents content={page.content} />
          </div>
        </>
      )}
    </div>
  );
}
