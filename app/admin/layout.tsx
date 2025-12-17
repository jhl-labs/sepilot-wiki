/**
 * 관리자 페이지 레이아웃
 * 관리자 권한이 필요하며, 서버 모드에서만 접근 가능
 */

import { redirect } from 'next/navigation';
import { auth, isAdmin } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import '@/styles/admin.css';

export const metadata = {
  title: 'Admin - SEPilot Wiki',
  description: '관리자 대시보드',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 서버 모드 확인
  const isServerMode = process.env.BUILD_MODE !== 'static';
  if (!isServerMode) {
    redirect('/');
  }

  // Public 모드에서는 인증 없이 관리자 기능 허용
  const isPublicMode = process.env.AUTH_MODE === 'public';

  let user = null;
  if (!isPublicMode) {
    // 인증 및 권한 확인 (private 모드에서만)
    const session = await auth();
    if (!session) {
      redirect('/auth/signin?callbackUrl=/admin');
    }

    if (!isAdmin(session as { user?: { roles?: string[]; clientRoles?: string[] } } | null)) {
      redirect('/?error=unauthorized');
    }
    user = session.user;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar user={user} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
