/**
 * 관리자 문서 관리 페이지
 */

'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
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
} from 'lucide-react';

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

export default function DocumentsPage() {
  const [tree, setTree] = useState<TreeNode | null>(null);
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
  const [newDocPath, setNewDocPath] = useState('');
  const [movePath, setMovePath] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/documents');
      if (res.ok) {
        const data = await res.json();
        setTree(data.tree);
      }
    } catch {
      setMessage({ type: 'error', text: '문서 목록을 불러올 수 없습니다.' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchDocument(path: string) {
    setLoading(true);
    try {
      const cleanPath = path.replace(/^wiki\//, '');
      const res = await fetch(`/api/admin/documents/${cleanPath}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data);
        setEditContent(data.content);
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
      const cleanPath = document.path.replace(/^wiki\//, '');
      const res = await fetch(`/api/admin/documents/${cleanPath}`, {
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
    if (!newDocPath.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newDocPath }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '문서가 생성되었습니다.' });
        setShowNewModal(false);
        setNewDocPath('');
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
      const cleanPath = selectedPath.replace(/^wiki\//, '');
      const res = await fetch(`/api/admin/documents/${cleanPath}`, {
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

  function renderTree(node: TreeNode, level = 0): React.ReactNode {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;

    // 검색 필터
    if (searchQuery && node.type === 'file') {
      if (!node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }
    }

    return (
      <div key={node.path} className="tree-item">
        <div
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => handleSelect(node)}
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
        <h1>문서 관리</h1>
        <div className="admin-header-actions">
          <button onClick={fetchDocuments} className="btn btn-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
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
            {tree && renderTree(tree)}
          </div>
        </div>

        {/* 편집 패널 */}
        <div className="admin-documents-editor">
          {document ? (
            <>
              <div className="editor-header">
                <h2>{document.name}</h2>
                <div className="editor-actions">
                  <button
                    onClick={() => {
                      setMovePath(document.path);
                      setShowMoveModal(true);
                    }}
                    className="btn btn-secondary"
                  >
                    <Move size={16} />
                    이동
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn-danger"
                  >
                    <Trash2 size={16} />
                    삭제
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
                <span>경로: {document.path}</span>
                <span>SHA: {document.sha?.substring(0, 7)}</span>
              </div>
              <textarea
                className="editor-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="마크다운 내용을 입력하세요..."
              />
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
              <FileText size={48} />
              <p>문서를 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 새 문서 모달 */}
      {showNewModal && (
        <div className="admin-modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>새 문서 생성</h3>
            <input
              type="text"
              placeholder="문서 경로 (예: category/document-name)"
              value={newDocPath}
              onChange={(e) => setNewDocPath(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={createDocument} className="btn btn-primary" disabled={saving}>
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
            <p>현재: {selectedPath}</p>
            <input
              type="text"
              placeholder="새 경로 (예: wiki/new-category/document.md)"
              value={movePath}
              onChange={(e) => setMovePath(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowMoveModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={moveDocument} className="btn btn-primary" disabled={saving}>
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
            <p>정말 이 문서를 삭제하시겠습니까?</p>
            <p className="modal-warning">{selectedPath}</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
                취소
              </button>
              <button onClick={deleteDocument} className="btn btn-danger" disabled={saving}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
