'use client';

/**
 * 클라이언트 사이드 프로바이더 래퍼
 * Context 및 상태 관리 프로바이더들을 감싸는 컴포넌트
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { SidebarProvider } from '@/src/context/SidebarContext';
import { ConfigProvider } from '@/src/context/ConfigContext';
import { ErrorProvider } from '@/src/context/ErrorContext';
import { ShortcutsProvider } from '@/src/context/ShortcutsContext';
import { RecentPagesProvider } from '@/src/context/RecentPagesContext';
import { BookmarksProvider } from '@/src/context/BookmarksContext';
import { ToastContainer } from '@/src/components/error/ErrorToast';
import { CommandPalette } from '@/src/components/ui/CommandPalette';
import { useState } from 'react';

// public 모드에서는 인증 불필요 (정적 빌드 시 API 라우트 미지원)
const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_MODE === 'private';

interface ProvidersProps {
  children: React.ReactNode;
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  if (!isAuthEnabled) return <>{children}</>;
  return <SessionProvider>{children}</SessionProvider>;
}

export function Providers({ children }: ProvidersProps) {
  // QueryClient를 상태로 관리하여 서버/클라이언트 간 공유 방지
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5분
          },
        },
      })
  );

  return (
    <AuthWrapper>
      <QueryClientProvider client={queryClient}>
        <ErrorProvider>
          <ThemeProvider>
            <ConfigProvider>
              <SidebarProvider>
                <ShortcutsProvider>
                  <RecentPagesProvider>
                    <BookmarksProvider>
                      {children}
                      <CommandPalette />
                      <ToastContainer />
                    </BookmarksProvider>
                  </RecentPagesProvider>
                </ShortcutsProvider>
              </SidebarProvider>
            </ConfigProvider>
          </ThemeProvider>
        </ErrorProvider>
      </QueryClientProvider>
    </AuthWrapper>
  );
}
