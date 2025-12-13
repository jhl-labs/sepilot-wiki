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

  // 인증 및 권한 확인
  const session = await auth();
  if (!session) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  if (!isAdmin(session as { user?: { roles?: string[]; clientRoles?: string[] } } | null)) {
    redirect('/?error=unauthorized');
  }

  return (
    <div className="admin-layout">
      <AdminSidebar user={session.user} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
