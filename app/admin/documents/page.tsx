/**
 * 관리자 문서 관리 페이지
 * 엔터프라이즈급 문서 CRUD 기능
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Plus,
  Trash2,
  Move,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  Copy,
} from 'lucide-react';

// 문서 저장 루트 경로
const DOCS_ROOT = 'data';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sha?: string;
  children?: TreeNode[];
}

interface DocumentContent {
  path: string;
  name: string;
  content: string;
  sha: string;
  history?: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: '빈 문서',
    description: '기본 마크다운 문서',
    content: '# {title}\n\n내용을 작성하세요.\n',
  },
  {
    id: 'guide',
    name: '가이드 문서',
    description: '단계별 안내 문서',
    content: `# {title}

## 개요

이 문서에서 다룰 내용을 간략히 설명합니다.

## 시작하기 전에

- 필요한 사전 지식
- 준비물

## 단계별 안내

### 1단계: 제목

설명 내용

### 2단계: 제목

설명 내용

## 마무리

참고 사항 및 다음 단계

## 참고 자료

- [링크 제목](URL)
`,
  },
  {
    id: 'reference',
    name: '레퍼런스 문서',
    description: 'API 또는 설정 레퍼런스',
    content: `# {title}

## 개요

간단한 설명

## 속성/파라미터

| 이름 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| name | string | 설명 | - |

## 사용 예시

\`\`\`typescript
// 코드 예시
\`\`\`

## 주의사항

- 주의할 점

## 관련 문서

- [[관련 문서 링크]]
`,
  },
  {
    id: 'troubleshooting',
    name: '문제 해결',
    description: '트러블슈팅 문서',
    content: `# {title}

## 증상

문제가 발생했을 때 나타나는 증상을 설명합니다.

## 원인

문제의 원인을 설명합니다.

## 해결 방법

### 방법 1

\`\`\`bash
# 해결 명령어
\`\`\`

### 방법 2

단계별 해결 방법

## 예방 방법

향후 같은 문제가 발생하지 않도록 하는 방법
`,
  },
];

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['wiki']));
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [document, setDocument] = useState<DocumentContent | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 새 문서 폼 상태
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFolder, setNewDocFolder] = useState('');
  const [newDocTemplate, setNewDocTemplate] = useState('blank');
  const [movePath, setMovePath] = useState('');

  // 컨텍스트 메뉴 상태
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode;
  } | null>(null);

  // 새 폴더 모달 상태
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParent, setNewFolderParent] = useState('');

  // 폴더 삭제 모달 상태
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [deleteFolderPath, setDeleteFolderPath] = useState('');

  // URL 파라미터로 모달 열기
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowNewModal(true);
    }
  }, [searchParams]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/documents');
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree);

        // 폴더 목록 추출
        const folderList = data.files
          ?.filter((f: { type: string }) => f.type === 'directory')
          .map((f: { path: string }) => f.path) || [];
        setFolders([DOCS_ROOT, ...folderList]);
      }
    } catch {
      setMessage({ type: 'error', text: '문서 목록을 불러올 수 없습니다.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function fetchDocument(path: string) {
    setLoading(true);
    try {
      // path는 이미 data/... 형식이므로 그대로 사용
      const res = await fetch(`/api/admin/documents/${path}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data);
        setEditContent(data.content);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || '문서를 불러올 수 없습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '문서를 불러올 수 없습니다.' });
    } finally {
      setLoading(false);
    }
  }

  async function saveDocument() {
    if (!document) return;

    setSaving(true);
    try {
      // path는 이미 data/... 형식
      const res = await fetch(`/api/admin/documents/${document.path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          sha: document.sha,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDocument((prev) => prev ? { ...prev, sha: data.sha } : null);
        setMessage({ type: 'success', text: '문서가 저장되었습니다.' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '저장 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '문서를 저장할 수 없습니다.' });
    } finally {
      setSaving(false);
    }
  }

  async function createDocument() {
    if (!newDocTitle.trim()) {
      setMessage({ type: 'error', text: '문서 제목을 입력하세요.' });
      return;
    }

    setSaving(true);
    try {
      // 파일명 생성 (한글 포함 가능, 공백은 -로 변환)
      const fileName = newDocTitle.trim().toLowerCase().replace(/\s+/g, '-');
      // 폴더 경로 정규화 (data/ 접두사 제거 후 다시 조합)
      let folderPath = newDocFolder.trim() || DOCS_ROOT;
      // data/ 또는 data 접두사 제거
      folderPath = folderPath.replace(/^data\/?/, '');
      // 최종 경로: 폴더가 비어있으면 루트, 아니면 폴더/파일명
      const fullPath = folderPath ? `${folderPath}/${fileName}` : fileName;

      // 템플릿 내용 생성
      const template = TEMPLATES.find(t => t.id === newDocTemplate) || TEMPLATES[0];
      const content = template.content.replace(/\{title\}/g, newDocTitle);

      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: fullPath,
          title: newDocTitle,
          content,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '문서가 생성되었습니다.' });
        setShowNewModal(false);
        setNewDocTitle('');
        setNewDocFolder('');
        setNewDocTemplate('blank');
        fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '생성 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '문서를 생성할 수 없습니다.' });
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument() {
    if (!selectedPath) return;

    setSaving(true);
    try {
      // path는 이미 data/... 형식
      const res = await fetch(`/api/admin/documents/${selectedPath}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '문서가 삭제되었습니다.' });
        setShowDeleteModal(false);
        setSelectedPath(null);
        setDocument(null);
        fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '삭제 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '문서를 삭제할 수 없습니다.' });
    } finally {
      setSaving(false);
    }
  }

  async function moveDocument() {
    if (!selectedPath || !movePath.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/tree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: selectedPath,
          targetPath: movePath,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '문서가 이동되었습니다.' });
        setShowMoveModal(false);
        setMovePath('');
        setSelectedPath(null);
        setDocument(null);
        fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '이동 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '문서를 이동할 수 없습니다.' });
    } finally {
      setSaving(false);
    }
  }

  // 새 폴더 생성
  async function createFolder() {
    if (!newFolderName.trim()) {
      setMessage({ type: 'error', text: '폴더 이름을 입력하세요.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newFolderParent,
          name: newFolderName,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '폴더가 생성되었습니다.' });
        setShowNewFolderModal(false);
        setNewFolderName('');
        setNewFolderParent('');
        // 부모 폴더 확장
        if (newFolderParent) {
          setExpandedFolders((prev) => new Set([...prev, newFolderParent]));
        }
        fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '폴더 생성 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '폴더를 생성할 수 없습니다.' });
    } finally {
      setSaving(false);
    }
  }

  // 폴더 삭제
  async function deleteFolder() {
    if (!deleteFolderPath) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: deleteFolderPath }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '폴더가 삭제되었습니다.' });
        setShowDeleteFolderModal(false);
        setDeleteFolderPath('');
        fetchDocuments();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || '폴더 삭제 실패' });
      }
    } catch {
      setMessage({ type: 'error', text: '폴더를 삭제할 수 없습니다.' });
    } finally {
      setSaving(false);
    }
  }

  // 컨텍스트 메뉴 열기
  function handleContextMenu(e: React.MouseEvent, node: TreeNode) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  }

  // 컨텍스트 메뉴 닫기
  function closeContextMenu() {
    setContextMenu(null);
  }

  // 컨텍스트 메뉴 외부 클릭 처리
  useEffect(() => {
    if (!contextMenu) return;

    function handleClickOutside() {
      closeContextMenu();
    }

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // 컨텍스트 메뉴에서 새 문서 생성
  function handleNewDocFromContext() {
    if (contextMenu?.node.type === 'directory') {
      // 폴더 경로에서 data/ 접두사 제거
      const folderPath = contextMenu.node.path.replace(/^data\/?/, '');
      setNewDocFolder(folderPath);
      setShowNewModal(true);
    }
    closeContextMenu();
  }

  // 컨텍스트 메뉴에서 새 폴더 생성
  function handleNewFolderFromContext() {
    if (contextMenu?.node.type === 'directory') {
      setNewFolderParent(contextMenu.node.path);
      setShowNewFolderModal(true);
    }
    closeContextMenu();
  }

  // 컨텍스트 메뉴에서 삭제
  function handleDeleteFromContext() {
    if (!contextMenu) return;

    if (contextMenu.node.type === 'directory') {
      setDeleteFolderPath(contextMenu.node.path);
      setShowDeleteFolderModal(true);
    } else {
      setSelectedPath(contextMenu.node.path);
      setShowDeleteModal(true);
    }
    closeContextMenu();
  }

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function handleSelect(node: TreeNode) {
    if (node.type === 'directory') {
      toggleFolder(node.path);
    } else {
      setSelectedPath(node.path);
      fetchDocument(node.path);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: '클립보드에 복사되었습니다.' });
  }

  function renderTree(node: TreeNode, level = 0): React.ReactNode {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const isContextTarget = contextMenu?.node.path === node.path;

    // 검색 필터
    if (searchQuery && node.type === 'file') {
      if (!node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }
    }

    return (
      <div key={node.path} className="tree-item">
        <div
          className={`tree-node ${isSelected ? 'selected' : ''} ${isContextTarget ? 'context-active' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleSelect(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
            </>
          ) : (
            <>
              <span style={{ width: 14 }} />
              <FileText size={16} />
            </>
          )}
          <span className="tree-node-name">{node.name}</span>
        </div>
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map((child) => renderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="admin-documents">
      <div className="admin-header">
        <div>
          <h1>문서 관리</h1>
          <p className="admin-header-subtitle">위키 문서 생성, 편집, 삭제</p>
        </div>
        <div className="admin-header-actions">
          <button onClick={fetchDocuments} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => {
              setNewFolderParent(DOCS_ROOT);
              setShowNewFolderModal(true);
            }}
            className="btn btn-secondary"
          >
            <FolderPlus size={16} />
            새 폴더
          </button>
          <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
            <Plus size={16} />
            새 문서
          </button>
        </div>
      </div>

      {message && (
        <div className={`admin-alert admin-alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="admin-documents-container">
        {/* 트리 패널 */}
        <div className="admin-documents-tree">
          <div className="tree-header">
            <h3>문서 목록</h3>
            <span className="status-badge status-info">{tree?.children?.length || 0}</span>
          </div>
          <div className="tree-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="문서 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="tree-content">
            {tree ? renderTree(tree) : (
              <div className="tree-empty">
                <FileText size={32} />
                <p>문서가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 편집 패널 */}
        <div className="admin-documents-editor">
          {document ? (
            <>
              <div className="editor-header">
                <h2>
                  <FileText size={20} />
                  {document.name}
                </h2>
                <div className="editor-actions">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`btn btn-secondary btn-sm ${showPreview ? 'active' : ''}`}
                    title="미리보기"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => copyToClipboard(editContent)}
                    className="btn btn-secondary btn-sm"
                    title="복사"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setMovePath(document.path);
                      setShowMoveModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    <Move size={16} />
                    이동
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={saveDocument}
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <Save size={16} />
                    저장
                  </button>
                </div>
              </div>
              <div className="editor-info">
                <div className="editor-info-item">
                  <span className="label">경로:</span>
                  <span className="value">{document.path}</span>
                </div>
                <div className="editor-info-item">
                  <span className="label">SHA:</span>
                  <span className="value">{document.sha?.substring(0, 7)}</span>
                </div>
              </div>
              <div className="editor-content">
                <textarea
                  className="editor-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="마크다운 내용을 입력하세요..."
                />
                {showPreview && (
                  <div className="editor-preview">
                    <div
                      className="markdown-body"
                      dangerouslySetInnerHTML={{
                        __html: editContent
                          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/`(.*?)`/g, '<code>$1</code>')
                          .replace(/\n/g, '<br>')
                      }}
                    />
                  </div>
                )}
              </div>
              {document.history && document.history.length > 0 && (
                <div className="editor-history">
                  <h4>최근 변경 이력</h4>
                  <ul>
                    {document.history.slice(0, 5).map((h) => (
                      <li key={h.sha}>
                        <span className="history-sha">{h.sha.substring(0, 7)}</span>
                        <span className="history-message">{h.message}</span>
                        <span className="history-author">{h.author}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="editor-empty">
              <FileText size={64} />
              <p>문서를 선택하거나 새 문서를 생성하세요</p>
              <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                <Plus size={16} />
                새 문서 작성
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 새 문서 모달 */}
      {showNewModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>새 문서 생성</h3>

            <div className="form-group">
              <label>문서 제목</label>
              <input
                type="text"
                placeholder="문서 제목을 입력하세요"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                autoFocus
              />
              <p className="hint">파일명은 자동으로 생성됩니다</p>
            </div>

            <div className="form-group">
              <label>저장 위치</label>
              <div className="folder-input-wrapper">
                <Folder size={16} className="folder-input-icon" />
                <input
                  type="text"
                  placeholder="폴더 경로 (예: team/guides)"
                  value={newDocFolder}
                  onChange={(e) => setNewDocFolder(e.target.value)}
                  list="folder-suggestions"
                />
                <datalist id="folder-suggestions">
                  {folders.map((folder) => (
                    <option key={folder} value={folder.replace(`${DOCS_ROOT}/`, '')} />
                  ))}
                </datalist>
              </div>
              <p className="hint">
                <FolderPlus size={12} />
                새 폴더 경로를 입력하면 자동으로 생성됩니다 (비우면 루트에 생성)
              </p>
              {folders.length > 1 && (
                <div className="folder-shortcuts">
                  <span>기존 폴더:</span>
                  {folders.slice(1).map((folder) => (
                    <button
                      key={folder}
                      type="button"
                      className="folder-shortcut"
                      onClick={() => setNewDocFolder(folder.replace(`${DOCS_ROOT}/`, ''))}
                    >
                      {folder.replace(`${DOCS_ROOT}/`, '')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>템플릿</label>
              <div className="template-selector">
                {TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`template-option ${newDocTemplate === template.id ? 'selected' : ''}`}
                    onClick={() => setNewDocTemplate(template.id)}
                  >
                    <h4>{template.name}</h4>
                    <p>{template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowNewModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={createDocument} className="btn btn-primary" disabled={saving || !newDocTitle.trim()}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Plus size={16} />}
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이동 모달 */}
      {showMoveModal && (
        <div className="admin-modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>문서 이동</h3>
            <p>현재 위치: <code>{selectedPath}</code></p>
            <div className="form-group">
              <label>새 경로</label>
              <input
                type="text"
                placeholder="data/new-folder/document.md"
                value={movePath}
                onChange={(e) => setMovePath(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowMoveModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={moveDocument} className="btn btn-primary" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Move size={16} />}
                이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>문서 삭제</h3>
            <p>정말 이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <p className="modal-warning">{selectedPath}</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={deleteDocument} className="btn btn-danger" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Trash2 size={16} />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 폴더 모달 */}
      {showNewFolderModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="admin-modal new-folder-modal" onClick={(e) => e.stopPropagation()}>
            <h3>새 폴더 생성</h3>

            <div className="current-path">
              <Folder size={16} />
              <span>{newFolderParent || DOCS_ROOT}</span>
            </div>

            <div className="form-group">
              <label>폴더 이름</label>
              <input
                type="text"
                placeholder="새 폴더 이름"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    createFolder();
                  }
                }}
              />
              <p className="hint">영문, 숫자, 한글, 하이픈(-), 언더스코어(_) 사용 가능</p>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowNewFolderModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={createFolder} className="btn btn-primary" disabled={saving || !newFolderName.trim()}>
                {saving ? <RefreshCw size={16} className="spin" /> : <FolderPlus size={16} />}
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 삭제 확인 모달 */}
      {showDeleteFolderModal && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteFolderModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>폴더 삭제</h3>
            <p>정말 이 폴더를 삭제하시겠습니까?</p>
            <p className="modal-warning">{deleteFolderPath}</p>
            <p className="hint" style={{ marginTop: '8px' }}>
              <AlertCircle size={14} />
              빈 폴더만 삭제할 수 있습니다. 내부에 파일이 있으면 먼저 삭제해주세요.
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteFolderModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={deleteFolder} className="btn btn-danger" disabled={saving}>
                {saving ? <RefreshCw size={16} className="spin" /> : <Trash2 size={16} />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'directory' ? (
            <>
              <div className="context-menu-label">폴더</div>
              <button className="context-menu-item" onClick={handleNewDocFromContext}>
                <FilePlus size={16} />
                새 문서
              </button>
              <button className="context-menu-item" onClick={handleNewFolderFromContext}>
                <FolderPlus size={16} />
                새 폴더
              </button>
              <div className="context-menu-divider" />
              <button className="context-menu-item danger" onClick={handleDeleteFromContext}>
                <Trash2 size={16} />
                폴더 삭제
              </button>
            </>
          ) : (
            <>
              <div className="context-menu-label">문서</div>
              <button
                className="context-menu-item"
                onClick={() => {
                  handleSelect(contextMenu.node);
                  closeContextMenu();
                }}
              >
                <FileText size={16} />
                열기
              </button>
              <div className="context-menu-divider" />
              <button className="context-menu-item danger" onClick={handleDeleteFromContext}>
                <Trash2 size={16} />
                문서 삭제
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
