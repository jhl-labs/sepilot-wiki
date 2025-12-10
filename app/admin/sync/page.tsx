/**
 * 관리자 Git 동기화 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  RefreshCw,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  X,
} from 'lucide-react';

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

export default function SyncPage() {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitModal, setShowCommitModal] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sync');
      if (res.ok) {
        setStatus(await res.json());
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

  async function handlePull(rebase = false) {
    setSyncing(true);
    setOutput(null);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rebase }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Pull 완료' });
        setOutput(data.output);
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Pull 실패' });
        setOutput(data.output);
      }
    } catch {
      setMessage({ type: 'error', text: 'Pull 실패' });
    } finally {
      setSyncing(false);
    }
  }

  async function handlePush(force = false) {
    setSyncing(true);
    setOutput(null);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Push 완료' });
        setOutput(data.output);
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Push 실패' });
        setOutput(data.output);
      }
    } catch {
      setMessage({ type: 'error', text: 'Push 실패' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCommit() {
    if (!commitMessage.trim()) {
      setMessage({ type: 'error', text: '커밋 메시지를 입력하세요.' });
      return;
    }

    setSyncing(true);
    setOutput(null);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: '커밋 완료' });
        setOutput(data.output);
        setCommitMessage('');
        setShowCommitModal(false);
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || '커밋 실패' });
        setOutput(data.output);
      }
    } catch {
      setMessage({ type: 'error', text: '커밋 실패' });
    } finally {
      setSyncing(false);
    }
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString('ko-KR');
    } catch {
      return dateStr;
    }
  }

  function getStatusIcon(statusCode: string) {
    switch (statusCode) {
      case 'M':
        return '수정됨';
      case 'A':
        return '추가됨';
      case 'D':
        return '삭제됨';
      case '??':
        return '추적 안됨';
      default:
        return statusCode;
    }
  }

  return (
    <div className="admin-sync">
      <div className="admin-header">
        <h1>Git 동기화</h1>
        <button onClick={fetchStatus} className="btn btn-secondary" disabled={loading || syncing}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          새로고침
        </button>
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

      <div className="admin-sync-container">
        {/* Git 상태 정보 */}
        <div className="sync-status-card">
          <div className="sync-status-header">
            <GitBranch size={20} />
            <h3>저장소 상태</h3>
          </div>

          {status ? (
            <div className="sync-status-body">
              <div className="status-info">
                <div className="status-item">
                  <span className="label">브랜치</span>
                  <span className="value">{status.branch}</span>
                </div>

                {status.lastCommit && (
                  <>
                    <div className="status-item">
                      <span className="label">최근 커밋</span>
                      <span className="value commit-hash">{status.lastCommit.hash.substring(0, 7)}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">메시지</span>
                      <span className="value">{status.lastCommit.message}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">작성자</span>
                      <span className="value">{status.lastCommit.author}</span>
                    </div>
                    <div className="status-item">
                      <span className="label">날짜</span>
                      <span className="value">{formatDate(status.lastCommit.date)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="status-badges">
                {status.behind > 0 && (
                  <span className="status-badge status-warning">
                    <Download size={14} />
                    {status.behind}개 뒤처짐
                  </span>
                )}
                {status.ahead > 0 && (
                  <span className="status-badge status-info">
                    <Upload size={14} />
                    {status.ahead}개 앞섬
                  </span>
                )}
                {!status.hasChanges && status.behind === 0 && status.ahead === 0 && (
                  <span className="status-badge status-success">
                    <CheckCircle size={14} />
                    동기화됨
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="sync-status-loading">Git 상태를 확인할 수 없습니다.</div>
          )}
        </div>

        {/* 로컬 변경사항 */}
        {status?.hasChanges && (
          <div className="sync-changes-card">
            <div className="sync-changes-header">
              <FileText size={20} />
              <h3>로컬 변경사항</h3>
              <span className="changes-count">{status.changes.length}개</span>
            </div>
            <div className="sync-changes-list">
              {status.changes.map((change, idx) => (
                <div key={idx} className="change-item">
                  <span className={`change-status status-${change.status.toLowerCase()}`}>
                    {getStatusIcon(change.status)}
                  </span>
                  <span className="change-file">{change.file}</span>
                </div>
              ))}
            </div>
            <div className="sync-changes-actions">
              <button
                onClick={() => setShowCommitModal(true)}
                className="btn btn-primary"
                disabled={syncing}
              >
                <GitCommit size={16} />
                변경사항 커밋
              </button>
            </div>
          </div>
        )}

        {/* 동기화 액션 */}
        <div className="sync-actions-card">
          <h3>동기화 작업</h3>
          <div className="sync-actions">
            <div className="sync-action">
              <div className="action-info">
                <Download size={24} />
                <div>
                  <h4>Pull</h4>
                  <p>원격 저장소에서 최신 변경사항을 가져옵니다.</p>
                </div>
              </div>
              <div className="action-buttons">
                <button
                  onClick={() => handlePull(false)}
                  className="btn btn-primary"
                  disabled={syncing}
                >
                  Pull
                </button>
                <button
                  onClick={() => handlePull(true)}
                  className="btn btn-secondary"
                  disabled={syncing}
                >
                  Pull --rebase
                </button>
              </div>
            </div>

            <div className="sync-action">
              <div className="action-info">
                <Upload size={24} />
                <div>
                  <h4>Push</h4>
                  <p>로컬 커밋을 원격 저장소에 푸시합니다.</p>
                </div>
              </div>
              <div className="action-buttons">
                <button
                  onClick={() => handlePush(false)}
                  className="btn btn-primary"
                  disabled={syncing || (status && status.ahead === 0)}
                >
                  Push
                </button>
                <button
                  onClick={() => handlePush(true)}
                  className="btn btn-danger"
                  disabled={syncing}
                  title="주의: 강제 푸시는 원격 변경사항을 덮어씁니다."
                >
                  Push --force
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 출력 로그 */}
        {output && (
          <div className="sync-output-card">
            <h3>실행 결과</h3>
            <pre className="sync-output">{output}</pre>
          </div>
        )}
      </div>

      {/* 커밋 모달 */}
      {showCommitModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCommitModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>변경사항 커밋</h3>
            <p>{status?.changes.length}개 파일이 커밋됩니다.</p>
            <textarea
              placeholder="커밋 메시지를 입력하세요..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowCommitModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={handleCommit} className="btn btn-primary" disabled={syncing}>
                커밋
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
