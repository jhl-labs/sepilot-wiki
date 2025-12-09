import { useSearchParams, Link } from 'react-router-dom';
import { useIssues } from '../hooks/useWiki';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { MessageSquare, ExternalLink, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { LABELS, urls } from '../config';
import clsx from 'clsx';
import { WorkflowStatus } from '../components/WorkflowStatus';

export function IssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const labelFilter = searchParams.get('label') || '';
  const stateFilter = searchParams.get('state') || '';

  const { data: issues, isLoading } = useIssues(labelFilter || undefined);

  const filteredIssues = issues?.filter((issue) => {
    if (stateFilter && issue.state !== stateFilter) return false;
    return true;
  });

  const handleFilterChange = (type: 'label' | 'state', value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(type, value);
    } else {
      newParams.delete(type);
    }
    setSearchParams(newParams);
  };

  return (
    <div className="issues-page">
      <header className="issues-header">
        <div className="header-content">
          <h1>
            <MessageSquare size={28} />
            <span>문서 요청</span>
          </h1>
          <p className="header-description">
            GitHub Issue를 통해 새로운 문서를 요청하거나 기존 문서의 수정을
            요청할 수 있습니다.
          </p>
        </div>
        <a
          href={urls.newIssue({ labels: LABELS.REQUEST })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <MessageSquare size={18} />
          <span>새 요청</span>
        </a>
      </header>

      <WorkflowStatus />

      <div className="issues-filters">
        <div className="filter-group">
          <Filter size={16} />
          <span className="filter-label">필터:</span>
          <select
            value={labelFilter}
            onChange={(e) => handleFilterChange('label', e.target.value)}
            className="filter-select"
          >
            <option value="">모든 라벨</option>
            <option value={LABELS.REQUEST}>request (문서 요청)</option>
            <option value={LABELS.WIKI_MAINTENANCE}>wiki-maintenance (자동 정비)</option>
            <option value={LABELS.INVALID}>invalid</option>
            <option value={LABELS.DRAFT}>draft</option>
          </select>
          <select
            value={stateFilter}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="filter-select"
          >
            <option value="">모든 상태</option>
            <option value="open">진행 중</option>
            <option value="closed">완료</option>
          </select>
        </div>
        <span className="filter-count">
          {filteredIssues?.length || 0}개의 요청
        </span>
      </div>

      <div className="issues-list">
        {isLoading ? (
          <>
            <Skeleton height={100} />
            <Skeleton height={100} />
            <Skeleton height={100} />
          </>
        ) : filteredIssues && filteredIssues.length > 0 ? (
          filteredIssues.map((issue) => (
            <a
              key={issue.id}
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="issue-card"
            >
              <div className="issue-header">
                <span className={clsx('issue-state', issue.state)}>
                  {issue.state === 'open' ? '진행 중' : '완료'}
                </span>
                <span className="issue-number">#{issue.number}</span>
                <ExternalLink size={14} className="external-icon" />
              </div>
              <h3 className="issue-title">{issue.title}</h3>
              {issue.body && (
                <p className="issue-body">
                  {issue.body.slice(0, 150)}
                  {issue.body.length > 150 && '...'}
                </p>
              )}
              <div className="issue-meta">
                <div className="issue-author">
                  <img
                    src={issue.user.avatar_url}
                    alt={issue.user.login}
                    className="author-avatar"
                  />
                  <span className="author-name">{issue.user.login}</span>
                </div>
                <span className="issue-date">
                  {format(new Date(issue.created_at), 'yyyy년 M월 d일', {
                    locale: ko,
                  })}
                </span>
                {issue.comments > 0 && (
                  <span className="issue-comments">
                    <MessageSquare size={14} />
                    {issue.comments}
                  </span>
                )}
              </div>
              <div className="issue-footer">
                <div className="issue-labels">
                  {issue.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant={
                        label.name === LABELS.REQUEST
                          ? 'default'
                          : label.name === LABELS.INVALID
                            ? 'invalid'
                            : label.name === LABELS.DRAFT
                              ? 'draft'
                              : label.name === LABELS.WIKI_MAINTENANCE
                                ? 'maintenance'
                                : label.name === LABELS.PUBLISHED
                                  ? 'published'
                                  : 'default'
                      }
                      className="issue-label"
                      style={
                        {
                          '--label-color': `#${label.color}`,
                        } as React.CSSProperties
                      }
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
                {issue.documentSlug && (
                  <Link
                    to={`/wiki/${issue.documentSlug}`}
                    className="issue-document-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText size={14} />
                    <span>문서 보기</span>
                  </Link>
                )}
              </div>
            </a>
          ))
        ) : (
          <div className="empty-state">
            <MessageSquare size={48} />
            <h2>요청이 없습니다</h2>
            <p>
              아직 문서 요청이 없습니다. 새로운 문서가 필요하시면 요청해주세요.
            </p>
            <a
              href={urls.newIssue({ labels: LABELS.REQUEST })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              첫 번째 요청 만들기
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
