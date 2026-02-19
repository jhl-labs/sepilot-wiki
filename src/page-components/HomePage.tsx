import { useState } from 'react';
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
  BarChart3,
  Search,
  Clock,
  Activity,
} from 'lucide-react';
import { useWikiPages, useIssues, useDashboardStats, useAgentMetrics, useActionsStatus, useHealthStatus } from '../hooks/useWiki';
import { LABELS, config, urls } from '../config';
import { Skeleton } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ActivityPeriod } from '../types';

type PeriodKey = 'last1h' | 'last24h' | 'last7d';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  last1h: '1시간',
  last24h: '24시간',
  last7d: '7일',
};

/** 토큰 수를 K/M 단위로 변환 */
function formatTokens(n: number | null | undefined): string {
  if (n == null || n === 0) return '-';
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}K`;
  return `~${n}`;
}

/** 밀리초를 사람이 읽기 쉬운 형식으로 변환 */
function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms === 0) return '-';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}초`;
  const minutes = seconds / 60;
  if (minutes < 60) return `~${minutes.toFixed(1)}분`;
  const hours = minutes / 60;
  return `~${hours.toFixed(1)}시간`;
}

export function HomePage() {
  const { data: pages, isLoading: pagesLoading, error: pagesError, refetch: refetchPages } = useWikiPages();
  const { data: issues, isLoading: issuesLoading, error: issuesError, refetch: refetchIssues } = useIssues(LABELS.REQUEST);
  const { data: dashboardStats } = useDashboardStats();
  const { data: agentMetrics } = useAgentMetrics();
  const { data: actionsStatus } = useActionsStatus();
  const { data: healthStatus } = useHealthStatus();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('last24h');

  const recentIssues = issues?.slice(0, 5) || [];

  const overview = dashboardStats?.overview;
  const activity: ActivityPeriod | null = dashboardStats?.activity?.[selectedPeriod] ?? null;

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

      {/* System Health Banner */}
      {healthStatus && (
        <section className={`health-banner health-${healthStatus.overall}`}>
          <div className="health-banner-content">
            <span className="health-indicator" />
            <span className="health-label">
              시스템 상태: {healthStatus.overall === 'healthy' ? '정상' : healthStatus.overall === 'degraded' ? '저하' : '비정상'}
            </span>
            {healthStatus.recentErrors > 0 && (
              <span className="health-errors">최근 에러 {healthStatus.recentErrors}건</span>
            )}
          </div>
        </section>
      )}

      {/* Dashboard Section */}
      <section className="dashboard-section">
        <h2 className="section-title">
          <BarChart3 size={22} />
          <span>대시보드</span>
        </h2>

        {/* 개요 통계 카드 */}
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">
              <FileText size={20} />
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">
                {overview?.totalDocuments ?? '-'}
              </span>
              <span className="dashboard-stat-label">전체 문서</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon open-requests">
              <MessageSquare size={20} />
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">
                {overview?.openRequests ?? '-'}
              </span>
              <span className="dashboard-stat-label">진행 중 요청</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon ai-actions">
              <Activity size={20} />
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">
                {activity?.aiActions ?? '-'}
              </span>
              <span className="dashboard-stat-label">AI 활동 ({PERIOD_LABELS[selectedPeriod]})</span>
            </div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon research">
              <Search size={20} />
            </div>
            <div className="dashboard-stat-content">
              <span className="dashboard-stat-value">
                {activity?.tavilyResults ?? '-'}
              </span>
              <span className="dashboard-stat-label">연구 소스 ({PERIOD_LABELS[selectedPeriod]})</span>
            </div>
          </div>
        </div>

        {/* 기간 선택 탭 */}
        <div className="dashboard-period-tabs">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
            <button
              key={key}
              className={`dashboard-period-tab ${selectedPeriod === key ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(key)}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>

        {/* 상세 인사이트 */}
        <div className="dashboard-insights-grid">
          <div className="insight-card">
            <div className="insight-header">
              <Search size={16} />
              <span>Tavily API</span>
            </div>
            <div className="insight-value">
              {activity?.tavilyApiCalls ?? '-'}
              <span className="insight-unit">회 호출</span>
            </div>
            <div className="insight-detail">
              {activity?.tavilyResults ?? '-'}개 결과
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-header">
              <Bot size={16} />
              <span>AI 토큰</span>
            </div>
            <div className="insight-value">
              {formatTokens(activity?.estimatedTokens)}
              <span className="insight-unit"> 토큰</span>
            </div>
            <div className="insight-detail">
              {activity?.documentsCreated ?? '-'}건 생성
            </div>
          </div>
          <div className="insight-card">
            <div className="insight-header">
              <Clock size={16} />
              <span>파이프라인</span>
            </div>
            <div className="insight-value">
              {formatDuration(activity?.totalPipelineDurationMs)}
            </div>
            <div className="insight-detail">
              {activity?.aiActions ?? '-'}건 작업
            </div>
          </div>
        </div>

        {/* 에이전트 메트릭 */}
        {agentMetrics?.summary && Object.keys(agentMetrics.summary).length > 0 && (
          <div className="dashboard-agents-section">
            <h3 className="subsection-title">
              <Bot size={18} />
              <span>에이전트 성능</span>
            </h3>
            <div className="dashboard-agents-grid">
              {Object.entries(agentMetrics.summary).map(([role, stats]) => (
                <div key={role} className="agent-metric-card">
                  <div className="agent-metric-header">
                    <span className="agent-role">{role}</span>
                    <span className={`agent-success-rate ${stats.successCount / Math.max(stats.totalRuns, 1) >= 0.9 ? 'good' : 'warn'}`}>
                      {Math.round((stats.successCount / Math.max(stats.totalRuns, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="agent-metric-stats">
                    <div className="agent-stat">
                      <span className="agent-stat-value">{stats.totalRuns}</span>
                      <span className="agent-stat-label">실행</span>
                    </div>
                    <div className="agent-stat">
                      <span className="agent-stat-value">{formatDuration(stats.avgDurationMs)}</span>
                      <span className="agent-stat-label">평균 시간</span>
                    </div>
                    <div className="agent-stat">
                      <span className="agent-stat-value">{formatTokens(stats.avgTokens)}</span>
                      <span className="agent-stat-label">평균 토큰</span>
                    </div>
                    {stats.avgReviewScore != null && (
                      <div className="agent-stat">
                        <span className="agent-stat-value">{stats.avgReviewScore}</span>
                        <span className="agent-stat-label">리뷰 점수</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Workflow Status Section */}
      {actionsStatus && Array.isArray(actionsStatus.workflows) && actionsStatus.workflows.length > 0 && (
        <section className="dashboard-section">
          <h3 className="subsection-title">
            <Activity size={18} />
            <span>워크플로우 상태</span>
          </h3>
          <div className="workflow-status-grid">
            {actionsStatus.workflows.map((wf) => {
              const status = wf.overallStatus || 'unknown';
              const failureCount = wf.recentRuns?.filter((r) => r.conclusion === 'failure').length ?? 0;
              const totalRuns = wf.recentRuns?.length ?? 0;
              const failureRate = totalRuns > 0 ? failureCount / totalRuns : 0;
              return (
                <div
                  key={wf.name}
                  className={`workflow-status-card ${status === 'failure' ? 'workflow-failure' : ''}`}
                >
                  <div className="workflow-status-header">
                    <span className="workflow-name">{wf.name}</span>
                    <span className={`workflow-badge workflow-${status}`}>
                      {status === 'success' ? '성공' : status === 'failure' ? '실패' : status}
                    </span>
                  </div>
                  <div className="workflow-status-stats">
                    <span className="workflow-stat">최근 {totalRuns}건</span>
                    {failureRate > 0 && (
                      <span className="workflow-stat">실패율 {Math.round(failureRate * 100)}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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
