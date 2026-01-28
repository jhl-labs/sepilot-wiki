'use client';

/**
 * 자동 저장 훅
 * 변경 사항을 자동으로 localStorage에 드래프트로 저장
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { validateMarkdownContent, validateFrontmatter, mergeValidationResults, type ValidationResult } from '../utils/validation';
import { APP_CONFIG } from '../config';

const DRAFT_KEY_PREFIX = APP_CONFIG.autoSave.draftKeyPrefix;
const AUTO_SAVE_DELAY = APP_CONFIG.autoSave.delay;

export interface Draft {
  content: string;
  savedAt: string;
  originalContent: string;
}

export type { ValidationResult } from '../utils/validation';

interface UseAutoSaveOptions {
  // 문서 식별자
  slug: string;
  // 현재 콘텐츠
  content: string;
  // 원본 콘텐츠 (변경 여부 확인용)
  originalContent: string;
  // 자동 저장 활성화 여부
  enabled?: boolean;
  // 저장 지연 시간 (ms)
  delay?: number;
}

interface UseAutoSaveReturn {
  // 드래프트 존재 여부
  hasDraft: boolean;
  // 드래프트 데이터
  draft: Draft | null;
  // 드래프트 복원
  restoreDraft: () => string | null;
  // 드래프트 삭제
  clearDraft: () => void;
  // 마지막 저장 시간
  lastSavedAt: string | null;
  // 저장 중 여부
  isSaving: boolean;
  // 복원 다이얼로그 표시 여부 (초기 마운트 시)
  showRestoreDialog: boolean;
  // 복원 다이얼로그 닫기
  dismissRestoreDialog: () => void;
  // 콘텐츠 검증 결과
  validation: ValidationResult;
  // 콘텐츠 검증 실행
  validate: () => ValidationResult;
}

function getDraftKey(slug: string): string {
  return `${DRAFT_KEY_PREFIX}${slug}`;
}

function loadDraft(slug: string): Draft | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getDraftKey(slug);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveDraft(slug: string, draft: Draft): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getDraftKey(slug);
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // localStorage 오류 무시
  }
}

function removeDraft(slug: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getDraftKey(slug);
    localStorage.removeItem(key);
  } catch {
    // localStorage 오류 무시
  }
}

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    slug,
    content,
    originalContent,
    enabled = true,
    delay = AUTO_SAVE_DELAY,
  } = options;

  // 초기 드래프트 로드 (lazy initialization)
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft(slug));
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // 복원 다이얼로그 표시 여부 (초기화 시 드래프트 존재 여부로 결정)
  const [showRestoreDialog, setShowRestoreDialog] = useState(() => {
    const initialDraft = loadDraft(slug);
    return initialDraft !== null && initialDraft.content !== originalContent;
  });
  // slug 추적을 위한 상태
  const [currentSlug, setCurrentSlug] = useState(slug);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(content);

  // slug가 변경되면 드래프트 다시 로드
  if (currentSlug !== slug) {
    setCurrentSlug(slug);
    const newDraft = loadDraft(slug);
    setDraft(newDraft);
    setLastSavedAt(null);
    setShowRestoreDialog(newDraft !== null && newDraft.content !== originalContent);
  }

  // 드래프트 존재 여부
  const hasDraft = draft !== null && draft.content !== originalContent;

  // 콘텐츠 검증
  const validate = useCallback((): ValidationResult => {
    const contentValidation = validateMarkdownContent(content);
    const frontmatterValidation = validateFrontmatter(content);
    return mergeValidationResults(contentValidation, frontmatterValidation);
  }, [content]);

  // 검증 결과 (메모이제이션)
  const [validation, setValidation] = useState<ValidationResult>(() => validate());

  // 콘텐츠가 변경되면 검증 업데이트 (디바운스)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setValidation(validate());
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [content, validate]);

  // 복원 다이얼로그 닫기
  const dismissRestoreDialog = useCallback(() => {
    setShowRestoreDialog(false);
  }, []);

  // 드래프트 복원
  const restoreDraft = useCallback(() => {
    if (!draft) return null;
    dismissRestoreDialog();
    return draft.content;
  }, [draft, dismissRestoreDialog]);

  // 드래프트 삭제
  const clearDraft = useCallback(() => {
    removeDraft(slug);
    setDraft(null);
    setLastSavedAt(null);
    dismissRestoreDialog();
  }, [slug, dismissRestoreDialog]);

  // 자동 저장 로직
  useEffect(() => {
    if (!enabled) return;

    // 원본과 같으면 저장하지 않음
    if (content === originalContent) {
      // 드래프트가 있고 원본과 다르면 삭제
      if (draft && draft.content !== originalContent) {
        removeDraft(slug);
        // 상태 업데이트는 타임아웃으로 처리
        const timeoutId = setTimeout(() => {
          setDraft(null);
          setLastSavedAt(null);
        }, 0);
        return () => window.clearTimeout(timeoutId);
      }
      return;
    }

    // 이전 타임아웃 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새 타임아웃 설정
    timeoutRef.current = setTimeout(() => {
      // 이전 저장과 같으면 무시
      if (content === lastContentRef.current && lastSavedAt) {
        return;
      }

      setIsSaving(true);

      const newDraft: Draft = {
        content,
        savedAt: new Date().toISOString(),
        originalContent,
      };

      saveDraft(slug, newDraft);
      setDraft(newDraft);
      setLastSavedAt(newDraft.savedAt);
      lastContentRef.current = content;

      setIsSaving(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, originalContent, slug, enabled, delay, draft, lastSavedAt]);

  return {
    hasDraft,
    draft,
    restoreDraft,
    clearDraft,
    lastSavedAt,
    isSaving,
    showRestoreDialog,
    dismissRestoreDialog,
    validation,
    validate,
  };
}

export default useAutoSave;
