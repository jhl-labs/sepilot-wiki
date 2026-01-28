import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  MessageSquare,
  Zap,
  ArrowRight,
  Github,
  Bot,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useWikiPages, useIssues } from '../hooks/useWiki';
import { LABELS, config, urls } from '../config';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function HomePage() {
  const { data: pages, isLoading: pagesLoading, error: pagesError, refetch: refetchPages } = useWikiPages();
  const { data: issues, isLoading: issuesLoading, error: issuesError, refetch: refetchIssues } = useIssues(LABELS.REQUEST);

  const recentIssues = issues?.slice(0, 5) || [];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Bot size={16} />
            <span>AI-Powered Documentation</span>
          </div>
          <h1 className="hero-title">{config.title}</h1>
          <p className="hero-description">{config.description}</p>
          <div className="hero-actions">
            <Link to="/wiki/home" className="btn btn-primary btn-lg">
              <BookOpen size={20} />
              <span>문서 보기</span>
            </Link>
            <a
              href={urls.newIssue({ labels: LABELS.REQUEST })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              <MessageSquare size={20} />
              <span>문서 요청</span>
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="card-icon">
              <FileText size={32} />
            </div>
            <div className="card-content">
              <h3>스마트 문서화</h3>
              <p>AI가 자동으로 문서를 생성하고 유지보수합니다</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">주요 기능</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Bot size={24} />
            </div>
            <h3>AI 문서 생성</h3>
            <p>
              GitHub Issue에 <code>request</code> 라벨을 추가하면 AI가 자동으로
              문서 초안을 작성합니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Github size={24} />
            </div>
            <h3>GitHub 통합</h3>
            <p>
              GitHub Wiki를 데이터 저장소로 활용하고, Issues로 협업 워크플로우를
              관리합니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <RefreshCw size={24} />
            </div>
            <h3>자동 업데이트</h3>
            <p>
              cron 스케줄을 통해 시스템 상태 정보를 자동으로 수집하고 문서를
              업데이트합니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={24} />
            </div>
            <h3>실시간 동기화</h3>
            <p>
              Wiki 변경 시 GitHub Actions가 트리거되어 자동으로 사이트가
              업데이트됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Documents Section */}
        <section className="documents-section">
          <div className="section-header">
            <h2>
              <FileText size={20} />
              <span>문서</span>
            </h2>
            <Link to="/wiki/home" className="see-all-link">
              전체 보기
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="documents-list">
            {pagesLoading ? (
              <>
                <Skeleton className="document-skeleton" height={60} />
                <Skeleton className="document-skeleton" height={60} />
                <Skeleton className="document-skeleton" height={60} />
              </>
            ) : pagesError ? (
              <div className="inline-error">
                <AlertCircle size={20} />
                <span>문서를 불러올 수 없습니다</span>
                <button onClick={() => refetchPages()} className="btn btn-ghost btn-sm">
                  <RefreshCw size={14} />
                  다시 시도
                </button>
              </div>
            ) : pages && pages.length > 0 ? (
              pages.slice(0, 5).map((page) => (
                <Link
                  key={page.slug}
                  to={`/wiki/${page.slug}`}
                  className="document-item"
                >
                  <FileText size={18} className="document-icon" />
                  <span className="document-title">{page.title}</span>
                  <ArrowRight size={16} className="document-arrow" />
                </Link>
              ))
            ) : (
              <div className="empty-state small">
                <p>아직 문서가 없습니다.</p>
              </div>
            )}
          </div>
        </section>

        {/* Recent Requests Section */}
        <section className="requests-section">
          <div className="section-header">
            <h2>
              <MessageSquare size={20} />
              <span>최근 요청</span>
            </h2>
            <Link to="/issues" className="see-all-link">
              전체 보기
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="requests-list">
            {issuesLoading ? (
              <>
                <Skeleton className="request-skeleton" height={80} />
                <Skeleton className="request-skeleton" height={80} />
                <Skeleton className="request-skeleton" height={80} />
              </>
            ) : issuesError ? (
              <div className="inline-error">
                <AlertCircle size={20} />
                <span>요청 목록을 불러올 수 없습니다</span>
                <button onClick={() => refetchIssues()} className="btn btn-ghost btn-sm">
                  <RefreshCw size={14} />
                  다시 시도
                </button>
              </div>
            ) : recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
                <a
                  key={issue.id}
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="request-item"
                >
                  <div className="request-header">
                    <span
                      className={`request-state ${issue.state}`}
                    >
                      {issue.state === 'open' ? '진행 중' : '완료'}
                    </span>
                    <span className="request-number">#{issue.number}</span>
                  </div>
                  <h4 className="request-title">{issue.title}</h4>
                  <div className="request-meta">
                    <img
                      src={issue.user.avatar_url}
                      alt={issue.user.login}
                      className="request-avatar"
                    />
                    <span className="request-author">{issue.user.login}</span>
                    <span className="request-date">
                      {format(new Date(issue.created_at), 'M월 d일', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <div className="empty-state">
                <MessageSquare size={32} />
                <p>아직 요청이 없습니다</p>
                <a
                  href={urls.newIssue({ labels: LABELS.REQUEST })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  첫 번째 요청 만들기
                </a>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>문서가 필요하신가요?</h2>
          <p>
            GitHub Issue를 생성하고 <code>request</code> 라벨을 추가하면 AI가
            문서를 작성해드립니다.
          </p>
          <a
            href={urls.newIssue({ labels: LABELS.REQUEST })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg"
          >
            <MessageSquare size={20} />
            <span>문서 요청하기</span>
          </a>
        </div>
      </section>
    </div>
  );
}
