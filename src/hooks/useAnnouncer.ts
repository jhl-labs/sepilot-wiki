'use client';

/**
 * 스크린리더 알림 훅
 * ARIA live region을 통한 동적 콘텐츠 변경 알림
 */

import { useCallback, useEffect } from 'react';

type AnnouncerPoliteness = 'polite' | 'assertive';

interface AnnouncerOptions {
  // 기본 politeness 레벨
  defaultPoliteness?: AnnouncerPoliteness;
}

// 전역 announcer 요소 ID
const ANNOUNCER_ID = 'screen-reader-announcer';

// announcer 요소 생성 또는 반환
function getOrCreateAnnouncer(): HTMLElement {
  let announcer = document.getElementById(ANNOUNCER_ID);

  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = ANNOUNCER_ID;
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.setAttribute('role', 'status');

    // 시각적으로 숨기지만 스크린리더는 읽을 수 있도록
    Object.assign(announcer.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });

    document.body.appendChild(announcer);
  }

  return announcer;
}

export function useAnnouncer(options: AnnouncerOptions = {}) {
  const { defaultPoliteness = 'polite' } = options;

  // 초기 마운트 시 announcer 요소 생성
  useEffect(() => {
    getOrCreateAnnouncer();
  }, []);

  /**
   * 메시지 알림
   * @param message 알림할 메시지
   * @param politeness politeness 레벨 ('polite' 또는 'assertive')
   */
  const announce = useCallback(
    (message: string, politeness: AnnouncerPoliteness = defaultPoliteness) => {
      // DOM 직접 접근 (ref 우회)
      const announcer = getOrCreateAnnouncer();

      // politeness 레벨 설정
      announcer.setAttribute('aria-live', politeness);

      // 메시지 변경 (스크린리더가 감지하도록)
      // 동일한 메시지를 다시 알리기 위해 먼저 비우고 설정
      announcer.textContent = '';

      // 약간의 지연 후 메시지 설정 (브라우저가 변경을 감지하도록)
      requestAnimationFrame(() => {
        const el = document.getElementById(ANNOUNCER_ID);
        if (el) el.textContent = message;
      });
    },
    [defaultPoliteness]
  );

  /**
   * 중요한 알림 (assertive)
   */
  const announceAssertive = useCallback(
    (message: string) => announce(message, 'assertive'),
    [announce]
  );

  /**
   * 일반 알림 (polite)
   */
  const announcePolite = useCallback(
    (message: string) => announce(message, 'polite'),
    [announce]
  );

  /**
   * 알림 정리
   */
  const clear = useCallback(() => {
    const announcer = document.getElementById(ANNOUNCER_ID);
    if (announcer) {
      announcer.textContent = '';
    }
  }, []);

  return {
    announce,
    announceAssertive,
    announcePolite,
    clear,
  };
}

export default useAnnouncer;
