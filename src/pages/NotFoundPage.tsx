import { Link } from 'react-router-dom';
import { Home, Search, FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <FileQuestion size={80} className="not-found-icon" />
        <h1>404</h1>
        <h2>페이지를 찾을 수 없습니다</h2>
        <p>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            <Home size={18} />
            <span>홈으로</span>
          </Link>
          <Link to="/search" className="btn btn-secondary">
            <Search size={18} />
            <span>검색하기</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
