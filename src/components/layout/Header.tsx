import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Moon,
  Sun,
  Monitor,
  Github,
  BookOpen,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';
import { config, urls } from '../../config';
import { Input } from '../ui/Input';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toggle } = useSidebar();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-btn sidebar-toggle"
          onClick={toggle}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <Link to="/" className="header-logo">
          <BookOpen size={24} className="logo-icon" />
          <span className="logo-text">{config.title}</span>
        </Link>
      </div>

      <div className="header-center">
        <form onSubmit={handleSearch} className="search-form desktop-search">
          <Input
            type="search"
            placeholder="문서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
            className="search-input"
          />
        </form>
      </div>

      <div className="header-right">
        <button
          className="header-btn mobile-search-btn"
          onClick={() => setShowSearch(!showSearch)}
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        <div className="theme-menu-wrapper" ref={themeMenuRef}>
          <button
            className="header-btn theme-btn"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            aria-label="Toggle theme menu"
          >
            <ThemeIcon size={20} />
          </button>
          {showThemeMenu && (
            <div className="theme-menu">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => { setTheme('light'); setShowThemeMenu(false); }}
              >
                <Sun size={16} />
                <span>라이트</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
              >
                <Moon size={16} />
                <span>다크</span>
              </button>
              <button
                className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                onClick={() => { setTheme('system'); setShowThemeMenu(false); }}
              >
                <Monitor size={16} />
                <span>시스템</span>
              </button>
            </div>
          )}
        </div>

        <a
          href={urls.repo()}
          target="_blank"
          rel="noopener noreferrer"
          className="header-btn github-link"
          aria-label="GitHub repository"
        >
          <Github size={20} />
        </a>
      </div>

      {showSearch && (
        <div className="mobile-search-overlay">
          <form onSubmit={handleSearch} className="mobile-search-form">
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={18} />}
              className="search-input"
            />
            <button
              type="button"
              className="close-search-btn"
              onClick={() => setShowSearch(false)}
            >
              <X size={20} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
