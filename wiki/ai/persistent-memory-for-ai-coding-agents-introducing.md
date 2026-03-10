---
title: Persistent Memory for AI Coding Agents – Introducing Mind Keg MCP
author: SEPilot AI
status: published
tags: [AI, Coding Agents, Persistent Memory, Mind Keg MCP, TypeScript, SQLite, ONNX]
---

## 개요
- **문서 목적**: Mind Keg MCP(메모리 서버)의 설계·운용 방법을 이해하고, 기존 AI 코딩 에이전트에 지속 메모리를 적용하려는 개발자·팀에게 실무 가이드를 제공한다.  
- **대상 독자**: AI 코딩 도구(Claude Code, Cursor, Windsurf 등) 사용자, LLM‑기반 에이전트 개발자, DevOps·플랫폼 엔지니어.  
- **핵심 가치**  
  - 세션 간 컨텍스트 손실을 방지하고 지식 누적을 가능하게 함.  
  - 로컬 SQLite와 ONNX 임베딩을 활용해 비용·API 키 없이 온‑프레미스 운영.  
  - TypeScript·Node.js 22 기반으로 가볍고 확장 가능.  

> “지금은 Claude Code, Cursor, Windsurf 같은 도구가 매 세션을 빈 화면에서 시작합니다.” — [euno.news](https://euno.news/posts/ko/what-if-your-ai-coding-agent-actually-learned-from-6ff6f2)  

## 현재 AI 코딩 에이전트의 한계
| 문제 | 설명 |
|------|------|
| **세션 간 컨텍스트 소실** | 매 실행 시 에이전트가 이전에 학습한 디버깅 패턴·설계 결정 등을 기억하지 못한다. |
| **반복 작업 비효율** | 동일한 코드 리뷰·디버깅을 매번 처음부터 수행해야 하며, 시간·인적 비용이 증가한다. |
| **오류 발생 가능성** | 이전에 발견한 버그를 재현하지 못해 동일한 실수를 반복한다. |
| **기존 도구 동작 방식** | Claude Code, Cursor, Windsurf 등은 기본적으로 **무상태**(stateless) 세션을 제공한다. (euno.news)  

## Mind Keg MCP 소개
- **오픈소스 메모리 서버**: AI 에이전트가 “원자적 학습”(Atomic Learn) 단위로 지식을 저장하고, 다음 세션에서 의미 검색을 통해 재활용한다.  
- **주요 목표**  
  1. **지식 누적** – 학습 내용이 프로젝트·레포 수준에서 지속적으로 축적.  
  2. **에이전트 성능 향상** – 재사용 가능한 컨텍스트 덕분에 프롬프트 길이·추론 비용 감소.  
- **핵심 아이디어**: 에이전트가 작업 중에 작은 메모리를 기록 → SQLite에 영구 저장 → ONNX 임베딩 기반 로컬 의미 검색으로 빠르게 회수. (euno.news)  

## 아키텍처 및 핵심 컴포넌트
1. **MCP 서버** – Node.js 22 + TypeScript 로 구현.  
2. **영구 저장소** – **SQLite** 파일 하나에 모든 원자적 학습을 저장 (설정 불필요, 완전 오프라인).  
3. **의미 검색 엔진** – **ONNX** 임베딩 모델을 로컬에서 실행해 벡터화·유사도 계산 수행. API 키·클라우드 비용이 전혀 없음. (euno.news)  
4. **인증·권한 관리** – API 키 기반 인증과 레포/워크스페이스 별 접근 제어 제공. (euno.news)  

> “MCP와 호환되는 모든 에이전트와 작동: Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI, GitHub Copilot.” — [euno.news]  

## 설치 및 초기 설정
1. **전역 npm 설치**  
   `npm install -g mindkeg-mcp` — 공식 배포 패키지 (euno.news).  
2. **서버 실행**  
   `mindkeg-mcp start` – 기본 포트 8080 에서 REST/JSON API 제공.  
3. **초기화**  
   `mindkeg-mcp init --config ~/.mcp.json` – 설정 파일 자동 생성.  
4. **설정 파일 (`.mcp.json`) 주요 옵션**  
   - `storagePath`: SQLite 파일 위치 (기본 `~/.mindkeg/mcp.db`).  
   - `embeddingModel`: ONNX 모델 경로 (예: `models/all-MiniLM-L6-v2.onnx`).  
   - `apiKey`: 서버 접근용 비밀 키.  
   - `scopes`: `global`, `workspace`, `repo` 등 스코프 정의.  

## 데이터 모델 및 저장 방식
- **Atomic Learn**: “작업 중에 에이전트가 기록하는 최소 단위” (예: “디버깅 패턴 X”, “API 설계 결정 Y”).  
- **스코프 구분**  
  - **전역(Global)** – 모든 프로젝트에 적용.  
  - **워크스페이스(Workspace)** – 특정 IDE/폴더 수준.  
  - **레포(Repository)** – Git 레포 별 독립 저장.  
- **SQLite 스키마 (개요)**  
  - `learns(id PK, scope TEXT, content TEXT, timestamp DATETIME)`  
  - `embeddings(id PK, vector BLOB)` – ONNX 임베딩 결과 저장.  
  > 구체적인 스키마는 GitHub 레포에 포함된 `schema.sql` 파일을 참고 (추가 조사 필요).  

## 의미 검색 및 재활용 흐름
1. **학습 저장** – 에이전트가 `POST /learn` API 로 원자적 학습 전송.  
2. **임베딩 생성** – 서버가 ONNX 모델로 텍스트를 벡터화하고 `embeddings` 테이블에 저장.  
3. **쿼리** – 에이전트가 `GET /search?q=…` 로 검색 요청.  
4. **벡터 변환** – 입력 쿼리를 동일 모델로 임베딩.  
5. **유사도 계산** – SQLite 내 저장된 벡터와 코사인 유사도(또는 L2 거리) 비교.  
6. **결과 반환** – 가장 유사한 `learn` 레코드 리스트를 JSON 으로 반환.  

> “의미 검색은 ONNX 임베딩을 사용해 로컬에서 실행 – API 키도, 비용도 없습니다.” — [euno.news]  

## 다양한 에이전트와의 연동 방법
| 에이전트 | 연동 포인트 | 예시 API 호출 |
|---------|------------|----------------|
| Claude Code | `.mcp.json` 설정 + `mindkeg-mcp` 플러그인 | `curl -X POST http://localhost:8080/learn -H "x-api-key: …" -d '{"scope":"repo","content":"…"}'` |
| Cursor | 환경 변수 `MCP_ENDPOINT` 지정 | `cursor --mcp-endpoint=http://localhost:8080` |
| Windsurf | `~/.windsurf/mcp_config.json` 사용 | `windsurf generate --mcp` |
| Codex CLI / Gemini CLI | 동일 REST API 호출 | `codex --mcp http://localhost:8080` |
| GitHub Copilot | 현재는 플러그인 형태 미지원 → 커스텀 스크립트로 연동 (추가 조사 필요) | — |

> “MCP와 호환되는 모든 에이전트와 작동: Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI, GitHub Copilot.” — [euno.news]  

## 보안·접근 제어
- **API 키 인증**: `x-api-key` 헤더에 비밀 키 전달. 키는 `mindkeg-mcp init` 시 자동 생성하거나 수동 지정 가능.  
- **레포/프로젝트 별 권한**: `.mcp.json` 의 `accessControl` 섹션에 `repoId → allowedApiKeys` 매핑.  
- **데이터 암호화**: 현재 SQLite 파일 자체 암호화는 제공되지 않으며, 파일 시스템 수준 암호화(예: `fscrypt`) 사용 권장 – **추가 조사 필요**.  
- **로컬 보안 고려사항**: 서버 포트 방화벽 차단, 운영 체제 사용자 권한 최소화.  

## 운영·모니터링
- **로그**: `mindkeg-mcp logs` 명령으로 콘솔 로그 확인 (레벨: info, warn, error).  
- **상태 확인**: `curl http://localhost:8080/health` → `{"status":"ok"}`.  
- **백업·복구**  
  - SQLite 파일 복사 (`cp ~/.mindkeg/mcp.db backup.db`).  
  - 복구 시 `mindkeg-mcp restore --file backup.db`.  
- **성능 튜닝**  
  - **인덱스**: `CREATE INDEX idx_scope ON learns(scope);` (추가 조사 필요).  
  - **임베딩 크기**: ONNX 모델 교체 시 `embeddingModel` 경로 업데이트.  
  - **동시 연결**: Node.js 기본 스레드 풀 크기 조정 (`--max-old-space-size`) 권장.  

## 베스트 프랙티스와 사용 시나리오
- **원자적 학습 기록 설계**  
  - 한 번에 너무 큰 텍스트보다 핵심 문장·키워드 중심 기록.  
  - 스코프를 레포 수준으로 시작하고, 필요 시 워크스페이스/전역으로 확대.  
- **반복 디버깅**  
  - “디버깅 패턴 X” 를 학습으로 저장 → 다음 세션에서 자동 검색 → 시간 절감.  
- **코드 리뷰·설계 의사결정**  
  - 리뷰 코멘트·설계 논의 요약을 `learn` 로 기록 → 팀 전체가 동일 컨텍스트 활용.  
- **팀·프로젝트 규모**  
  - 소규모 프로젝트: 전역 스코프만 사용.  
  - 대규모 멀티‑레포: 레포 스코프와 별도 API 키로 접근 제어.  

## 비교 분석
| 솔루션 | 저장소 | 의미 검색 | 인증·권한 | 온프레미스 여부 |
|--------|--------|-----------|-----------|-----------------|
| **Mind Keg MCP** | SQLite | ONNX 로컬 임베딩 | API 키 기반 | 완전 로컬 |
| **memctl** (GitHub) | DuckDB + LanceDB | (언급 없음) | API 키·프로젝트 정책 | 클라우드 MCP 서버 (cloud) — 온프레미스 옵션은 별도 설정 필요) |
| **agent‑recall** | SQLite (frames.db) | (언급 없음) | 로컬 파일 기반 | 로컬 전용 |

> memctl 소개는 [memctl GitHub](https://github.com/memctl/memctl) 에서 확인 가능.  

## 로드맵 및 향후 발전 방향
- **멀티‑모델 지원**: 현재 ONNX 기반 하나의 임베딩 모델 → 향후 BERT, Sentence‑Transformers 등 교체 가능.  
- **실시간 협업**: 여러 개발자가 동일 레포에 대해 동시에 학습·검색 가능하도록 WebSocket API 추가 예정.  
- **클라우드 싱크**: 로컬 SQLite 백업을 S3/Google Drive 등에 자동 동기화하는 옵션 계획.  
- **플러그인 생태계**: VSCode, JetBrains, Emacs 플러그인 공개 예정.  

## FAQ
**Q1. 세션이 종료돼도 데이터가 사라지나요?**  
A: 아니요. 학습은 SQLite 파일에 영구 저장되며, 서버 재시작 후에도 그대로 유지됩니다. (euno.news)  

**Q2. 다른 언어·플랫폼에서도 사용할 수 있나요?**  
A: 현재는 REST/JSON API만 제공하므로, HTTP 클라이언트를 사용할 수 있는 모든 언어에서 연동 가능하지만, 공식 SDK는 TypeScript/Node.js 전용이다. (추가 조사 필요)  

**Q3. 대용량 프로젝트에서 성능은 어떻게 보장하나요?**  
A: SQLite 인덱스와 ONNX 임베딩의 경량성 덕분에 수십만 레코드까지도 수백 밀리초 내 검색이 가능하다고 보고되었다(구체적 벤치마크는 아직 공개되지 않음 – 추가 조사 필요).  

## 참고 자료 및 커뮤니티
- **GitHub 레포지토리** – `https://github.com/mindkeg/mcp` (설치·문서·이슈 트래커)  
- **공식 문서** – `https://mindkeg.github.io/mcp/docs` (예정)  
- **데모 영상** – “Added Long term Memory with MCP Server to Agentic AI” (YouTube, 2025‑07‑24) – <https://www.youtube.com/watch?v=MGw97ZUyAho>  
- **커뮤니티** – Discord 채널 `#mindkeg-mcp`, Reddit `r/mcp` (사용자 질문·플러그인 공유)  
- **관련 프로젝트**  
  - **memctl** – <https://github.com/memctl/memctl>  
  - **agent‑recall** – <https://github.com/mnardit/agent-recall>  

---  

*이 문서는 공개된 자료를 기반으로 작성되었으며, 최신 기능·버전은 공식 레포지토리와 커뮤니티 채널을 통해 확인하시기 바랍니다.*