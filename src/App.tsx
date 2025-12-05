import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { ConfigProvider } from './context/ConfigContext';
import { Layout } from './components/layout';
import { HomePage, WikiPage, SearchPage, IssuesPage, NotFoundPage, AIHistoryPage } from './pages';
import { config } from './config';
import './styles/index.css';
import './styles/custom.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// GitHub Pages SPA 리다이렉트 처리 컴포넌트
function SpaRedirectHandler({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    // 세션 스토리지에서 리다이렉트 정보 확인
    const redirectData = sessionStorage.getItem('spa-redirect');
    if (redirectData) {
      sessionStorage.removeItem('spa-redirect');
      try {
        const { path, search, hash } = JSON.parse(redirectData);
        const fullPath = path + search + hash;
        if (fullPath && fullPath !== '/') {
          navigate(fullPath, { replace: true });
        }
      } catch {
        // 파싱 실패 시 무시
      }
    }
  }, [navigate]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfigProvider>
          <SidebarProvider>
            <BrowserRouter basename={config.baseUrl}>
              <SpaRedirectHandler>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="wiki/*" element={<WikiPage />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route path="issues" element={<IssuesPage />} />
                    <Route path="ai-history" element={<AIHistoryPage />} />
                    <Route path="ai-history/:slug" element={<AIHistoryPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </SpaRedirectHandler>
            </BrowserRouter>
          </SidebarProvider>
        </ConfigProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
