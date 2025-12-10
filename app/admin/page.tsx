/**
 * 관리자 대시보드 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  FolderTree,
  GitBranch,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface GitStatus {
  branch: string;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  changes: Array<{ status: string; file: string }>;
  behind: number;
  ahead: number;
  hasChanges: boolean;
}

interface DocumentStats {
  total: number;
  files: Array<{ path: string; type: string }>;
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

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>관리자 대시보드</h1>
        <button onClick={fetchData} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          새로고침
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="admin-cards">
        {/* 문서 통계 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <FileText size={20} />
            <h3>문서 관리</h3>
          </div>
          <div className="admin-card-body">
            {docStats ? (
              <>
                <div className="admin-stat">
                  <span className="admin-stat-value">{docStats.total}</span>
                  <span className="admin-stat-label">전체 문서</span>
                </div>
              </>
            ) : (
              <div className="admin-stat-loading">로딩 중...</div>
            )}
          </div>
          <div className="admin-card-footer">
            <Link href="/admin/documents" className="btn btn-primary">
              문서 관리
            </Link>
          </div>
        </div>

        {/* Git 상태 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <GitBranch size={20} />
            <h3>Git 상태</h3>
          </div>
          <div className="admin-card-body">
            {gitStatus ? (
              <>
                <div className="admin-git-info">
                  <div className="admin-git-branch">
                    <span className="label">브랜치:</span>
                    <span className="value">{gitStatus.branch}</span>
                  </div>
                  {gitStatus.lastCommit && (
                    <div className="admin-git-commit">
                      <span className="label">최근 커밋:</span>
                      <span className="value" title={gitStatus.lastCommit.hash}>
                        {gitStatus.lastCommit.message.substring(0, 50)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="admin-git-status">
                  {gitStatus.hasChanges ? (
                    <span className="status-badge status-warning">
                      <AlertCircle size={14} />
                      {gitStatus.changes.length}개 변경됨
                    </span>
                  ) : (
                    <span className="status-badge status-success">
                      <CheckCircle size={14} />
                      최신 상태
                    </span>
                  )}
                  {gitStatus.behind > 0 && (
                    <span className="status-badge status-info">
                      <Clock size={14} />
                      {gitStatus.behind}개 뒤처짐
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="admin-stat-loading">
                Git 상태를 확인할 수 없습니다.
              </div>
            )}
          </div>
          <div className="admin-card-footer">
            <Link href="/admin/sync" className="btn btn-primary">
              동기화 관리
            </Link>
          </div>
        </div>

        {/* 빠른 작업 */}
        <div className="admin-card">
          <div className="admin-card-header">
            <FolderTree size={20} />
            <h3>빠른 작업</h3>
          </div>
          <div className="admin-card-body">
            <div className="admin-quick-actions">
              <Link href="/admin/documents?action=new" className="quick-action-btn">
                <FileText size={16} />
                새 문서 작성
              </Link>
              <Link href="/admin/sync?action=pull" className="quick-action-btn">
                <RefreshCw size={16} />
                Pull 동기화
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
