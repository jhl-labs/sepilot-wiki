---
title: "SEPilot Desktop 소개"
description: "오픈소스 LLM 데스크톱 애플리케이션 SEPilot Desktop의 주요 기능과 사용 방법을 안내합니다."
category: "Guide"
tags: ["SEPilot", "Desktop", "LLM", "Project", "ai", "desktop-app", "application", "ai-assistant"]
status: "draft"
issueNumber: 0
createdAt: "2025-12-06T05:45:00Z"
updatedAt: "2025-12-06T05:45:00Z"
redirect_from:
  - projects-sepilot-desktop
  - projects-sepilot-desktop
  - projects-sepilot-desktop-introduction
  - projects-desktop-introduction
  - projects-desktop-intro
  - Projects-sepilot-desktop-intro
related_docs: ["mcp-model-context-protocol.md", "claude-code.md", "multi-agent-system.md", "openclaw.md", "ci-continuous-ai.md"]
---

# SEPilot Desktop 소개

SEPilot Desktop은 오픈소스 LLM 기반 데스크톱 애플리케이션으로, **Chat**, **Editor**, **Browser** 세 가지 모드를 제공하여 강력하고 유연한 AI 워크플로우를 지원합니다. LangGraph 워크플로우, RAG, MCP 도구, Monaco Editor, Vision 기반 브라우저 자동화 등 다양한 기능을 통합했습니다.

---

## 📦 다운로드 & 소스
- **다운로드**: [SEPilot Desktop 다운로드](https://jhl-labs.github.io/sepilot_desktop/#download)
- **GitHub**: [GitHub 저장소](https://github.com/jhl-labs/sepilot_desktop)
- **데모 영상**: assets/videos/demo-main.mp4

---

## 🧭 3가지 애플리케이션 모드

### 1. Chat 모드
AI와 대화하고 질문할 수 있습니다.
- LangGraph 워크플로우 (Instant, Sequential, Deep, Coding, RAG, Browser 등 6가지)
- RAG 문서 검색 & 편집, 폴더 관리, Export/Import
- MCP 도구 통합 (GitHub, Brave Search, Filesystem 등)
- 이미지 생성 & 해석 (ComfyUI, Vision API)
- Persona 시스템 (AI 역할 정의, SQLite 영구 저장)
- Quick Question (최대 5개 단축키)
- GitHub Sync (AES‑256‑GCM 암호화)

> **데모**: assets/videos/chat-mode-demo.mp4

### 2. Editor 모드
코드 작성 및 파일 관리에 최적화된 환경입니다.
- Monaco Editor (VS Code 엔진, 구문 강조, AI 자동완성)
- 파일 탐색기 (Working Directory, 파일 생성/삭제/이름변경)
- 다중 파일 탭, Markdown 미리보기
- 통합 터미널 (xterm.js, PowerShell/bash/zsh, 탭 관리)
- 전체 파일 검색 (ripgrep 기반, Ctrl+Shift+F)
- Advanced Editor Agent (50회 반복, 9개 Built‑in Tools)
- 10가지 Notion 스타일 Writing Tools

> **데모**: assets/videos/editor-mode-demo.mp4

### 3. Browser 모드
AI와 함께 웹을 탐색하고 자동화합니다.
- Chromium 기반 브라우저 (BrowserView, Chrome 스타일 탭)
- 18개 자동화 도구 (Navigate, DOM Inspection, Vision Tools 등)
- Google Search Tools (검색, 뉴스, Scholar, 이미지, 고급 필터)
- Vision 기반 UI 제어 (Set‑of‑Mark, 좌표 클릭)
- Bot 감지 우회 (Stealth Fingerprint, 자연스러운 타이밍)
- 페이지 캡처 (MHTML + 스크린샷, 오프라인 뷰어)
- 북마크 관리 (폴더별 정리)

> **데모**: assets/videos/browser-mode-demo.mp4

---

## 🌟 주요 기능

### LangGraph 워크플로우
다양한 사고(Thinking) 모드 지원: Instant, Sequential, Tree‑of‑Thought, Deep 등. 실시간 스트리밍으로 사고 과정 시각화 및 conversationId 기반 격리.

### AI Persona 시스템 (v0.6.0)
- 기본 페르소나: 일반 어시스턴트, 번역가, 영어 선생님, 시니어 개발자
- 사용자 정의 페르소나 추가/수정/삭제
- 슬래시 커맨드 자동완성 (/persona)
- SQLite 기반 영구 저장

### RAG (검색 증강 생성)
- 텍스트, URL, 파일(PDF, DOCX, TXT, MD) 업로드 지원
- SQLite‑vec, OpenSearch, Elasticsearch, pgvector 지원
- 문서 편집 AI (정제, 확장, 축약, 검증, 커스텀 프롬프트)
- 폴더 구조 관리 (드래그 앤 드롭, Tree/List/Grid 뷰)
- Export/Import (JSON 형식, 백업/복원)

> **데모**: assets/videos/rag-demo.gif

### 브라우저 자동화 (v0.6.0)
- Electron BrowserView 기반 Chromium 통합
- Vision 기반 UI 제어 및 Google Search Tools
- DOM Inspection, Vision Tools, Bot 감지 우회 등 27개 도구

> **데모**: assets/videos/browser-automation.gif

### MCP 프로토콜
- Model Context Protocol을 통한 도구 및 컨텍스트 표준화
- GitHub, Brave Search, Git, Filesystem 등 템플릿 제공
- 환경 변수 UI 설정, 실행 전 사용자 승인 (5분 타임아웃)

> **데모**: assets/videos/mcp-tools.gif

### GitHub Sync (v0.6.0)
- Personal Access Token 기반 안전한 데이터 동기화
- AES‑256‑GCM 암호화로 민감 정보 보호
- 설정, 문서, 페르소나, 이미지, 대화 내역 동기화

> **데모**: assets/videos/github-sync.gif

### 이미지 기능
- ComfyUI 통합 이미지 생성
- Vision API 기반 이미지 해석 및 질의응답

> **데모**: assets/videos/image-generation.gif

---

## 🛠️ 기술 스택
- **프론트엔드**: Next.js 15.3, React 19, TypeScript 5.7, Tailwind CSS, shadcn/ui, Zustand
- **에디터**: Monaco Editor (VS Code 엔진)
- **데스크톱**: Electron 35 (크로스‑플랫폼)
- **백엔드 런타임**: Node.js 20+
- **데이터베이스**: better‑sqlite3, SQLite‑vec (벡터 검색)
- **IPC**: Context Bridge (안전한 통신)
- **LLM & AI**: LangGraph, LangChain, OpenAI, Anthropic, Google, Groq, MCP Protocol, ComfyUI

---

## 🚀 빠른 시작 (5분 안에 시작)
1. **다운로드 및 설치**
   - Windows: `SEPilot-Setup-0.6.0.exe`
   - macOS: `SEPilot-0.6.0.dmg`
   - Linux: `SEPilot-0.6.0.AppImage`
2. **LLM 설정**
   - 좌측 하단 설정 아이콘 → LLM 제공자 및 API 키 입력
   - 지원: OpenAI, Anthropic, Google, Custom (OpenAI‑compatible)
3. **모드 및 그래프 선택**
   - Chat, Editor, Browser 중 선택
   - 필요 시 LangGraph 워크플로우 타입 선택 (Instant, RAG, Agent 등)
4. **대화 시작**
   - 준비가 완료되면 AI와 대화를 시작하세요!

---

## 📋 시스템 요구사항
- **최소**: Node.js 20.9+, 4 GB RAM, 500 MB 디스크
- **권장**: Node.js 22+, 8 GB RAM, 1 GB 디스크

---

*이 문서는 초안(draft) 상태이며, 검토 후 `published` 로 전환될 예정입니다.*