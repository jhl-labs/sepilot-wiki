# SEPilot Wiki 고도화 구현 계획

## 구현할 기능 (9개)

### Phase 1: 기반 작업

#### 1. 에러 처리 통합
- **목표**: 일관된 에러 핸들링 및 사용자 경험
- **새 파일**:
  - `src/lib/errors.ts` - 에러 유틸리티
  - `src/context/ErrorContext.tsx` - 에러 상태 Context
  - `src/components/error/ErrorBoundary.tsx` - Error Boundary
  - `src/components/error/ErrorToast.tsx` - 토스트 알림
- **수정 파일**: `app/providers.tsx`, `src/services/api.ts`

#### 2. 접근성 강화
- **목표**: 키보드 네비게이션, 포커스 관리
- **새 파일**:
  - `src/hooks/useFocusTrap.ts` - 포커스 트랩 훅
  - `src/hooks/useAnnouncer.ts` - 스크린리더 알림
- **수정 파일**: Sidebar, Header, Button, Input 컴포넌트

#### 3. 키보드 단축키 시스템
- **목표**: Cmd+K 검색, Cmd+/ 사이드바 토글
- **새 파일**:
  - `src/hooks/useKeyboardShortcuts.ts`
  - `src/context/ShortcutsContext.tsx`
  - `src/components/ui/CommandPalette.tsx`
- **수정 파일**: `app/providers.tsx`, Header, Sidebar

---

### Phase 2: 핵심 기능

#### 4. Monaco Editor 도입
- **패키지**: `@monaco-editor/react`
- **새 파일**: `src/components/editor/MonacoEditor.tsx`
- **수정 파일**: `src/components/editor/MarkdownEditor.tsx`

#### 5. 에디터 자동 저장
- **새 파일**:
  - `src/hooks/useAutoSave.ts`
  - `src/hooks/useDraft.ts`
- **수정 파일**: MarkdownEditor.tsx

#### 6. 검색 필터 기능
- **목표**: 태그, 날짜, 저자 필터
- **수정 파일**:
  - `src/services/search.ts`
  - `app/(main)/search/page.tsx`
  - `src/types/index.ts`

---

### Phase 3: 사용성 개선

#### 7. 최근 방문 문서
- **새 파일**:
  - `src/hooks/useRecentPages.ts`
  - `src/context/RecentPagesContext.tsx`
- **수정 파일**: Sidebar, 위키 페이지

#### 8. 북마크 기능
- **새 파일**:
  - `src/hooks/useBookmarks.ts`
  - `src/context/BookmarksContext.tsx`
- **수정 파일**: Sidebar, 위키 페이지

#### 9. Virtual Scrolling
- **패키지**: `@tanstack/react-virtual`
- **새 파일**: `src/components/ui/VirtualList.tsx`
- **수정 파일**: wiki/page.tsx, issues/page.tsx, search/page.tsx

---

## 예상 작업량

| 기능 | 새 파일 | 추가 줄 | 수정 줄 |
|------|--------|--------|--------|
| 에러 처리 | 4 | 300 | 100 |
| 접근성 | 2 | 200 | 100 |
| 키보드 단축키 | 3 | 350 | 40 |
| Monaco Editor | 1 | 300 | 50 |
| 자동 저장 | 2 | 150 | 30 |
| 검색 필터 | 0 | 200 | 50 |
| 최근 방문 | 2 | 120 | 30 |
| 북마크 | 2 | 150 | 40 |
| Virtual Scroll | 1 | 150 | 80 |
| **합계** | **17** | **~1,920** | **~520** |

---

## 설치할 패키지

```bash
bun add @monaco-editor/react @tanstack/react-virtual
```
