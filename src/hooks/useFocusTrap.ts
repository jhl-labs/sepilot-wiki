'use client';

/**
 * 포커스 트랩 훅
 * 모달, 다이얼로그 등에서 포커스를 내부에 가두는 기능
 */

import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ');

interface UseFocusTrapOptions {
  // 활성화 여부
  enabled?: boolean;
  // 트랩 활성화 시 첫 번째 요소에 포커스
  autoFocus?: boolean;
  // 트랩 해제 시 원래 요소로 포커스 복귀
  restoreFocus?: boolean;
  // Escape 키로 닫기 콜백
  onEscape?: () => void;
}

export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions = {}
) {
  const {
    enabled = true,
    autoFocus = true,
    restoreFocus = true,
    onEscape,
  } = options;

  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // 포커스 가능한 요소들 가져오기
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => {
      // 화면에 보이는 요소만
      return el.offsetParent !== null;
    });
  }, []);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return;

      // Escape 키 처리
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Tab 키 처리
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift + Tab: 뒤로 이동
        if (event.shiftKey) {
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: 앞으로 이동
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [enabled, getFocusableElements, onEscape]
  );

  // 포커스가 트랩 밖으로 나가는 것 방지
  const handleFocusIn = useCallback(
    (event: FocusEvent) => {
      if (!enabled || !containerRef.current) return;

      const target = event.target as HTMLElement;
      if (!containerRef.current.contains(target)) {
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    },
    [enabled, getFocusableElements]
  );

  useEffect(() => {
    if (!enabled) return;

    // 이전 포커스 요소 저장
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement;
    }

    // 자동 포커스
    if (autoFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // 약간의 지연 후 포커스 (애니메이션 등 고려)
        requestAnimationFrame(() => {
          focusableElements[0].focus();
        });
      }
    }

    // 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      // 이벤트 리스너 해제
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);

      // 포커스 복귀
      if (restoreFocus && previousActiveElement.current) {
        const element = previousActiveElement.current as HTMLElement;
        if (typeof element.focus === 'function') {
          element.focus();
        }
      }
    };
  }, [enabled, autoFocus, restoreFocus, handleKeyDown, handleFocusIn, getFocusableElements]);

  return containerRef;
}

export default useFocusTrap;
