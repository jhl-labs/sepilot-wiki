'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * 모달/다이얼로그 닫힐 때 이전 포커스를 복원하는 훅
 *
 * @param isOpen - 모달/다이얼로그가 열려있는지 여부
 * @returns 포커스 복원 함수 (선택적으로 호출 가능)
 *
 * @example
 * const { returnFocus } = useFocusReturn(isOpen);
 *
 * const handleClose = () => {
 *   setIsOpen(false);
 *   returnFocus(); // 수동으로 포커스 복원 (필요한 경우)
 * };
 */
export function useFocusReturn(isOpen: boolean) {
  // 이전에 포커스되어 있던 요소 저장
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // 복원이 이미 수행되었는지 추적
  const hasRestoredRef = useRef(false);

  // 열릴 때 현재 포커스된 요소 저장
  useEffect(() => {
    if (isOpen) {
      // 현재 포커스된 요소 저장
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        previousFocusRef.current = activeElement;
      }
      hasRestoredRef.current = false;
    }
  }, [isOpen]);

  // 닫힐 때 이전 포커스로 복원
  useEffect(() => {
    if (!isOpen && previousFocusRef.current && !hasRestoredRef.current) {
      // 짧은 지연 후 포커스 복원 (애니메이션 완료 대기)
      const timeoutId = setTimeout(() => {
        if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
          previousFocusRef.current.focus();
          hasRestoredRef.current = true;
        }
      }, 10);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // 수동 포커스 복원 함수
  const returnFocus = useCallback(() => {
    if (previousFocusRef.current && !hasRestoredRef.current) {
      if (document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
        hasRestoredRef.current = true;
      }
    }
  }, []);

  // 컴포넌트 언마운트 시 포커스 복원
  useEffect(() => {
    return () => {
      if (previousFocusRef.current && !hasRestoredRef.current) {
        if (document.body.contains(previousFocusRef.current)) {
          previousFocusRef.current.focus();
        }
      }
    };
  }, []);

  return { returnFocus };
}

export default useFocusReturn;
