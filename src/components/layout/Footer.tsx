'use client';

import { useSiteConfig } from '../../context/ConfigContext';
import { ExternalLink } from 'lucide-react';

// 빌드 정보
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || '';

// 빌드 시간 포맷팅
function formatBuildTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  } catch {
    return '';
  }
}

export function Footer() {
  const siteConfig = useSiteConfig();
  const footer = siteConfig.footer;

  // Footer가 비활성화되어 있으면 렌더링하지 않음
  if (!footer?.enabled) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const copyright = footer.copyright;

  // Copyright 텍스트 생성
  const getCopyrightText = () => {
    if (!copyright?.enabled) return null;

    const text = copyright.text || siteConfig.title;
    const startYear = copyright.startYear;

    if (startYear && startYear < currentYear) {
      return `© ${startYear}-${currentYear} ${text}`;
    }
    return `© ${currentYear} ${text}`;
  };

  const copyrightText = getCopyrightText();
  const hasLinks = footer.links && footer.links.length > 0;
  const showPoweredBy = footer.showPoweredBy !== false;

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Copyright */}
        {copyrightText && (
          <div className="footer-copyright">
            {copyrightText}
          </div>
        )}

        {/* Links */}
        {hasLinks && (
          <nav className="footer-links">
            {footer.links!.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                {link.label}
                <ExternalLink size={12} />
              </a>
            ))}
          </nav>
        )}

        {/* Powered By */}
        {showPoweredBy && (
          <div className="footer-powered">
            Powered by{' '}
            <a
              href="https://github.com/anthropics/claude-code"
              target="_blank"
              rel="noopener noreferrer"
            >
              SEPilot Wiki
            </a>
          </div>
        )}

        {/* 버전 및 빌드 정보 */}
        <div className="footer-build-info">
          <span className="footer-version">v{APP_VERSION}</span>
          {BUILD_TIME && (
            <span className="footer-build-time">
              빌드: {formatBuildTime(BUILD_TIME)}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
