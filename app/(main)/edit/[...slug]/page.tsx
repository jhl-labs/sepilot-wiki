'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import { MarkdownEditor } from '@/src/components/editor';
import { useWikiPage } from '@/src/hooks/useWiki';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { canEdit } from '@/lib/auth';

/**
 * 문서 편집 페이지
 * 인증된 사용자만 접근 가능
 */
export default function EditWikiPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const slugArray = params.slug as string[];
  const slug = slugArray?.join('/') || '';

  const { data: page, isLoading: isPageLoading } = useWikiPage(slug);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 권한 확인 (session 타입 캐스팅)
  const hasEditPermission = canEdit(session as { user?: { roles?: string[]; clientRoles?: string[] } } | null);

  // 비인증 사용자 리다이렉트
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/edit/${slug}`);
    }
  }, [status, slug, router]);

  const handleSave = async (content: string, message: string) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/wiki/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, message }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      // 저장 성공 시 문서 페이지로 이동
      router.push(`/wiki/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/wiki/${slug}`);
  };

  // 로딩 상태
  if (status === 'loading' || isPageLoading) {
    return (
      <div className="edit-page">
        <div className="edit-header">
          <Skeleton width={200} height={32} />
        </div>
        <div className="edit-content">
          <Skeleton height={400} />
        </div>
      </div>
    );
  }

  // 권한 없음
  if (!hasEditPermission) {
    return (
      <div className="edit-page">
        <div className="edit-error">
          <Lock size={48} className="error-icon" />
          <h1>편집 권한이 없습니다</h1>
          <p>이 문서를 편집하려면 편집자 권한이 필요합니다.</p>
          <Link href={`/wiki/${slug}`} className="btn btn-primary">
            <ArrowLeft size={18} />
            <span>문서로 돌아가기</span>
          </Link>
        </div>
      </div>
    );
  }

  // 문서를 찾을 수 없음
  if (!page) {
    return (
      <div className="edit-page">
        <div className="edit-error">
          <AlertTriangle size={48} className="error-icon" />
          <h1>문서를 찾을 수 없습니다</h1>
          <p>요청한 문서가 존재하지 않습니다.</p>
          <Link href="/" className="btn btn-primary">
            <ArrowLeft size={18} />
            <span>홈으로 돌아가기</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-page">
      <div className="edit-header">
        <Link href={`/wiki/${slug}`} className="back-link">
          <ArrowLeft size={18} />
          <span>문서로 돌아가기</span>
        </Link>
        <h1>
          <span className="edit-title">편집:</span> {page.title}
        </h1>
      </div>

      {error && (
        <div className="edit-error-banner" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="edit-content">
        <MarkdownEditor
          initialContent={page.content || ''}
          slug={slug}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
