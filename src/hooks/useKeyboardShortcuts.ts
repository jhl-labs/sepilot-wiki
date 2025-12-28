'use client';

/**
 * 키보드 단축키 훅
 * 전역 및 지역 키보드 단축키 처리
 */

import { useEffect, useCallback, useRef } from 'react';

export interface Shortcut {
  // 키 조합 (예: 'mod+k', 'mod+shift+e', 'escape')
  key: string;
  // 콜백 함수
  handler: (event: KeyboardEvent) => void;
  // 입력 필드에서도 동작할지 여부
  enableInInput?: boolean;
  // 기본 동작 방지 여부
  preventDefault?: boolean;
  // 설명 (도움말용)
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  // 활성화 여부
  enabled?: boolean;
  // 단축키 목록
  shortcuts: Shortcut[];
}

// 입력 가능한 요소인지 확인
function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    (element as HTMLElement).isContentEditable
  );
}

// 키 조합 파싱
function parseKeyCombo(combo: string): {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
} {
  const parts = combo.toLowerCase().split('+');
  return {
    key: parts[parts.length - 1],
    mod: parts.includes('mod') || parts.includes('ctrl') || parts.includes('cmd'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  };
}

// 키 이벤트와 조합 일치 확인
function matchesKeyCombo(
  event: KeyboardEvent,
  combo: ReturnType<typeof parseKeyCombo>
): boolean {
  const eventKey = event.key.toLowerCase();
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  const modPressed = isMac ? event.metaKey : event.ctrlKey;

  return (
    eventKey === combo.key &&
    modPressed === combo.mod &&
    event.shiftKey === combo.shift &&
    event.altKey === combo.alt
  );
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { enabled = true, shortcuts } = options;
  const shortcutsRef = useRef(shortcuts);

  // shortcuts 배열이 변경될 때 ref 업데이트
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcutsRef.current) {
        const combo = parseKeyCombo(shortcut.key);

        if (matchesKeyCombo(event, combo)) {
          // 입력 필드에서 동작하지 않는 단축키인 경우
          if (!shortcut.enableInInput && isInputElement(document.activeElement)) {
            continue;
          }

          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }

          shortcut.handler(event);
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * 단축키 표시 문자열 생성
 * 예: 'mod+k' -> '⌘K' (Mac) 또는 'Ctrl+K' (Windows)
 */
export function formatShortcut(combo: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  return combo
    .split('+')
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'mod' || lower === 'ctrl' || lower === 'cmd') {
        return isMac ? '⌘' : 'Ctrl';
      }
      if (lower === 'shift') return isMac ? '⇧' : 'Shift';
      if (lower === 'alt') return isMac ? '⌥' : 'Alt';
      if (lower === 'escape') return 'Esc';
      if (lower === 'enter') return '↵';
      if (lower === 'backspace') return '⌫';
      if (lower === 'arrowup') return '↑';
      if (lower === 'arrowdown') return '↓';
      if (lower === 'arrowleft') return '←';
      if (lower === 'arrowright') return '→';
      return part.toUpperCase();
    })
    .join(isMac ? '' : '+');
}

export default useKeyboardShortcuts;
