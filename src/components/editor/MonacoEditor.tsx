'use client';

/**
 * Monaco Editor 래퍼 컴포넌트
 * 마크다운 편집을 위한 VS Code 스타일 에디터
 */

import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '@/src/context/ThemeContext';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  placeholder?: string;
  height?: string;
}

// 에디터 액션 타입 (상위 컴포넌트에서 호출 가능)
export interface EditorActions {
  insertText: (before: string, after?: string, defaultText?: string) => void;
  focus: () => void;
  getEditor: () => editor.IStandaloneCodeEditor | null;
}

export function MonacoEditor({
  value,
  onChange,
  onSave,
  height = '100%',
}: MonacoEditorProps) {
  const { actualTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // 텍스트 삽입 헬퍼 (먼저 선언)
  const insertTextAtSelection = useCallback(
    (before: string, after: string = '', defaultText: string = '') => {
      const editorInstance = editorRef.current;
      if (!editorInstance) return;

      const selection = editorInstance.getSelection();
      if (!selection) return;

      const model = editorInstance.getModel();
      if (!model) return;

      const selectedText = model.getValueInRange(selection) || defaultText;
      const text = before + selectedText + after;

      editorInstance.executeEdits('insert', [
        {
          range: selection,
          text,
          forceMoveMarkers: true,
        },
      ]);

      // 커서 위치 조정
      const newPosition = {
        lineNumber: selection.startLineNumber,
        column: selection.startColumn + before.length + selectedText.length,
      };
      editorInstance.setPosition(newPosition);
      editorInstance.focus();
    },
    []
  );

  // 에디터 마운트 시 설정
  const handleEditorMount: OnMount = useCallback(
    (editorInstance, monaco) => {
      editorRef.current = editorInstance;
      monacoRef.current = monaco;

      // 에디터 설정
      editorInstance.updateOptions({
        wordWrap: 'on',
        lineNumbers: 'on',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'var(--font-mono), monospace',
        lineHeight: 1.6,
        padding: { top: 16, bottom: 16 },
        tabSize: 2,
        insertSpaces: true,
        automaticLayout: true,
        renderLineHighlight: 'line',
        cursorBlinking: 'smooth',
        cursorStyle: 'line',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        guides: {
          indentation: true,
        },
      });

      // Ctrl+S 저장 단축키
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave?.();
      });

      // Ctrl+B 굵게
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        insertTextAtSelection('**', '**', '굵은 텍스트');
      });

      // Ctrl+I 기울임
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
        insertTextAtSelection('*', '*', '기울임 텍스트');
      });

      // Ctrl+K 링크
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
        insertTextAtSelection('[', '](url)', '링크 텍스트');
      });

      // 초기 포커스
      editorInstance.focus();
    },
    [onSave, insertTextAtSelection]
  );

  // 테마 변경 시 에디터 테마 업데이트
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(actualTheme === 'dark' ? 'vs-dark' : 'vs');
    }
  }, [actualTheme]);

  // 값 변경 핸들러
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue ?? '');
    },
    [onChange]
  );

  return (
    <div className="monaco-editor-container" style={{ height }}>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme={actualTheme === 'dark' ? 'vs-dark' : 'vs'}
        loading={
          <div className="monaco-loading">
            <span>에디터 로딩 중...</span>
          </div>
        }
        options={{
          readOnly: false,
        }}
      />
      <style jsx>{`
        .monaco-editor-container {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          overflow: hidden;
        }

        .monaco-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

// 에디터 액션을 외부에서 사용할 수 있도록 ref 기반 API 제공
export function useMonacoEditorActions() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const setEditor = useCallback((editor: editor.IStandaloneCodeEditor | null) => {
    editorRef.current = editor;
  }, []);

  const insertText = useCallback(
    (before: string, after: string = '', defaultText: string = '') => {
      const editor = editorRef.current;
      if (!editor) return;

      const selection = editor.getSelection();
      if (!selection) return;

      const model = editor.getModel();
      if (!model) return;

      const selectedText = model.getValueInRange(selection) || defaultText;
      const text = before + selectedText + after;

      editor.executeEdits('insert', [
        {
          range: selection,
          text,
          forceMoveMarkers: true,
        },
      ]);

      editor.focus();
    },
    []
  );

  const focus = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  return {
    setEditor,
    insertText,
    focus,
    getEditor: () => editorRef.current,
  };
}

export default MonacoEditor;
