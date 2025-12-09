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
import { useState } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
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
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ConfigProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </ConfigProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
