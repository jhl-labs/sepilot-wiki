'use client';

import { signIn, signOut } from 'next-auth/react';
import { useAuthSession } from '@/src/hooks/useAuthSession';
import { LogIn, LogOut, ChevronDown, Settings, FileEdit, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './AuthButton.module.css';

/**
 * 인증 버튼 컴포넌트
 * 로그인/로그아웃 및 사용자 메뉴를 표시
 */
export function AuthButton() {
  const { data: session, status } = useAuthSession();
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
      <div className={styles.skeleton}>
        <div className={styles.skeletonInner} />
      </div>
    );
  }

  // 로그인되지 않은 상태
  if (!session) {
    return (
      <button
        className={styles.loginBtn}
        onClick={() => signIn('keycloak')}
        aria-label="로그인"
      >
        <LogIn size={16} />
        <span>로그인</span>
      </button>
    );
  }

  // 로그인된 상태
  const user = session.user;
  const userRoles = (user as { clientRoles?: string[] })?.clientRoles || [];
  const isEditor = userRoles.includes('wiki-editor') || userRoles.includes('wiki-admin');
  const isAdmin = userRoles.includes('wiki-admin');

  // 사용자 이니셜 생성
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button
        className={styles.userBtn}
        onClick={() => setShowMenu(!showMenu)}
        aria-label="사용자 메뉴"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        <span className={styles.avatar}>
          {user?.image ? (
            <img src={user.image} alt="" />
          ) : (
            getInitials(user?.name)
          )}
        </span>
        <span className={styles.userName}>{user?.name || user?.email}</span>
        <ChevronDown size={14} className={`${styles.chevron} ${showMenu ? styles.chevronOpen : ''}`} />
      </button>

      {showMenu && (
        <div className={styles.menu}>
          <div className={styles.menuHeader}>
            <span className={styles.avatarLarge}>
              {user?.image ? (
                <img src={user.image} alt="" />
              ) : (
                getInitials(user?.name)
              )}
            </span>
            <div className={styles.userInfo}>
              <span className={styles.userNameLarge}>{user?.name}</span>
              <span className={styles.userEmail}>{user?.email}</span>
              {(isEditor || isAdmin) && (
                <div className={styles.roles}>
                  {isAdmin && <span className={styles.roleAdmin}>관리자</span>}
                  {isEditor && !isAdmin && <span className={styles.roleEditor}>편집자</span>}
                </div>
              )}
            </div>
          </div>

          <div className={styles.menuBody}>
            <Link href="/issues" className={styles.menuItem} onClick={() => setShowMenu(false)}>
              <FileEdit size={16} />
              <span>이슈 관리</span>
            </Link>
            {isAdmin && (
              <Link href="/admin" className={styles.menuItem} onClick={() => setShowMenu(false)}>
                <Shield size={16} />
                <span>관리자</span>
              </Link>
            )}
            <Link href="/ai-history" className={styles.menuItem} onClick={() => setShowMenu(false)}>
              <Settings size={16} />
              <span>AI 히스토리</span>
            </Link>
          </div>

          <div className={styles.menuFooter}>
            <button className={styles.logoutBtn} onClick={() => signOut()}>
              <LogOut size={16} />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
