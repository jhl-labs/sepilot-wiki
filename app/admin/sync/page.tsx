/**
 * 관리자 Git 동기화 페이지
 * 엔터프라이즈급 저장소 관리 대시보드
 */

'use client';

import { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  X,
  Shield,
  Users,
  Star,
  GitFork,
  Activity,
  Play,
  XCircle,
  Loader2,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';

interface Repository {
  name: string;
  description: string | null;
  visibility: 'private' | 'public';
  defaultBranch: string;
  htmlUrl: string;
  pushedAt: string;
  updatedAt: string;
  size: number;
  stargazers: number;
  forks: number;
  openIssues: number;
}

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  fullMessage: string;
  author: {
    name: string;
    email: string;
    date: string;
    avatar: string;
    login: string;
  };
  htmlUrl: string;
}

interface PullRequest {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  author: {
    login: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  labels: Array<{ name: string; color: string }>;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

interface BranchProtection {
  requiredReviews: number;
  requireStatusChecks: boolean;
  enforceAdmins: boolean;
}

interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

interface SyncData {
  repository: Repository;
  commits: Commit[];
  pullRequests: PullRequest[];
  workflowRuns: WorkflowRun[];
  branchProtection: BranchProtection | null;
  contributors: Contributor[];
}

export default function SyncPage() {
  const [data, setData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'commits' | 'prs' | 'workflows'>('commits');

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sync');
      if (res.ok) {
        setData(await res.json());
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Git 상태를 확인할 수 없습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Git 상태를 확인할 수 없습니다.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: result.message });
        setTimeout(fetchStatus, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || '동기화 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '동기화 실패' });
    } finally {
      setSyncing(false);
    }
  }

  function formatDate(dateStr: string) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return '방금 전';
      if (minutes < 60) return `${minutes}분 전`;
      if (hours < 24) return `${hours}시간 전`;
      if (days < 7) return `${days}일 전`;
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function formatSize(kb: number) {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function getWorkflowStatusIcon(status: string, conclusion: string | null) {
    if (status === 'in_progress' || status === 'queued') {
      return <Loader2 size={14} className="spin" />;
    }
    if (conclusion === 'success') {
      return <CheckCircle size={14} />;
    }
    if (conclusion === 'failure') {
      return <XCircle size={14} />;
    }
    return <Clock size={14} />;
  }

  function getWorkflowStatusClass(status: string, conclusion: string | null) {
    if (status === 'in_progress' || status === 'queued') return 'status-info';
    if (conclusion === 'success') return 'status-success';
    if (conclusion === 'failure') return 'status-error';
    return 'status-warning';
  }

  return (
    <div className="admin-sync">
      <div className="admin-header">
        <div>
          <h1>저장소 관리</h1>
          <p className="admin-header-subtitle">GitHub 저장소 상태 및 활동 모니터링</p>
        </div>
        <div className="admin-header-actions">
          <button onClick={fetchStatus} className="btn btn-secondary" disabled={loading || syncing}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            새로고침
          </button>
          <button onClick={handleSync} className="btn btn-primary" disabled={loading || syncing}>
            <Play size={16} />
            동기화 실행
          </button>
        </div>
      </div>

      {message && (
        <div className={`admin-alert admin-alert-${message.type}`}>
          {message.type === 'success' ? (
            <CheckCircle size={16} />
          ) : message.type === 'info' ? (
            <Clock size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-full">
          <RefreshCw size={32} className="spin" />
          <p>저장소 정보를 불러오는 중...</p>
        </div>
      ) : data ? (
        <>
          {/* 저장소 개요 */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon docs">
                  <GitBranch size={22} />
                </div>
                <span className={`admin-stat-trend ${data.repository.visibility === 'private' ? 'warning' : 'up'}`}>
                  {data.repository.visibility === 'private' ? <Lock size={12} /> : <Unlock size={12} />}
                  {data.repository.visibility}
                </span>
              </div>
              <div className="admin-stat-value">{data.repository.defaultBranch}</div>
              <div className="admin-stat-label">기본 브랜치</div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon commits">
                  <GitCommit size={22} />
                </div>
              </div>
              <div className="admin-stat-value">{data.commits.length}</div>
              <div className="admin-stat-label">최근 커밋</div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon prs">
                  <GitPullRequest size={22} />
                </div>
                {data.pullRequests.length > 0 && (
                  <span className="admin-stat-trend up">{data.pullRequests.length} open</span>
                )}
              </div>
              <div className="admin-stat-value">{data.pullRequests.length}</div>
              <div className="admin-stat-label">오픈 PR</div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-header">
                <div className="admin-stat-icon folders">
                  <Activity size={22} />
                </div>
              </div>
              <div className="admin-stat-value">{data.workflowRuns.length}</div>
              <div className="admin-stat-label">워크플로우</div>
            </div>
          </div>

          {/* 저장소 정보 카드 */}
          <div className="admin-content-grid">
            <div className="admin-card">
              <div className="admin-card-header">
                <GitBranch size={18} />
                <h3>저장소 정보</h3>
                <a
                  href={data.repository.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-card-header-action btn btn-ghost btn-sm"
                >
                  GitHub에서 보기
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="admin-card-body">
                <div className="sync-repo-info">
                  <div className="repo-name">
                    <strong>{data.repository.name}</strong>
                    {data.repository.description && (
                      <p className="repo-description">{data.repository.description}</p>
                    )}
                  </div>

                  <div className="repo-stats">
                    <div className="repo-stat">
                      <Star size={16} />
                      <span>{data.repository.stargazers}</span>
                    </div>
                    <div className="repo-stat">
                      <GitFork size={16} />
                      <span>{data.repository.forks}</span>
                    </div>
                    <div className="repo-stat">
                      <AlertCircle size={16} />
                      <span>{data.repository.openIssues} issues</span>
                    </div>
                    <div className="repo-stat">
                      <Eye size={16} />
                      <span>{formatSize(data.repository.size)}</span>
                    </div>
                  </div>

                  <div className="repo-meta">
                    <div className="meta-item">
                      <span className="label">마지막 푸시</span>
                      <span className="value">{formatDate(data.repository.pushedAt)}</span>
                    </div>
                    <div className="meta-item">
                      <span className="label">마지막 업데이트</span>
                      <span className="value">{formatDate(data.repository.updatedAt)}</span>
                    </div>
                  </div>

                  {data.branchProtection && (
                    <div className="branch-protection">
                      <div className="protection-header">
                        <Shield size={16} />
                        <span>브랜치 보호 활성화</span>
                      </div>
                      <div className="protection-rules">
                        {data.branchProtection.requiredReviews > 0 && (
                          <span className="protection-rule">
                            리뷰 {data.branchProtection.requiredReviews}명 필요
                          </span>
                        )}
                        {data.branchProtection.requireStatusChecks && (
                          <span className="protection-rule">상태 체크 필수</span>
                        )}
                        {data.branchProtection.enforceAdmins && (
                          <span className="protection-rule">관리자에게도 적용</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 컨트리뷰터 */}
            <div className="admin-card">
              <div className="admin-card-header">
                <Users size={18} />
                <h3>주요 기여자</h3>
              </div>
              <div className="admin-card-body">
                {data.contributors.length > 0 ? (
                  <div className="contributors-list">
                    {data.contributors.map((contributor) => (
                      <div key={contributor.login} className="contributor-item">
                        <img
                          src={contributor.avatar_url}
                          alt={contributor.login}
                          className="contributor-avatar"
                        />
                        <div className="contributor-info">
                          <span className="contributor-name">{contributor.login}</span>
                          <span className="contributor-commits">
                            {contributor.contributions} commits
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-small">
                    <Users size={24} />
                    <p>컨트리뷰터 정보 없음</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'commits' ? 'active' : ''}`}
              onClick={() => setActiveTab('commits')}
            >
              <GitCommit size={16} />
              커밋 히스토리
              <span className="tab-count">{data.commits.length}</span>
            </button>
            <button
              className={`admin-tab ${activeTab === 'prs' ? 'active' : ''}`}
              onClick={() => setActiveTab('prs')}
            >
              <GitPullRequest size={16} />
              Pull Requests
              <span className="tab-count">{data.pullRequests.length}</span>
            </button>
            <button
              className={`admin-tab ${activeTab === 'workflows' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflows')}
            >
              <Activity size={16} />
              워크플로우
              <span className="tab-count">{data.workflowRuns.length}</span>
            </button>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="admin-tab-content">
            {/* 커밋 목록 */}
            {activeTab === 'commits' && (
              <div className="admin-card">
                <div className="admin-card-body">
                  {data.commits.length > 0 ? (
                    <div className="commits-list">
                      {data.commits.map((commit) => (
                        <a
                          key={commit.sha}
                          href={commit.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="commit-item"
                        >
                          <div className="commit-avatar">
                            {commit.author.avatar ? (
                              <img src={commit.author.avatar} alt={commit.author.name} />
                            ) : (
                              <div className="avatar-placeholder">
                                {commit.author.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="commit-content">
                            <div className="commit-message">{commit.message}</div>
                            <div className="commit-meta">
                              <span className="commit-author">{commit.author.name}</span>
                              <span className="commit-sha">{commit.shortSha}</span>
                              <span className="commit-date">{formatDate(commit.author.date)}</span>
                            </div>
                          </div>
                          <ExternalLink size={14} className="commit-link-icon" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <GitCommit size={40} />
                      <h3>커밋 없음</h3>
                      <p>아직 커밋이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PR 목록 */}
            {activeTab === 'prs' && (
              <div className="admin-card">
                <div className="admin-card-body">
                  {data.pullRequests.length > 0 ? (
                    <div className="prs-list">
                      {data.pullRequests.map((pr) => (
                        <a
                          key={pr.number}
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pr-item"
                        >
                          <div className="pr-avatar">
                            {pr.author.avatar ? (
                              <img src={pr.author.avatar} alt={pr.author.login} />
                            ) : (
                              <div className="avatar-placeholder">
                                {pr.author.login.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="pr-content">
                            <div className="pr-title">
                              {pr.draft && <span className="pr-draft-badge">Draft</span>}
                              <span className="pr-number">#{pr.number}</span>
                              {pr.title}
                            </div>
                            <div className="pr-meta">
                              <span className="pr-author">{pr.author.login}</span>
                              <span className="pr-date">{formatDate(pr.createdAt)}</span>
                            </div>
                            {pr.labels.length > 0 && (
                              <div className="pr-labels">
                                {pr.labels.map((label) => (
                                  <span
                                    key={label.name}
                                    className="pr-label"
                                    style={{ backgroundColor: `#${label.color}` }}
                                  >
                                    {label.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <ExternalLink size={14} className="pr-link-icon" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <GitPullRequest size={40} />
                      <h3>오픈 PR 없음</h3>
                      <p>현재 열려있는 Pull Request가 없습니다.</p>
                      <a
                        href={`${data.repository.htmlUrl}/pulls`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        모든 PR 보기
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 워크플로우 목록 */}
            {activeTab === 'workflows' && (
              <div className="admin-card">
                <div className="admin-card-body">
                  {data.workflowRuns.length > 0 ? (
                    <div className="workflows-list">
                      {data.workflowRuns.map((run) => (
                        <a
                          key={run.id}
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="workflow-item"
                        >
                          <div className={`workflow-status ${getWorkflowStatusClass(run.status, run.conclusion)}`}>
                            {getWorkflowStatusIcon(run.status, run.conclusion)}
                          </div>
                          <div className="workflow-content">
                            <div className="workflow-name">{run.name}</div>
                            <div className="workflow-meta">
                              <span className="workflow-conclusion">
                                {run.status === 'in_progress' ? '실행 중' :
                                 run.conclusion === 'success' ? '성공' :
                                 run.conclusion === 'failure' ? '실패' :
                                 run.conclusion || run.status}
                              </span>
                              <span className="workflow-date">{formatDate(run.created_at)}</span>
                            </div>
                          </div>
                          <ExternalLink size={14} className="workflow-link-icon" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <Activity size={40} />
                      <h3>워크플로우 없음</h3>
                      <p>최근 실행된 워크플로우가 없습니다.</p>
                      <a
                        href={`${data.repository.htmlUrl}/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        Actions 보기
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 빠른 링크 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <ExternalLink size={18} />
              <h3>빠른 링크</h3>
            </div>
            <div className="admin-card-body">
              <div className="quick-links">
                <a
                  href={data.repository.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-link"
                >
                  <GitBranch size={20} />
                  <span>저장소</span>
                </a>
                <a
                  href={`${data.repository.htmlUrl}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-link"
                >
                  <AlertCircle size={20} />
                  <span>이슈</span>
                </a>
                <a
                  href={`${data.repository.htmlUrl}/pulls`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-link"
                >
                  <GitPullRequest size={20} />
                  <span>Pull Requests</span>
                </a>
                <a
                  href={`${data.repository.htmlUrl}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-link"
                >
                  <Activity size={20} />
                  <span>Actions</span>
                </a>
                <a
                  href={`${data.repository.htmlUrl}/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quick-link"
                >
                  <Shield size={20} />
                  <span>설정</span>
                </a>
                <Link href="/admin/documents" className="quick-link">
                  <Clock size={20} />
                  <span>문서 관리</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="admin-card">
          <div className="admin-card-body">
            <div className="empty-state">
              <AlertCircle size={40} />
              <h3>연결 실패</h3>
              <p>GitHub 저장소에 연결할 수 없습니다.</p>
              <button onClick={fetchStatus} className="btn btn-primary">
                <RefreshCw size={16} />
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
