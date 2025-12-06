---
title: "SEPilot Desktop 소개"
description: "SEPilot Desktop 애플리케이션의 주요 기능, 모드, 기술 스택 및 빠른 시작 가이드"
category: "Guide"
tags: ["SEPilot Desktop", "Project", "LLM", "Desktop"]
status: "draft"
issueNumber: 0
createdAt: "2025-12-06T01:20:00Z"
updatedAt: "2025-12-06T01:20:00Z"
---

# SEPilot Desktop 소개

SEPilot Desktop은 오픈소스 LLM 기반 데스크톱 애플리케이션으로, **Chat**, **Editor**, **Browser** 세 가지 모드를 제공하여 강력하고 유연한 LLM 워크플로우를 경험할 수 있습니다. LangGraph 워크플로우, RAG, MCP 도구, Monaco Editor + Terminal, Vision 기반 브라우저 자동화 등 다양한 기능을 통합했습니다.

---

## 📦 다운로드 & 설치

- **Windows**: `SEPilot-Setup-0.6.0.exe`
- **macOS**: `SEPilot-0.6.0.dmg`
- **Linux**: `SEPilot-0.6.0.AppImage` (또는 `.deb`)

[다운로드 페이지](https://jhl-labs.github.io/sepilot_desktop/#download) | [GitHub 저장소](https://github.com/jhl-labs/sepilot_desktop)

---

## 🚀 빠른 시작 (5분 안에 시작)

1. **다운로드 및 설치** – 위의 파일을 다운로드하고 실행합니다.
2. **LLM 설정** – 좌측 하단 설정 아이콘 → LLM 제공자와 API 키 입력 (OpenAI, Anthropic, Google, Custom).
3. **모드 선택** – 원하는 모드와 워크플로우 타입을 선택합니다.
4. **대화 시작** – 모든 준비가 끝났습니다. 이제 AI와 대화를 시작하세요!

---

## 🖥️ 3가지 애플리케이션 모드

### 1. Chat 모드
- **LangGraph 워크플로우** (Instant, Sequential, Deep, Coding, RAG, Browser 등 6가지)
- **RAG 문서 검색** (편집, 폴더 관리, Export/Import)
- **MCP 도구 통합** (GitHub, Brave Search, Filesystem 등)
- **이미지 생성·해석** (ComfyUI, Vision API)
- **Persona 시스템** (AI 역할 정의, SQLite 영구 저장)
- **Quick Question** (최대 5개 단축키)
- **GitHub Sync** (Token 기반, AES‑256‑GCM 암호화)

![](assets/videos/chat-mode-demo.mp4)

### 2. Editor 모드
- **Monaco Editor** (VS Code 엔진, 구문 강조, AI 자동완성)
- **파일 탐색기** (Working Directory, 파일 생성/삭제/이름변경)
- **다중 파일 탭** 및 **Markdown 미리보기**
- **통합 터미널** (xterm.js, PowerShell/bash/zsh, 탭 관리)
- **전체 파일 검색** (ripgrep 기반, `Ctrl+Shift+F`)
- **Advanced Editor Agent** (50회 반복, 9개 Built‑in Tools)
- **Notion 스타일 Writing Tools** (10가지)

![](assets/videos/editor-mode-demo.mp4)

### 3. Browser 모드
- **Chromium 기반 브라우저** (BrowserView, Chrome 스타일 탭)
- **자동화 도구** (Navigate, DOM Inspection, Vision Tools 등 18개)
- **Google Search Tools** (검색, 뉴스, Scholar, 이미지, 고급 필터)
- **Vision 기반 UI 제어** (Set‑of‑Mark, 좌표 클릭)
- **Bot 감지 우회** (Stealth Fingerprint, 자연스러운 타이밍)
- **페이지 캡처** (MHTML + 스크린샷, 오프라인 뷰어)
- **북마크 관리** (폴더별 정리)

![](assets/videos/browser-mode-demo.mp4)

---

## 🌟 핵심 기능

- **LangGraph 워크플로우** – 다양한 사고(Thinking) 모드 지원 (Instant, Sequential, Tree‑of‑Thought, Deep 등).
- **Chat, RAG, Agent, Coding Agent 그래프** – 실시간 스트리밍, conversationId 기반 격리.
- **AI Persona 시스템** – 사전 정의 및 사용자 정의 페르소나, 슬래시 커맨드 자동완성 (`/persona`).
- **RAG (검색 증강 생성)** – 텍스트, URL, 파일(PDF, DOCX, TXT, MD) 업로드 및 임베딩 기반 검색.
- **MCP 프로토콜** – 도구와 컨텍스트 통합, Human‑in‑the‑loop 승인.
- **GitHub Sync** – 설정·문서·페르소나·이미지·대화 내역 동기화, AES‑256‑GCM 암호화.
- **이미지 생성·해석** – ComfyUI 통합, Vision API.

![](assets/videos/langgraph-workflow.gif)
![](assets/videos/persona-system.gif)
![](assets/videos/rag-demo.gif)
![](assets/videos/browser-automation.gif)
![](assets/videos/mcp-tools.gif)
![](assets/videos/github-sync.gif)
![](assets/videos/image-generation.gif)

---

## 🛠️ 도구 통합 (MCP)

- **MCP Protocol** – Model Context Protocol을 통한 표준화된 도구·컨텍스트 통합.
- 제공 템플릿: GitHub, Brave Search, Git, Filesystem 등.
- 환경 변수 UI 설정, 실행 전 사용자 승인 (5분 타임아웃).

---

## 🖼️ 이미지 기능

- **ComfyUI** 기반 고품질 이미지 생성.
- **Vision API** 로 이미지 해석·질의응답.

---

## 🏗️ 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Next.js 15.3, React 19, TypeScript 5.7, Tailwind CSS, shadcn/ui |
| **상태 관리** | Zustand |
| **코드 편집** | Monaco Editor (VS Code 엔진) |
| **데스크톱** | Electron 35 (크로스‑플랫폼) |
| **백엔드 런타임** | Node.js 20+ |
| **로컬 DB** | better‑sqlite3 |
| **벡터 DB** | SQLite‑vec |
| **IPC** | Context Bridge (안전한 통신) |
| **LLM & AI** | LangGraph (워크플로우 엔진), OpenAI / Anthropic / Google / Groq 등 다중 LLM, LangChain (RAG, Embeddings) |
| **도구 통합** | MCP Protocol |
| **이미지** | ComfyUI |

---

## 📋 시스템 요구사항

**최소 사양**
- Node.js 20.9.0 이상
- 4 GB RAM
- 500 MB 디스크 공간

**권장 사양**
- Node.js 22.0.0 이상
- 8 GB RAM
- 1 GB 디스크 공간

---

## 📚 참고 자료

- **데모 영상**: `assets/videos/demo-main.mp4`
- **LangGraph 워크플로우 GIF**: `assets/videos/langgraph-workflow.gif`
- **Persona 시스템 GIF**: `assets/videos/persona-system.gif`
- **RAG 데모 GIF**: `assets/videos/rag-demo.gif`
- **브라우저 자동화 GIF**: `assets/videos/browser-automation.gif`
- **MCP 도구 GIF**: `assets/videos/mcp-tools.gif`
- **GitHub Sync GIF**: `assets/videos/github-sync.gif`
- **이미지 생성 GIF**: `assets/videos/image-generation.gif`

---

*이 문서는 초안(draft) 상태이며, 검토 후 `published` 로 전환될 예정입니다.*