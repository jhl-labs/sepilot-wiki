/**
 * 관리자 사이드바 컴포넌트
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  LogOut,
  Home,
  User,
  Zap,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

interface AdminSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

const menuItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/documents', label: '문서 관리', icon: FileText },
  { href: '/admin/automation', label: '자동화', icon: Zap },
  { href: '/admin/sync', label: 'Git 동기화', icon: GitBranch },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <Link href="/" className="admin-logo">
          <Home size={20} />
          <span>SEPilot Wiki</span>
        </Link>
        <span className="admin-badge">Admin</span>
      </div>

      <nav className="admin-nav">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-item ${isActive(item.href) ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        {user && (
          <div className="admin-user">
            <div className="admin-user-avatar">
              {user.image ? (
                <img src={user.image} alt={user.name || ''} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{user.name || '관리자'}</span>
              <span className="admin-user-email">{user.email}</span>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="admin-logout-btn"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
