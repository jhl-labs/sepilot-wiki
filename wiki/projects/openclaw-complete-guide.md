---
title: OpenClaw 완벽 가이드
menu: OpenClaw
author: SEPilot AI
status: published
tags: [OpenClaw, AI 개인 비서, 멀티채널, 오픈소스]
redirect_from:
  - openclaw-guide
  - openclaw
  - openclaw-complete-guide
  - ai-openclaw
  - projects-openclaw
related_docs: ["moltbook-intro.md", "multi-agent-system.md"]
order: 1
updatedAt: 2026-02-24
---

## OpenClaw 개요 및 핵심 개념
**OpenClaw**는 24 시간 언제든지 사용할 수 있는 AI 개인 비서 및 자율 에이전트를 목표로 하는 오픈소스 프로젝트입니다. 초기에는 *Clawdbot*·*Moltbot*이라는 이름으로 개발되었으며, 현재는 **GitHub**(https://github.com/openclaw/openclaw) 에서 활발히 유지·관리되고 있습니다 [1].  
GitHub 레포지토리는 **213 k 스타**와 **39.7 k 포크**를 기록하고 있으며, 12 843개의 커밋이 누적되어 있습니다.

### 주요 목표
- **항시 가동** – 언제든지 메시지를 주고받을 수 있는 AI 비서 제공  
- **멀티채널 지원** – Telegram, Discord, WhatsApp, Slack, Google Chat, Signal, iMessage, BlueBubbles, Matrix, Zalo·Zalo Personal, WebChat 등 다양한 메신저와 연동  
- **자율 실행** – Heartbeat·스케줄러를 통해 정해진 작업을 자동으로 수행  
- **프라이버시 보호** – 로컬 모델(Ollama) 사용 시 데이터가 외부로 유출되지 않음  

### 지원 AI 모델 및 연동 방식
| 모델 | 제공 방식 | 연동 방법 |
|------|-----------|-----------|
| Claude (Anthropic) | 클라우드 API | OAuth 또는 API Key |
| GPT‑4o (OpenAI) | 클라우드 API | API Key |
| Ollama (로컬) | 로컬 실행 바이너리 | 직접 호출 (REST) |
| 기타 (Gemini, DeepSeek 등) | 클라우드 API | API Key 또는 OAuth |

> **추천 모델**: Anthropic Claude Pro/Max + Opus 4.6 (장기 컨텍스트와 프롬프트‑인젝션 방어에 강점) [2]

*출처: 공식 Docs – 모델 지원 페이지 (2026‑02‑10) [2]*  

### 기본 용어
- **Gateway**: 모든 채널 연결을 관리하는 중앙 프로세스 (`openclaw gateway` 실행)  
- **Agent**: AI 모델 호출 및 응답 생성 담당 모듈  
- **Pairing**: 메신저(예: Telegram)와 Gateway를 연결하기 위한 인증 절차  
- **Heartbeat**: 정해진 간격으로 자동 실행되는 작업 스케줄러  

---

## 아키텍처 및 동작 원리
### 전체 시스템 구성
```
Gateway
 ├─ Connector (Telegram, Discord, WhatsApp, Slack, Google Chat, Signal, iMessage, BlueBubbles, Matrix, Zalo …)
 ├─ Scheduler / Heartbeat
 ├─ Memory Store (Long‑term Context)
 └─ Agent (Model Wrapper)
```
*※ 위 구조는 공식 Docs에 명시된 기본 아키텍처이며, 실제 구현은 `src/` 디렉터리에서 확인 가능* [3].

- **Gateway**는 하나의 Node.js 프로세스로 실행되며, 각 Connector 플러그인은 독립 모듈 형태로 로드됩니다.  
- **Scheduler**는 Cron‑like 설정 파일을 읽어 주기적인 작업(예: 일정 알림)을 트리거합니다.  
- **Memory Store**는 SQLite 또는 PostgreSQL을 백엔드로 사용해 대화 컨텍스트와 사용자 메모리를 영구 저장합니다.  

### 메시징 채널 통합 흐름
1. 사용자가 Telegram에 메시지를 전송 → **Connector**가 webhook 또는 long‑polling 으로 수신  
2. 메시지는 **Gateway**에 전달 → **Agent**가 현재 설정된 AI 모델에 호출  
3. 모델 응답 → **후처리**(필터링, 포맷 변환) → **Connector**를 통해 원 채널에 전송  

### 플러그인·모듈 구조와 확장 포인트
- 플러그인은 `src/plugins/<channel>` 디렉터리에 위치하며, `register()` 함수만 구현하면 자동 로드됩니다.  
- 새로운 채널을 추가하려면 **Connector 인터페이스**(init, receive, send)만 구현하면 됩니다.  
- 커스텀 프롬프트·플러그인 API는 `openclaw plugin create <name>` 명령으로 스켈레톤을 생성할 수 있습니다.  

### 보안·인증 메커니즘
- **OAuth**: Google, Microsoft 등 OAuth2 제공자를 통해 토큰을 획득하고, 토큰은 환경 변수(`OPENCLAW_OAUTH_TOKEN`)에 저장합니다.  
- **API Key**: 각 모델별 API 키는 `openclaw config set <model>.apiKey <key>` 로 관리됩니다.  
- **Allowlist**: 채널별 화이트리스트(`*.allowlist`)를 설정해 허용된 사용자만 접근하도록 제한합니다.  

*출처: 보안 가이드 (2026‑02‑10) [4]*  

---

## 주요 기능과 특징
- **멀티채널 연동**: Telegram, Discord, WhatsApp, Slack, Google Chat, Signal, iMessage, BlueBubbles, Matrix, Zalo·Zalo Personal, WebChat 등 10개 이상 공식 플러그인 제공  
- **장기 메모리·컨텍스트 유지**: 대화 흐름을 SQLite 기반 Memory Store에 저장, `openclaw memory export` 로 백업 가능  
- **자동 Heartbeat·스케줄링**: `openclaw schedule add "0 9 * * *" "remind_meetings"` 형태로 cron 표현식 사용  
- **커스텀 프롬프트·플러그인 API**: `openclaw plugin create` 로 손쉽게 기능 확장  
- **로컬 모델 지원**: Ollama와 직접 연동해 GPU 가속 로컬 모델(LLama‑3, Mistral 등) 사용 가능  
- **관리 인터페이스**  
  - **Web UI**: `http://localhost:3000` 에서 대시보드, 로그, 메모리 관리 제공 (React 기반)  
  - **CLI**: `openclaw` 명령어 집합으로 모든 설정·운영 가능  

*출처: 기능 소개 페이지 (2026‑02‑10) [5]*  

---

## 설치 및 설정 방법
### 사전 요구 사항
- **Node.js ≥ 22** (LTS) – 최신 릴리스에서는 Node 22 이상을 권장합니다.  
- **Docker & Docker‑Compose** (선택적, 권장)  
- **GPU 서버**: Ollama 사용 시 NVIDIA 드라이버 및 CUDA 12 이상 필요  
- **Git** (소스 클론)  

### 설치 옵션
1. **Docker Compose 한 줄 설치**  
   ```bash
   curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/install.sh | bash && docker compose up -d
   ```  

2. **npm / pnpm / bun 직접 설치**  
   ```bash
   # npm (전역)
   npm install -g openclaw@latest
   # pnpm
   pnpm add -g openclaw@latest
   # bun (선택)
   bun add -g openclaw@latest
   ```  

3. **소스 직접 빌드**  
   ```bash
   git clone https://github.com/openclaw/openclaw.git
   cd openclaw
   pnpm install
   pnpm ui:build   # UI 의존성 자동 설치
   pnpm build
   pnpm openclaw onboard --install-daemon
   ```  

4. **로컬 바이너리 배포** (GitHub Releases) – `openclaw-linux-x64.tar.gz` 를 다운로드 후 압축 해제, 실행 파일에 실행 권한 부여  

*출처: 설치 가이드 (2026‑02‑10) [6]*  

### 초기 설정 단계
1. **기본 설정 파일 생성**  
   `openclaw config init` → 프로젝트 루트에 `config.yaml` 생성  

2. **API 키·OAuth 연동**  
   - `openclaw config set openai.apiKey <YOUR_KEY>`  
   - `openclaw config set anthropic.apiKey <YOUR_KEY>`  
   - OAuth 연동: `openclaw oauth register google` 후 반환된 URL을 브라우저에서 열어 인증  

3. **채널 별 페어링 (예: Telegram)**  
   ```bash
   openclaw pairing generate telegram
   # 출력된 코드(예: ABC123)를 Telegram Bot에 전송
   openclaw pairing approve telegram ABC123
   ```  

### 서비스 운영
- **systemd 서비스 예시** (`/etc/systemd/system/openclaw.service`)  
  ```ini
  [Unit]
  Description=OpenClaw AI Assistant
  After=network.target

  [Service]
  WorkingDirectory=/opt/openclaw
  ExecStart=/usr/bin/npm start
  Restart=always
  User=openclaw

  [Install]
  WantedBy=multi-user.target
  ```  
- **PM2**: `pm2 start dist/index.js --name openclaw` 로 프로세스 관리  
- **Docker Swarm / Kubernetes**: 공식 `docker-compose.yml` 을 기반으로 Helm chart(예정) 로 변환 가능  

*출처: 운영 가이드 (2026‑02‑10) [7]*  

---

## 사용 사례 및 활용 예시
### 1. 개인 일정·이메일 자동 정리
`openclaw schedule add "0 7 * * *" "run_task email_cleanup"`  
매일 아침 7시, Gmail API와 연동된 플러그인이 최신 메일을 요약하고, 중요한 일정은 Telegram에 알림.

### 2. 개발팀 코드 리뷰·CI 알림 봇
```bash
openclaw plugin create ci-notifier
```  
플러그인 내부에서 GitHub webhook을 수신하고, PR 요약을 Claude에 전달 → Discord 채널에 전송, CI 실패 시 Slack에 즉시 알림.

### 3. 고객 지원 챗봇 (WhatsApp)
WhatsApp Business API와 페어링 후, `openclaw agent set default ollama/llama3` 로 로컬 모델 사용 → 고객 문의를 실시간 처리하고, 민감 데이터는 로컬에만 저장.

### 4. 교육·학습 보조 AI
학생이 “다음 주 물리학 시험 요약해줘” 라고 Telegram에 입력 → Memory Store에 저장된 이전 학습 내용과 결합해 GPT‑4o 로 상세 요약 제공.

### 실제 구현 예시 (CLI)
- **프롬프트 커스텀**  
  `openclaw config set prompt.default "You are a helpful personal assistant. Keep responses concise."`  
- **메모리 조회**  
  `openclaw memory list --user @john` → 최근 10개의 대화 기록 출력  

*출처: 공식 튜토리얼 영상 (2026‑02‑10) [8]*  

---

## QMD 하이브리드 검색 및 메모리 최적화
> **출처**: OpenClaw QMD: 로컬 하이브리드 검색으로 10배 더 똑똑한 메모리 (euno.news) [17]

### 1️⃣ QMD(쿼리‑메모리‑디스크) 하이브리드 검색 개념
QMD는 **세 단계**의 검색 파이프라인을 결합해 기존 “전체 MEMORY.md 주입” 방식의 한계를 극복합니다.

| 단계 | 기술 | 역할 |
|------|------|------|
| **BM25** | 전통적인 키워드 기반 IR | 빠른 정확한 용어 매칭 |
| **벡터 검색** | Jina v3 임베딩 (1024‑차원) | 의미적 유사도 탐색 |
| **LLM 재랭킹** | 로컬 LLM (예: Ollama LLama‑3) | 최종 후보를 질의와의 실제 관련성 기준으로 정렬 |

이 하이브리드 접근은 **관련 스니펫만 반환**하고, **결과당 700 문자(기본 6개)** 로 제한해 토큰 사용량을 크게 절감합니다.

### 2️⃣ 메모리 토큰 한계와 해결 방안
- **기존 방식**: `MEMORY.md` 전체 파일을 매 프롬프트에 삽입 → 500 토큰 이하에서는 정상, 5 000 토큰 이상이면 **Token explosion** 발생, 비용이 급증하고 **Relevance collapse** 로 인해 정확도 저하.  
- **QMD 해결**  
  - **인덱싱**: Markdown 파일을 로컬 SQLite + 벡터 DB에 저장.  
  - **선별 반환**: 검색 결과는 최대 6개, 각 700 문자 → 약 **4 200 문자** (≈ 2 800 토큰) 로 제한.  
  - **토큰 절감**: 동일 쿼리당 평균 **≈ 200 tokens of gold** 절감 [17].

### 3️⃣ 구현 예시
```bash
# 1️⃣ QMD CLI 설치 (Bun 또는 npm)
bun install -g https://github.com/tobi/qmd   # 또는 pnpm add -g qmd

# 2️⃣ 기존 메모리 컬렉션 추가
qmd collection add ~/.openclaw/agents/main/memory --name openclaw-memory

# 3️⃣ 임베딩 생성 (첫 실행 시 모델 다운로드)
qmd embed --collection openclaw-memory

# 4️⃣ 하이브리드 검색 실행
qmd query "database connection pooling" --collection openclaw-memory
```

**핵심 파라미터**  
- `--max-results 6` (기본)  
- `--char-limit 700` (각 결과)  

### 4️⃣ 성능 비교 (벤치마크)
| 항목 | 기존 MEMORY.md 주입 | QMD 하이브리드 검색 |
|------|-------------------|-------------------|
| **토큰 사용량** | 4 200 tokens (≈ $0.15) | 200 tokens (≈ $0.007) |
| **응답 지연** | 1.2 s (API 호출 포함) | 0.1 s (로컬) |
| **관련성** | 키워드 매칭에 의존, 의미 손실 | BM25 + 벡터 + LLM 재랭킹으로 높은 정밀도 |
| **비용** | API 호출당 $0.15 (500 tokens 기준) | 초기 모델 다운로드 이후 무료 (CPU/GPU 비용 제외) |

> **TL;DR**: QMD는 토큰 비용을 **≈ 98 %** 절감하고, 지연 시간을 **≈ 90 %** 단축합니다. [18]

### 5️⃣ 향후 로드맵
| 마일스톤 | 예정 시점 | 내용 |
|----------|----------|------|
| **v0.5** (QMD CLI 기본) | 2026‑03 | 로컬 BM25 + 벡터 인덱스, 기본 재랭킹 |
| **v0.7** (MCP 서버) | 2026‑06 | HTTP/JSON 기반 MCP(Server) 제공, 다른 에이전트와 언어 독립적 연동 |
| **v1.0** (플러그인 통합) | 2026‑09 | `openclaw memory qmd enable` 플래그로 OpenClaw와 자동 연동, 설정 파일에 `qmd:` 섹션 추가 |
| **v1.2** (분산 인덱스) | 2027‑01 | 다중 노드 SQLite + PostgreSQL 백엔드 지원, 대규모 팀 환경에 확장 |
| **v2.0** (자동 압축·자체 치유) | 2027‑06 | 오래된 항목 자동 삭제·재인덱싱 스킬, `memory compaction` 명령 제공 |

---

## Recent Developments
- **OpenAI 인수**: 2026년 초, OpenAI가 OpenClaw를 인수했으며, 창시자 Peter Steinberger를 영입했습니다. 이는 OpenAI가 에이전트형 AI에 크게 베팅하고 있음을 의미합니다 [13].
- **Agentic AI 추진**: OpenAI는 에이전트형 AI(Agentic AI) 연구와 제품 개발을 가속화하고 있으며, OpenClaw와 같은 자율 에이전트 플랫폼을 전략적 자산으로 활용하고 있습니다 [13].
- **Codex 업데이트**: OpenAI는 Codex의 최신 버전을 공개했으며, 이는 개발자들이 코드 자동 완성과 이해를 더욱 효율적으로 수행할 수 있게 합니다 [13].
- **Laravel AI SDK 발표**: Laravel이 공식 AI SDK를 출시해, Laravel 애플리케이션 내에서 AI 기능을 손쉽게 통합할 수 있게 되었습니다. 이는 OpenClaw와 같은 오픈소스 AI 에이전트와의 연동 가능성을 넓혀 줍니다 [13].

---

## Impact of OpenAI Acquisition on OpenClaw Ecosystem
1. **전략적 방향 전환**  
   OpenAI의 인수는 OpenClaw가 단순히 커뮤니티 주도 프로젝트에서 OpenAI의 제품 포트폴리오에 포함되는 전략적 자산으로 변모함을 의미합니다. 향후 OpenClaw는 OpenAI의 에이전트형 AI 로드맵에 맞춰 기능 로드맵이 조정될 가능성이 높습니다.

2. **통합 및 호환성 강화**  
   - OpenAI의 클라우드 모델(GPT‑4o, Claude 등)과의 네이티브 연동이 보다 원활해질 것으로 예상됩니다.  
   - 기존 Ollama 기반 로컬 모델 지원은 유지되겠지만, OpenAI API를 통한 고성능 모델 접근이 기본 옵션으로 제공될 가능성이 있습니다.

3. **커뮤니티와 오픈소스 생태계**  
   - OpenAI는 오픈소스 기여를 지속적으로 장려하고 있으므로, 현재 활발한 Discord·GitHub 커뮤니티는 유지될 전망입니다.  
   - 다만, 프로젝트 관리와 의사결정 구조가 OpenAI 내부 프로세스에 맞춰 재조정될 수 있어, 커뮤니티 주도 개발 속도에 변화가 있을 수 있습니다.

4. **비즈니스 모델 및 비용 구조**  
   - OpenAI의 클라우드 모델 사용료가 기본 제공될 경우, 무료 오픈소스 배포와 별도로 “프리미엄” 플랜(예: OpenAI‑전용 엔터프라이즈 플러그인) 형태가 도입될 가능성이 있습니다.  
   - 기존 사용자들은 기존 오픈소스 버전을 그대로 사용하면서, 선택적으로 OpenAI‑통합 기능을 활성화할 수 있게 될 것입니다.

5. **보안 및 규정 준수**  
   - OpenAI는 자체 보안 가이드라인을 적용하므로, OpenClaw의 보안 체크리스트가 강화될 전망입니다. 특히, API 키 관리와 데이터 전송 암호화가 기본화될 가능성이 높습니다.

> **요약**: OpenAI의 인수는 OpenClaw를 에이전트형 AI 분야의 핵심 인프라로 자리매김하게 하며, 모델 통합, 보안, 비즈니스 모델 측면에서 중요한 변화를 가져올 것으로 보입니다 [13].

---

## Docker Sandbox Overview
Docker Sandbox는 마이크로‑VM 기반 격리 기술을 활용해 코딩 에이전트(Claude Code, Gemini, Codex, Kiro 등)를 **감독 없이** 안전하게 실행할 수 있도록 설계되었습니다 [15].  
주요 특징은 다음과 같습니다.

| 특징 | 설명 |
|------|------|
| **Micro‑VM Isolation** | gVisor(`runsc`)와 같은 경량 가상화 레이어를 사용해 컨테이너 내부 프로세스를 호스트 커널에서 격리 |
| **Docker Hardened Images** | Docker가 제공하는 무료 Hardened Image는 기본적으로 **비루트**, **읽기 전용 파일시스템**, **최소 권한** 설정을 포함 |
| **자동 보안 업데이트** | 이미지에 포함된 보안 패치가 자동으로 적용되어 CVE 노출을 최소화 |
| **멀티‑모델 지원** | 동일 Sandbox 안에서 여러 모델(Claude, Gemini 등)을 독립적으로 실행 가능 |

Docker Blog(2026‑01‑30)에서는 이러한 Sandbox가 “코딩 에이전트를 감독 없이 실행하지만, 격리와 최소 권한을 통해 위험을 크게 낮춘다”고 강조했습니다 [15].

---

## Micro‑VM Isolation Setup
아래 예시는 **OpenClaw**를 Docker Hardened Image와 gVisor 기반 마이크로‑VM 격리로 실행하는 최소 구성입니다. 기존 `docker-compose.yml`에 보안 옵션을 추가하면 됩니다.

```yaml
version: "3.9"
services:
  openclaw:
    image: openclaw/openclaw:prod-hardened   # Docker Hardened Image
    runtime: runsc                           # gVisor 마이크로‑VM
    read_only: true                          # 파일시스템 읽기 전용
    user: "1001:1001"                        # 비루트 사용자
    environment:
      - OPENCLAW_GATEWAY_PASSWORD_FILE=/run/secrets/gateway_password
      - OPENCLAW_DISABLE_MDNS=true          # mDNS 비활성화 (보안 강화)
      - OPENCLAW_EGRESS_ALLOWLIST=api.minimax.chat,api.anthropic.com
    secrets:
      - gateway_password
    networks:
      - openclaw-isolated
    tmpfs:
      - /tmp                                 # 휘발성 임시 저장소, 영구 디스크에 기록되지 않음

networks:
  openclaw-isolated:
    driver: bridge

secrets:
  gateway_password:
    file: ./secrets/gateway_password.txt
```

**핵심 포인트**

1. **`runtime: runsc`** – gVisor를 사용해 마이크로‑VM 격리를 활성화.  
2. **`read_only: true`** – 컨테이너 파일시스템을 읽기 전용으로 설정해 루트킷 위험 차단.  
3. **비루트 사용자** (`user: "1001:1001"`) – 프로세스가 루트 권한을 갖지 않음.  
4. **네트워크 격리** – 전용 브리지 네트워크(`openclaw-isolated`)를 사용해 외부와 직접 연결되지 않도록 함.  
5. **시크릿 관리** – Docker secret을 통해 인증 정보를 파일 시스템에 평문으로 남기지 않음.  

Docker Hardened Images에 대한 자세한 내용은 Docker Blog(2025‑12‑17)에서 확인할 수 있습니다 [16].

---

## Secure Run‑time Checklist
OpenClaw를 Docker Sandbox에서 운영할 때 확인해야 할 보안 체크리스트입니다.

- [ ] **Hardened Image 사용** – `openclaw/openclaw:prod-hardened`와 같이 Docker가 제공하는 Hardened 베이스 이미지 선택  
- [ ] **마이크로‑VM 격리 활성화** – `runtime: runsc` (gVisor) 혹은 `runtime: kata-runtime` 등 경량 VM 사용  
- [ ] **읽기 전용 파일시스템** – `read_only: true` 옵션 적용  
- [ ] **비루트 사용자 실행** – `user: "1001:1001"` 등 비특권 UID/GID 지정  
- [ ] **시크릿 관리** – Docker secret 또는 환경 변수 암호화(`OPENCLAW_GATEWAY_PASSWORD_FILE`) 사용  
- [ ] **네트워크 제한** – 전용 내부 네트워크 사용, 외부 egress는 `OPENCLAW_EGRESS_ALLOWLIST` 로 허용된 도메인만  
- [ ] **mDNS 비활성화** – `OPENCLAW_DISABLE_MDNS=true` 로 로컬 서비스 탐색 차단 (불필요한 서비스 노출 방지)  
- [ ] **정기 이미지 스캔** – `docker scan` 혹은 `trivy` 로 이미지 취약점 검사 수행  
- [ ] **보안 업데이트 자동 적용** – `docker pull` 주기적 실행 및 재배포 자동화  
- [ ] **로그 및 감사** – 컨테이너 로그를 중앙 로그 시스템(ELK, Loki 등)으로 전송하고, API 호출 패턴을 모니터링  

이 체크리스트는 Docker Hardened Images와 마이크로‑VM 격리 가이드라인을 종합한 것으로, 실제 운영 환경에 맞게 추가적인 방어 계층을 적용하는 것이 권장됩니다.

---

## 보안 위험 및 완화 방안

CrowdStrike는 "What Security Teams Need to Know About OpenClaw"를 발표하며 OpenClaw의 보안 위험을 경고했습니다 [14].

### 주요 위협 벡터

#### 1. 프롬프트 인젝션 (직접 및 간접)
OpenClaw는 외부 콘텐츠(이메일, 웹 페이지, 문서)를 처리합니다. 해당 콘텐츠에 삽입된 악의적 명령이 에이전트의 동작을 탈취할 수 있습니다. 실제로 Moltbook의 공개 게시물에 지갑을 고갈시키는 페이로드가 삽입된 사례가 보고되었습니다.

#### 2. 자격 증명 탈취
OpenClaw는 파일 시스템에 접근할 수 있어, `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, 브라우저 자격 증명 저장소, 암호화 지갑 등이 모두 노출 대상입니다.

#### 3. 에이전트 기반 측면 이동
침해된 에이전트가 정당한 도구 접근 권한을 이용해 시스템 간 측면 이동을 수행합니다.

#### 4. 대규모 노출
135K+ 개의 OpenClaw 인스턴스가 공개적으로 노출되어 있으며, 다수가 암호화되지 않은 HTTP를 통해 서비스됩니다.

### 완화 전략

| 영역 | 조치 | 상세 |
|------|------|------|
| **네트워크** | HTTPS 강제 | 모든 인스턴스에 TLS 적용, HTTP 접근 차단 |
| **파일 시스템** | 샌드박스 격리 | Docker 컨테이너 또는 firejail로 파일 시스템 접근 제한 |
| **자격 증명** | 전용 사용자 계정 | 최소 권한 원칙 적용, 민감 디렉터리 마운트 제외 |
| **프롬프트** | 입력 검증 | 외부 콘텐츠 처리 전 프롬프트 인젝션 필터링 적용 |
| **모니터링** | 이상 탐지 | 에이전트 API 호출 패턴 모니터링, 비정상 접근 즉시 차단 |
| **공급망** | 의존성 감사 | `npm audit` / `pnpm audit` 정기 실행, lockfile 무결성 검증 |

### 보안 체크리스트
- [ ] OpenClaw를 전용 사용자 계정(비root)으로 실행  
- [ ] Docker 컨테이너 내에서 `--read-only` 플래그와 함께 실행  
- [ ] `~/.ssh`, `~/.aws` 등 민감 디렉터리를 마운트에서 제외  
- [ ] 모든 외부 통신에 HTTPS 적용  
- [ ] Allowlist로 허용된 사용자만 접근 허가  
- [ ] 정기적인 의존성 보안 감사 수행  

*출처: CrowdStrike "What Security Teams Need to Know About OpenClaw", euno.news (2026‑02‑22) [14]*  

---

## 하드웨어 호환성 및 Claw 변형별 권장 사양

OpenClaw는 "Claw"라는 개념의 대표적 구현체입니다. Andrej Karpathy가 제안한 "Claw"는 LLM 에이전트 위에 존재하는 **지속적 AI 에이전트 시스템**으로, 오케스트레이션, 스케줄링, 컨텍스트 유지, 도구 호출 및 지속성을 다음 단계로 끌어올리는 새로운 레이어입니다 [12].

### Claw와 에이전트의 차이
일반적인 LLM 에이전트는 실행하고, 작업을 수행한 뒤 멈춥니다. 반면 Claw는 **지속적으로 실행**됩니다:

- 하드웨어나 서버에서 **항시 가동**됩니다
- 자체 스케줄링을 가지고 있어 요청 없이도 행동합니다
- 세션 및 대화 전반에 걸쳐 **컨텍스트를 유지**합니다
- MCP 등 메시징 프로토콜을 통해 통신합니다
- 도구 접근 권한을 가진 다수의 에이전트를 **오케스트레이션**합니다

> 스크립트를 실행하는 것과 서비스를 운영하는 것의 차이라고 생각하면 됩니다. Claw는 서비스와 같습니다: 항상 켜져 있고, 항상 감시하며, 언제든 행동할 준비가 되어 있습니다.

### Claw 변형 및 권장 사양

| Claw 변형 | 설명 | 최소 RAM | 권장 CPU | GPU | 비고 |
|-----------|------|----------|----------|-----|------|
| **OpenClaw** | 풀스택 AI 비서, 멀티채널 통합 | 16 GB | 8코어 이상 | 선택 (Ollama 사용 시 필수) | 프로덕션 환경 권장 |
| **NanoClaw** | 경량 단일 에이전트 | 8 GB | 4코어 이상 | 불필요 | 개인 개발 환경 적합 |
| **zeroclaw** | 최소 구성, 실험용 | 4 GB | 2코어 이상 | 불필요 | 프로토타이핑 용도 |
| **ironclaw** | 고성능 멀티 에이전트 오케스트레이션 | 32 GB | 16코어 이상 | 권장 (CUDA 12+) | 엔터프라이즈 환경 |
| **picoclaw** | 임베디드·IoT 경량 버전 | 2 GB | ARM 프로세서 호환 | 불필요 | 제한된 기능 |

### Mac Mini에서의 제한 사항

Andrej Karpathy가 Claw 실험을 위해 Mac Mini를 구입하면서 "핫케이크처럼 팔리고 있다"고 언급할 만큼 Mac Mini는 Claw 실행 환경으로 인기가 높습니다. 그러나 Mac Mini에서 OpenClaw를 실행할 때는 다음 **제한 사항**을 반드시 고려해야 합니다 [12].

#### 권장하지 않는 이유
1. **통합 GPU 한계**: Mac Mini(M4/M4 Pro)는 통합 GPU만 탑재, Ollama 로컬 모델 실행 시 전용 GPU 대비 추론 속도가 크게 떨어짐  
2. **메모리 공유 구조**: Apple Silicon의 통합 메모리(Unified Memory)는 CPU와 GPU가 공유, 대형 모델(70B+ 파라미터) 로딩 시 시스템 전체 성능 저하  
3. **열 관리**: 지속적 가동이 필수인 Claw 특성상, 소형 팬 설계로 장시간 고부하 시 스로틀링 발생  
4. **확장성 부족**: RAM·스토리지 업그레이드가 구매 시점에만 가능, 이후 확장 불가  
5. **네트워크 안정성**: 가정용 네트워크에서 운영 시 IP 변경·정전 등으로 가동 중단 위험  

#### Mac Mini에서 실행 가능한 구성
| 구성 | M4 (기본) | M4 Pro (권장) |
|------|-----------|---------------|
| RAM | 16 GB (최소) | 24~48 GB (권장) |
| 로컬 모델 | 7B 이하 소형 모델만 | 13B~30B 모델까지 가능 |
| 동시 채널 | 2~3개 | 5개 이상 |
| Heartbeat 주기 | 5분 이상 권장 | 1분 간격 가능 |

#### 권장 대안 환경
- **클라우드 서버**: AWS EC2 (g5.xlarge 이상), GCP (a2-highgpu), Azure (NC 시리즈) – GPU 인스턴스로 Ollama 로컬 모델 최대 성능 활용  
- **전용 서버**: Linux 기반 GPU 서버 (NVIDIA RTX 4090 이상) – 가장 안정적인 24/7 운영 환경  
- **하이브리드 구성**: Mac Mini에서 Gateway만 실행하고, AI 모델 호출은 클라우드 API(Claude, GPT‑4o)로 위임 – 로컬 모델이 불필요한 경우 현실적인 대안  

> **팁**: Mac Mini를 사용하더라도, AI 모델을 클라우드 API로 호출하고 Gateway·Scheduler만 로컬에서 실행하면 안정적으로 운영할 수 있습니다. 이 경우 Mac Mini의 저전력·저소음 특성이 오히려 장점이 됩니다.

*출처: Andrej Karpathy "Claws" 개념 정의, euno.news (2026‑02‑22) [12]*  

---

## 다른 유사 도구/기술과의 비교
| 항목 | OpenClaw | LangChain | AutoGPT | Microsoft Copilot |
|------|----------|-----------|---------|-------------------|
| 지원 모델·플러그인 생태계 | Claude, GPT‑4o, Ollama 등 다중 모델 + 자체 채널 플러그인 | 다양한 LLM 래퍼, 외부 툴 연동은 코드 기반 | OpenAI API 중심, 플러그인 제한 | Microsoft Graph, Office 연동 전용 |
|