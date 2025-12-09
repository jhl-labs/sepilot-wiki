'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/**
 * 인증 버튼 컴포넌트
 * 로그인/로그아웃 및 사용자 메뉴를 표시
 */
export function AuthButton() {
  const { data: session, status } = useSession();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 로딩 중
  if (status === 'loading') {
    return (
      <div className="auth-button auth-loading" aria-label="인증 상태 확인 중">
        <div className="auth-skeleton" />
      </div>
    );
  }

  // 로그인되지 않은 상태
  if (!session) {
    return (
      <button
        className="header-btn auth-btn login-btn"
        onClick={() => signIn('keycloak')}
        aria-label="로그인"
      >
        <LogIn size={20} aria-hidden="true" />
        <span className="auth-btn-text">로그인</span>
      </button>
    );
  }

  // 로그인된 상태
  const user = session.user;
  const userRoles = (user as { clientRoles?: string[] })?.clientRoles || [];
  const isEditor = userRoles.includes('wiki-editor') || userRoles.includes('wiki-admin');
  const isAdmin = userRoles.includes('wiki-admin');

  return (
    <div className="auth-menu-wrapper" ref={menuRef}>
      <button
        className="header-btn auth-btn user-btn"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="사용자 메뉴"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        {user?.image ? (
          <img
            src={user.image}
            alt={user.name || '사용자'}
            className="user-avatar"
          />
        ) : (
          <User size={20} aria-hidden="true" />
        )}
        <span className="user-name">{user?.name || user?.email}</span>
        <ChevronDown size={16} aria-hidden="true" className={showMenu ? 'rotated' : ''} />
      </button>

      {showMenu && (
        <div className="auth-menu" role="menu" aria-label="사용자 메뉴">
          <div className="auth-menu-header">
            <div className="auth-user-info">
              <span className="auth-user-name">{user?.name}</span>
              <span className="auth-user-email">{user?.email}</span>
            </div>
            {(isEditor || isAdmin) && (
              <div className="auth-user-roles">
                {isAdmin && <span className="role-badge admin">관리자</span>}
                {isEditor && !isAdmin && <span className="role-badge editor">편집자</span>}
              </div>
            )}
          </div>
          <div className="auth-menu-divider" />
          <button
            className="auth-menu-item logout-item"
            onClick={() => signOut()}
            role="menuitem"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );
}
