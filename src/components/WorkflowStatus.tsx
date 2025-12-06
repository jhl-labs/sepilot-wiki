
import { useActionsStatus } from '../hooks/useWiki';
import { Activity, CheckCircle, XCircle, Clock, RotateCw, GitBranch } from 'lucide-react';
import type { WorkflowRun } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import '../styles/workflow.css';

export function WorkflowStatus() {
    const { data: status, isLoading, refetch } = useActionsStatus();

    if (isLoading) {
        return (
            <div className="workflow-status-card loading">
                <div className="skeleton-header" />
                <div className="skeleton-body" />
            </div>
        );
    }

    if (!status) return null;

    const hasInProgress = status.summary.inProgressCount > 0;
    const hasFailures = status.summary.recentFailuresCount > 0;

    return (
        <div className="workflow-status-container">
            <div className="workflow-status-header">
                <h2 className="section-title">
                    <Activity className="icon" size={20} />
                    시스템 상태
                </h2>
                <div className="status-meta">
                    <span className="last-updated">
                        업데이트: {format(new Date(status.collectedAt), 'a h:mm:ss', { locale: ko })}
                    </span>
                    <button onClick={() => refetch()} className="refresh-btn" title="새로고침">
                        <RotateCw size={14} />
                    </button>
                </div>
            </div>

            <div className="status-summary-grid">
                <div className={`status-stat ${hasInProgress ? 'active' : ''}`}>
                    <span className="stat-label">진행 중</span>
                    <span className="stat-value">
                        {hasInProgress && <span className="pulse-dot" />}
                        {status.summary.inProgressCount}
                    </span>
                </div>
                <div className={`status-stat ${hasFailures ? 'error' : ''}`}>
                    <span className="stat-label">최근 실패</span>
                    <span className="stat-value">{status.summary.recentFailuresCount}</span>
                </div>
                <div className="status-stat">
                    <span className="stat-label">전체 워크플로우</span>
                    <span className="stat-value">{status.summary.totalWorkflows}</span>
                </div>
            </div>

            {status.inProgress && status.inProgress.length > 0 && (
                <div className="workflow-section in-progress">
                    <h3 className="subsection-title">
                        <Clock size={16} /> 진행 중인 작업
                    </h3>
                    <div className="workflow-list">
                        {status.inProgress.map((run: WorkflowRun) => (
                            <a
                                key={run.id}
                                href={run.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="workflow-item is-running"
                            >
                                <div className="workflow-icon">
                                    <RotateCw className="spin" size={16} />
                                </div>
                                <div className="workflow-info">
                                    <span className="workflow-name">{run.name}</span>
                                    <div className="workflow-meta">
                                        <span className="workflow-branch">
                                            <GitBranch size={12} /> {run.branch}
                                        </span>
                                        <span className="workflow-time">
                                            · {format(new Date(run.createdAt), 'MM/dd HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* 최근 실행 목록 (issue-handler 관련) */}
            <div className="workflow-section">
                <h3 className="subsection-title">
                    최근 실행 내역 (Issue Handler)
                </h3>
                <div className="workflow-list">
                    {status.workflows
                        .filter(w => w.name.includes('Issue Handler') || w.path.includes('issue-handler'))
                        .flatMap(w => w.recentRuns)
                        .slice(0, 5)
                        .map(run => (
                            <a
                                key={run.id}
                                href={run.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`workflow-item status-${run.conclusion || run.status}`}
                            >
                                <div className="workflow-icon">
                                    {run.status === 'in_progress' ? (
                                        <RotateCw className="spin" size={16} />
                                    ) : run.conclusion === 'success' ? (
                                        <CheckCircle size={16} className="text-success" />
                                    ) : (
                                        <XCircle size={16} className="text-error" />
                                    )}
                                </div>
                                <div className="workflow-info">
                                    <span className="workflow-name">{run.name}</span>
                                    <div className="workflow-meta">
                                        <span className="workflow-event">
                                            {run.event === 'issues' ? 'Issue' : run.event} 이벤트
                                        </span>
                                        <span className="workflow-time">
                                            · {format(new Date(run.createdAt), 'MM/dd HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            </a>
                        ))}
                </div>
            </div>
        </div>
    );
}
