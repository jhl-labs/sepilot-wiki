'use client';

import { useSiteConfig } from '../../context/ConfigContext';
import { ExternalLink } from 'lucide-react';

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
      </div>
    </footer>
  );
}
