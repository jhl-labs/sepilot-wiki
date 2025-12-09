'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Link,
  Image,
  Quote,
  Table,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react';
import { MarkdownRenderer } from '../wiki/MarkdownRenderer';

interface MarkdownEditorProps {
  initialContent: string;
  slug: string;
  onSave: (content: string, message: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * 마크다운 편집기 컴포넌트
 * 실시간 미리보기와 도구 모음을 제공
 */
export function MarkdownEditor({
  initialContent,
  slug,
  onSave,
  onCancel,
  isSaving = false,
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 텍스트 삽입 헬퍼
  const insertText = useCallback(
    (before: string, after: string = '', defaultText: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end) || defaultText;
      const newText =
        content.substring(0, start) +
        before +
        selectedText +
        after +
        content.substring(end);

      setContent(newText);

      // 커서 위치 조정
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [content]
  );

  // 도구 모음 버튼 핸들러
  const toolbarActions = {
    bold: () => insertText('**', '**', '굵은 텍스트'),
    italic: () => insertText('*', '*', '기울임 텍스트'),
    h1: () => insertText('# ', '', '제목 1'),
    h2: () => insertText('## ', '', '제목 2'),
    h3: () => insertText('### ', '', '제목 3'),
    ul: () => insertText('- ', '', '목록 항목'),
    ol: () => insertText('1. ', '', '목록 항목'),
    code: () => insertText('`', '`', '코드'),
    codeBlock: () => insertText('```\n', '\n```', '코드 블록'),
    link: () => insertText('[', '](url)', '링크 텍스트'),
    image: () => insertText('![', '](url)', '이미지 설명'),
    quote: () => insertText('> ', '', '인용문'),
    table: () =>
      insertText(
        '| 헤더 1 | 헤더 2 |\n| ------ | ------ |\n| 셀 1   | 셀 2   |\n',
        '',
        ''
      ),
  };

  const handleSave = async () => {
    const message = commitMessage.trim() || `docs: ${slug} 문서 수정`;
    await onSave(content, message);
  };

  const hasChanges = content !== initialContent;

  return (
    <div className="markdown-editor">
      {/* 도구 모음 */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.bold}
            title="굵게 (Ctrl+B)"
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.italic}
            title="기울임 (Ctrl+I)"
          >
            <Italic size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.h1}
            title="제목 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.h2}
            title="제목 2"
          >
            <Heading2 size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.h3}
            title="제목 3"
          >
            <Heading3 size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.ul}
            title="순서 없는 목록"
          >
            <List size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.ol}
            title="순서 있는 목록"
          >
            <ListOrdered size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.code}
            title="인라인 코드"
          >
            <Code size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.link}
            title="링크"
          >
            <Link size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.image}
            title="이미지"
          >
            <Image size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.quote}
            title="인용문"
          >
            <Quote size={18} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={toolbarActions.table}
            title="표"
          >
            <Table size={18} />
          </button>
        </div>

        <div className="toolbar-spacer" />

        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? '미리보기 닫기' : '미리보기'}
          >
            {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* 편집기 본문 */}
      <div className={`editor-body ${showPreview ? 'split-view' : ''}`}>
        <div className="editor-pane">
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="마크다운으로 문서를 작성하세요..."
            spellCheck={false}
          />
        </div>

        {showPreview && (
          <div className="preview-pane">
            <div className="preview-header">미리보기</div>
            <div className="preview-content markdown-body">
              <MarkdownRenderer content={content} />
            </div>
          </div>
        )}
      </div>

      {/* 저장 영역 */}
      <div className="editor-footer">
        <div className="commit-message-wrapper">
          <input
            type="text"
            className="commit-message-input"
            placeholder="커밋 메시지 (선택사항)"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </div>
        <div className="editor-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X size={18} />
            <span>취소</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save size={18} />
            <span>{isSaving ? '저장 중...' : '저장'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
