'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">페이지를 찾을 수 없습니다</h2>
        <p className="not-found-description">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <div className="not-found-actions">
          <Link href="/" className="btn btn-primary">
            <Home size={18} />
            <span>홈으로</span>
          </Link>
          <Link href="/search" className="btn btn-secondary">
            <Search size={18} />
            <span>검색하기</span>
          </Link>
        </div>
        <button onClick={() => window.history.back()} className="back-link">
          <ArrowLeft size={16} />
          <span>이전 페이지로 돌아가기</span>
        </button>
      </div>
    </div>
  );
}
