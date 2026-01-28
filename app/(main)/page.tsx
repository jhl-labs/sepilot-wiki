'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  FileText,
  MessageSquare,
  Zap,
  ArrowRight,
  Github,
  Bot,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react';
import { useWikiPages, useIssues } from '@/src/hooks/useWiki';
import { LABELS, config, urls } from '@/src/config';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { WikiTree } from '@/src/types';

// 트리 구조에서 모든 페이지 추출 (재귀)
function flattenPages(tree: WikiTree[]): WikiTree[] {
  const result: WikiTree[] = [];
  for (const item of tree) {
    if (item.slug) {
      result.push(item);
    }
    if (item.children && item.children.length > 0) {
      result.push(...flattenPages(item.children));
    }
  }
  return result;
}

export default function HomePage() {
  const { data: pages, isLoading: pagesLoading } = useWikiPages();
  const { data: issues, isLoading: issuesLoading } = useIssues(LABELS.REQUEST);

  // 메모이제이션: 트리에서 모든 페이지 추출
  const allPages = useMemo(() => {
    return pages ? flattenPages(pages) : [];
  }, [pages]);

  // 메모이제이션: 최근 이슈 5개
  const recentIssues = useMemo(() => {
    return issues?.slice(0, 5) || [];
  }, [issues]);

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
            <Link href="/wiki" className="btn btn-primary btn-lg">
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
          <div className="hero-cards-grid">
            <div className="hero-card hero-card-accent">
              <div className="card-stats">
                <span className="stat-number">{allPages.length}</span>
                <span className="stat-label">전체 문서</span>
              </div>
              <div className="card-stats">
                <span className="stat-number">{recentIssues.filter(i => i.state === 'open').length}</span>
                <span className="stat-label">진행 중 요청</span>
              </div>
            </div>
            <Link href="/search" className="hero-card hero-card-link">
              <Search size={20} />
              <span>문서 검색</span>
              <ArrowRight size={16} />
            </Link>
            <Link href="/tags" className="hero-card hero-card-link">
              <Tag size={20} />
              <span>태그 탐색</span>
              <ArrowRight size={16} />
            </Link>
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
            <Link href="/wiki" className="see-all-link">
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
            ) : allPages.length > 0 ? (
              allPages.slice(0, 5).map((page) => (
                <Link
                  key={page.slug}
                  href={`/wiki/${page.slug}`}
                  className="document-item"
                >
                  <FileText size={18} className="document-icon" />
                  <span className="document-title">{page.title}</span>
                  <ArrowRight size={16} className="document-arrow" />
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <FileText size={32} />
                <p>아직 작성된 문서가 없습니다</p>
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
            <Link href="/issues" className="see-all-link">
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
