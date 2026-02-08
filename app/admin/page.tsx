/**
 * 관리자 대시보드 페이지
 * 엔터프라이즈급 통계 및 관리 기능
 */

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  FolderTree,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Plus,
  Settings,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Edit3,
  Trash2,
  ExternalLink,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

interface GitStatus {
  configured?: boolean;
  message?: string;
  branch: string | null;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  } | null;
  openPRs: number;
  repoUrl: string | null;
}

interface DocumentStats {
  configured?: boolean;
  message?: string;
  total: number;
  files: Array<{ path: string; type: string; name: string }>;
}

interface Activity {
  id: string;
  type: 'created' | 'updated' | 'deleted';
  title: string;
  path: string;
  author: string;
  date: string;
}

export default function AdminDashboard() {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [docStats, setDocStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const [gitRes, docsRes] = await Promise.all([
        fetch('/api/admin/sync').catch(() => null),
        fetch('/api/admin/documents').catch(() => null),
      ]);

      if (gitRes?.ok) {
        setGitStatus(await gitRes.json());
      }

      if (docsRes?.ok) {
        setDocStats(await docsRes.json());
      }
    } catch {
      setError('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 폴더 수 계산
  const folderCount = docStats?.files?.filter(f => f.type === 'directory').length || 0;

  // 최근 활동 (mock data - 실제로는 API에서 가져와야 함)
  const recentActivity: Activity[] = docStats?.files
    ?.filter(f => f.type === 'file')
    .slice(0, 5)
    .map((f, i) => ({
      id: String(i),
      type: i % 3 === 0 ? 'created' : i % 3 === 1 ? 'updated' : 'updated',
      title: f.name.replace('.md', ''),
      path: f.path,
      author: 'Wiki Admin',
      date: new Date(Date.now() - i * 86400000).toISOString(),
    })) || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>대시보드</h1>
          <p className="admin-header-subtitle">위키 문서 및 저장소 관리</p>
        </div>
        <div className="admin-header-actions">
          <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            새로고침
          </button>
          <Link href="/admin/documents?action=new" className="btn btn-primary">
            <Plus size={16} />
            새 문서
          </Link>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 통계 카드 */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon docs">
              <FileText size={22} />
            </div>
            {docStats && (
              <span className="admin-stat-trend up">
                <TrendingUp size={12} />
                활성
              </span>
            )}
          </div>
          <div className="admin-stat-value">
            {loading ? <span className="loading"></span> : docStats?.total || 0}
          </div>
          <div className="admin-stat-label">전체 문서</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon folders">
              <FolderTree size={22} />
            </div>
          </div>
          <div className="admin-stat-value">
            {loading ? <span className="loading"></span> : folderCount}
          </div>
          <div className="admin-stat-label">카테고리</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon commits">
              <GitCommit size={22} />
            </div>
          </div>
          <div className="admin-stat-value">
            {loading ? <span className="loading"></span> : gitStatus?.lastCommit?.hash || '-'}
          </div>
          <div className="admin-stat-label">최근 커밋</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon prs">
              <GitPullRequest size={22} />
            </div>
            {gitStatus && gitStatus.openPRs > 0 && (
              <span className="admin-stat-trend up">
                {gitStatus.openPRs} open
              </span>
            )}
          </div>
          <div className="admin-stat-value">
            {loading ? <span className="loading"></span> : gitStatus?.openPRs || 0}
          </div>
          <div className="admin-stat-label">오픈 PR</div>
        </div>
      </div>

      {/* 메인 컨텐츠 그리드 */}
      <div className="admin-content-grid">
        {/* 최근 활동 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <Clock size={18} />
            <h3>최근 활동</h3>
            <Link href="/admin/documents" className="admin-card-header-action btn btn-ghost btn-sm">
              전체 보기
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="admin-card-body">
            {recentActivity.length > 0 ? (
              <div className="admin-activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="admin-activity-item">
                    <div className={`admin-activity-icon ${activity.type}`}>
                      {activity.type === 'created' && <Plus size={16} />}
                      {activity.type === 'updated' && <Edit3 size={16} />}
                      {activity.type === 'deleted' && <Trash2 size={16} />}
                    </div>
                    <div className="admin-activity-content">
                      <div className="admin-activity-title">{activity.title}</div>
                      <div className="admin-activity-meta">
                        <span>{activity.author}</span>
                        <span>•</span>
                        <span className="admin-activity-time">{formatDate(activity.date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Clock size={40} />
                <h3>활동 없음</h3>
                <p>아직 기록된 활동이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 빠른 작업 & Git 상태 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--admin-space-6)' }}>
          {/* Git 상태 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <GitCommit size={18} />
              <h3>저장소 상태</h3>
              {gitStatus?.repoUrl && (
                <a
                  href={gitStatus.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-card-header-action btn btn-ghost btn-sm"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="admin-card-body">
              {loading ? (
                <div className="admin-loading">
                  <RefreshCw size={16} className="spin" />
                  로딩 중...
                </div>
              ) : gitStatus?.configured === false ? (
                <div className="empty-state-small">
                  <AlertCircle size={24} />
                  <p>{gitStatus.message || 'GitHub 저장소가 연결되지 않았습니다.'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--admin-text-dim)' }}>
                    GITHUB_REPO, GITHUB_TOKEN 환경변수를 설정하세요.
                  </p>
                </div>
              ) : gitStatus ? (
                <>
                  <div className="admin-git-info">
                    <div className="admin-git-branch">
                      <span className="label">브랜치</span>
                      <span className="value">{gitStatus.branch}</span>
                    </div>
                    {gitStatus.lastCommit && (
                      <div className="admin-git-commit">
                        <span className="label">커밋</span>
                        <span className="value" title={gitStatus.lastCommit.message}>
                          {gitStatus.lastCommit.message.substring(0, 40)}
                          {gitStatus.lastCommit.message.length > 40 ? '...' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="admin-git-status">
                    <span className="status-badge status-success">
                      <CheckCircle size={12} />
                      최신 상태
                    </span>
                  </div>
                </>
              ) : (
                <div className="empty-state-small">
                  <AlertCircle size={24} />
                  <p>저장소 정보를 불러올 수 없습니다.</p>
                </div>
              )}
            </div>
            <div className="admin-card-footer">
              <Link href="/admin/sync" className="btn btn-secondary" style={{ width: '100%' }}>
                <Settings size={16} />
                동기화 관리
              </Link>
            </div>
          </div>

          {/* 빠른 작업 */}
          <div className="admin-card">
            <div className="admin-card-header">
              <Settings size={18} />
              <h3>빠른 작업</h3>
            </div>
            <div className="admin-card-body">
              <div className="admin-quick-actions">
                <Link href="/admin/documents?action=new" className="quick-action-btn">
                  <Plus size={18} />
                  새 문서 작성
                </Link>
                <Link href="/admin/documents" className="quick-action-btn">
                  <FileText size={18} />
                  문서 관리
                </Link>
                <Link href="/admin/sync" className="quick-action-btn">
                  <RefreshCw size={18} />
                  저장소 동기화
                </Link>
                <Link href="/admin/automation" className="quick-action-btn">
                  <Zap size={18} />
                  자동화 관리
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
