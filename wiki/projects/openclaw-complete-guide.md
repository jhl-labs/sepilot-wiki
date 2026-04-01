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
updatedAt: 2026-03-19
quality_score: 77
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

## Common Pitfalls & Solutions
OpenClaw를 실제 운영 환경에 도입하면서 많은 사용자들이 반복적으로 겪는 실수가 있습니다. 아래는 **euno.news**와 **Towards Data Science** 기사에서 제시한 3가지 주요 함정과 구체적인 해결 방안입니다.

### 실수 1 – Docker 없이 직접 호스트에서 실행
| 문제 | 왜 발생 | 해결책 |
|------|----------|--------|
| 보안·이식성 저하 | 컨테이너 격리가 없으면 파일·네트워크 접근이 무제한 | **Docker** 혹은 **Docker‑Compose** 로 실행 → 이미지에 정의된 최소 권한·리소스만 사용 |
| 다중 인스턴스 충돌 | 동일 포트·파일 경로가 겹쳐 서비스가 비정상 종료 | 각 인스턴스를 별도 컨테이너(또는 Docker‑Compose 서비스)로 격리 |
| 업데이트·롤백 복잡 | 호스트에 직접 패키지를 설치하면 의존성 충돌 위험 | `docker pull openclaw/openclaw:latest` 로 최신 이미지 교체, `docker compose down && up -d` 로 롤백 |

**실행 예시**  
```bash
docker compose -f docker-compose.yml up -d
# 혹은 단일 명령
docker run -d --name openclaw \
  -p 3000:3000 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  openclaw/openclaw:prod-hardened
```

### 실수 2 – 에이전트에 충분한 교육(프롬프트) 제공 안 함
| 문제 | 왜 발생 | 해결책 |
|------|----------|--------|
| 모호한 목표 | 에이전트가 “무엇을 해야 하는가”를 알지 못해 비효율적인 응답 | **프롬프트 템플릿**을 명시적으로 정의 (`openclaw config set prompt.default …`) |
| 금지 행동 미명시 | 프롬프트 인젝션이나 위험 명령이 필터링되지 않음 | **안전 가드레일**: `openclaw config set safety.enabled true` 와 함께 “절대 실행 금지” 리스트 추가 |
| 컨텍스트 부족 | 외부 API 사용법을 모르면 오류 발생 | **교육 문서**(예: AWS, Slack, DB)를 별도 `skill.md` 로 제공하고 `openclaw skill load` 로 로드 |

**예시 프롬프트**  
```yaml
prompt:
  default: |
    You are a coding assistant for a development team.
    - Follow the team's coding style guide.
    - Never execute shell commands unless explicitly authorized.
    - If you lack required credentials, respond with a clear error message.
```

### 실수 3 – 권한(액세스) 부족
| 문제 | 왜 발생 | 해결책 |
|------|----------|--------|
| IAM 정책 미설정 | 에이전트가 필요한 AWS 서비스에 접근 불가 | **IAM 역할**에 필요한 액션만 포함하고 `openclaw config set aws.roleArn …` 로 지정 |
| API 키 노출 | 로그·환경 변수에 평문 키가 남아 탈취 위험 | **시크릿 매니저**(HashiCorp Vault, AWS Secrets Manager) 사용 → `export OPENCLAW_API_KEY=$(vault read -field=key secret/openclaw)` |
| 리소스 과다 사용 | CPU·RAM 제한 없으면 다른 서비스에 영향 줌 | `openclaw.yaml` 에 `resources:` 블록 추가 (예시 아래) |

**리소스 제한 예시 (`openclaw.yaml`)**
```yaml
resources:
  max_cpu: 2        # 사용 가능한 CPU 코어 수
  max_memory: 4GB   # 메모리 상한
```

### 요약
1. **Docker 기반 격리** → 보안·이식성 확보  
2. **구체적 프롬프트·가드레일** → 프롬프트 인젝션 방어 및 작업 명확화  
3. **최소 권한 원칙** + **시크릿 관리** → 인증 정보 보호 및 안정적인 실행  

---

## PR 베스트 프랙티스 – 검색 파이프라인과 스킬 마켓플레이스
> **출처**: *euno.news* – “What makes a good open‑source PR? Lessons from GETT” (2026‑03‑15) [9]

OpenClaw 커뮤니티는 **ClawHub**라는 스킬 마켓플레이스를 운영하고 있습니다. 최근 PR 중 하나가 검색 파이프라인의 구조적 결함을 발견하고, 이를 개선한 사례가 주목받았습니다. 아래에서는 해당 PR을 통해 얻은 교훈을 정리하고, 앞으로 PR을 작성·리뷰할 때 고려해야 할 체크리스트를 제공합니다.

### 1️⃣ PR 작성 시 고려사항
| 체크포인트 | 설명 | 적용 예시 |
|------------|------|-----------|
| **문제 정의가 명확한가?** | 버그·기능 개선의 증상과 재현 방법을 구체적으로 기술 | “슬러그 검색 시 정확히 일치하는 스킬이 결과에 나타나지 않음 (재현: `clawhub search my‑awesome‑skill` )” |
| **근본 원인 분석** | 증상이 아닌 원인을 파악하고, 왜 기존 로직이 실패했는지 서술 | “벡터‑리콜 단계에서 임베딩 점수가 낮은 스킬이 완전히 제외돼 슬러그 매치 부스트가 적용되지 않음” |
| **제안된 해결책** | 코드 변경 내용과 기대 효과를 명확히 제시 | “벡터 검색 후 O(1) 슬러그 조회 단계 추가 → 누락 시 강제 삽입” |
| **에지 케이스 고려** | 기존 로직이 의도한 동작을 방해할 수 있는 시나리오 검증 | “사용자가 다운로드 수 기반 정렬을 선택했을 때, 새 로직이 정렬 의도를 무시하지 않는지 테스트 추가” |
| **회귀 테스트** | 변경 사항이 기존 기능을 깨뜨리지 않도록 자동 테스트 포함 | “슬러그 매치·다운로드 수 정렬 모두 통과하는 통합 테스트 추가” |
| **데모·시각 자료** | 리뷰어가 빠르게 검증할 수 있도록 영상·스크린샷 제공 | “전후 검색 결과 화면 녹화 (30초) 첨부” |

### 2️⃣ 검색 파이프라인 이해
ClawHub 검색 흐름은 크게 **세 단계**로 구성됩니다.

1. **벡터‑리콜** – 임베딩 기반 유사도 검색 (BM25 전 단계)  
2. **어휘‑부스트** – 키워드 매치, 다운로드 수, 평점 등 메타데이터 가중치 적용  
3. **최종 정렬** – 사용자 지정 정렬 옵션(예: 다운로드 수, 최신 업데이트) 적용  

> 기존 구현에서는 **벡터‑리콜** 단계에서 임베딩 점수가 낮은 스킬이 완전히 제외되었습니다. 따라서 정확한 슬러그 매치가 있더라도 후보 풀에 들어가지 않아 어휘‑부스트가 적용되지 않았습니다.

### 3️⃣ 벡터‑리콜 vs 어휘‑부스트
| 특성 | 벡터‑리콜 | 어휘‑부스트 |
|------|-----------|-------------|
| **주요 기준** | 의미적 유사도 (임베딩) | 정확한 텍스트 매치, 메타데이터 |
| **장점** | 의미가 다른 표현도 포착 | 정확한 키워드·슬러그 매치 보장 |
| **단점** | 임베딩 품질에 민감 → 낮은 점수 스킬 배제 | 키워드 오타·동의어 인식 부족 |
| **권장 사용** | 대규모·다양한 스킬 검색 | 정확한 슬러그·버전 검색, 정렬 옵션 적용 시 |

**PR에서 적용한 해결책**: 벡터‑리콜 뒤에 **슬러그 O(1) 조회** 단계를 삽입해, 슬러그가 존재하면 즉시 후보에 추가하고 어휘‑부스트를 적용하도록 했습니다. 이렇게 하면 의미 기반 검색과 정확한 매치가 모두 보장됩니다.

### 4️⃣ 실제 사례와 해결 방안
#### 문제 상황
- 스킬 `my-awesome-skill` (다운로드 12회, 임베딩 점수 0.12) 은 정확히 일치하는 슬러그가 있음에도 검색 결과에 전혀 나타나지 않음.

#### 원인 분석
- 벡터‑리콜 단계에서 점수 임계값(0.15) 이하인 아이템은 **제외**.  
- 슬러그 매치 부스트는 후보에 포함된 경우에만 적용되므로, 슬러그 자체가 차단돼 부스트도 적용되지 않음.

#### 적용된 패치
```typescript
// 기존 벡터 검색 로직
const candidates = vectorSearch(query);

// 새 슬러그 리콜 단계
const slugMatch = slugIndex.getExact(query);
if (slugMatch && !candidates.includes(slugMatch)) {
  candidates.push(slugMatch);   // O(1) 삽입
}

// 이후 어휘‑부스트 적용
const boosted = applyLexicalBoost(candidates, query);
```

#### 결과
- 정확한 슬러그 검색 시 항상 최상위에 표시  
- 다운로드 수 정렬 옵션을 사용하면 기존 정렬 의도 유지  
- 회귀 테스트 추가 (`test/search.slug.spec.ts`) 로 모든 정렬 옵션에서 슬러그 매치가 보장됨  

### 5️⃣ 교훈 요약
1. **전체 파이프라인을 시각화**하고, 각 단계가 어떤 데이터를 배제·보강하는지 이해한다.  
2. **임계값 기반 배제**는 의도치 않은 누락을 초래할 수 있으니, 중요한 메타데이터(슬러그 등)는 별도 보강 로직을 두어야 한다.  
3. **에지 케이스 테스트**를 반드시 포함한다 – 정렬 옵션, 낮은 다운로드 수, 임베딩 품질 저하 등 다양한 시나리오를 검증한다.  
4. **시각 자료와 회귀 테스트**는 리뷰 속도를 크게 높인다.  

> 위 내용은 OpenClaw 커뮤니티가 실제 겪은 PR 경험을 바탕으로 정리한 것이며, 향후 스킬 마켓플레이스와 기타 검색 기반 기능을 개발·리뷰할 때 유용하게 활용될 수 있습니다.  

---

## Performance‑Tuning Tips
OpenClaw는 멀티채널·멀티모델 환경에서 동작하므로, 성능 최적화를 위한 몇 가지 실용적인 팁을 정리했습니다.

| 영역 | 권장 설정 | 기대 효과 |
|------|-----------|------------|
| **CPU/메모리** | `resources.max_cpu` 와 `resources.max_memory` 를 실제 워크로드에 맞게 조정 (예: 2 CPU / 4 GB) | 과도한 스와핑 방지, 다른 서비스와 리소스 경쟁 최소화 |
| **작업 우선순위** | `openclaw.yaml` 에 `queues:` 섹션 추가 → `high`, `normal`, `low` 큐 정의 | 중요한 작업이 먼저 처리돼 지연 감소 |
| **Memory Store 인덱싱** | SQLite 대신 PostgreSQL + 벡터 DB (pgvector) 사용 → `openclaw memory backend: postgres` | 대규모 컨텍스트 검색 시 응답 속도 2‑3배 향상 |
| **QMD 하이브리드 검색** | `openclaw memory qmd enable` 로 QMD 파이프라인 활성화 (BM25 → 벡터 → LLM 재랭킹) | 토큰 사용량 90 % 절감, 검색 정확도 ↑ |
| **Heartbeat 간격** | `scheduler.heartbeat_interval` 을 작업 특성에 맞게 조정 (예: 5 min → 15 min) | 불필요한 CPU 사이클 감소 |
| **Docker 이미지** | `prod-hardened` 이미지 사용 + `--read-only` 플래그 | 파일시스템 쓰기 제한 → 보안·성능 안정성 향상 |
| **로그 레벨** | `logging.level: warning` (개발 단계가 아닌 경우) | 디스크 I/O 감소, 로그 저장소 절감 |

**예시 설정 파일 (`config.yaml`)**
```yaml
resources:
  max_cpu: 2
  max_memory: 4GB

queues:
  high:
    priority: 10
  normal:
    priority: 5
  low:
    priority: 1

scheduler:
  heartbeat_interval: "15m"

memory:
  backend: postgres
  qmd:
    enabled: true
    max_results: 6
    char_limit: 700

logging:
  level: warning
```

위 설정을 적용한 뒤 `openclaw restart` 로 재시작하면 즉시 효과를 확인할 수 있습니다.

---

## 네임스페이스 – 멀티‑프로젝트 메모리 격리 방법
> **출처**: *MemoClaw Namespaces – 기억을 격리하세요* (euno.news) [※]

OpenClaw 에이전트를 여러 프로젝트에서 동시에 활용할 경우, 프로젝트 A의 메모리가 프로젝트 B의 회상에 섞여 들어갈 위험이 있습니다. **네임스페이스**는 이러한 메모리 혼합을 방지하기 위한 라벨 기반 격리 메커니즘입니다.

### 1️⃣ 네임스페이스 개념
- **네임스페이스**는 메모리 그룹을 구분하는 라벨이며, 동일 라벨을 가진 메모리만 서로 조회·리콜됩니다.  
- 기본값은 `default`(빈 문자열)이며, 명시적으로 지정하지 않으면 모든 메모리가 여기 저장됩니다.  
- `--namespace` 플래그를 지원하는 모든 `memoclaw`(OpenClaw 메모리 CLI) 명령에 적용됩니다.

### 2️⃣ 설정 방법
#### 메모리 저장 시 네임스페이스 지정
```bash
memoclaw store "Frontend uses Next.js 14 with app router" \
  --namespace website-redesign --tags "stack"
```

#### 특정 네임스페이스에서만 회상
```bash
memoclaw recall "what framework are we using" \
  --namespace website-redesign
```

#### 네임스페이스 내 메모리 목록
```bash
memoclaw list --namespace website-redesign
```

#### 전체 네임스페이스 확인
```bash
memoclaw namespace list
```

#### 네임스페이스별 메모리 개수 확인
```bash
memoclaw namespace stats
```

> **주의**: 지정된 네임스페이스에 저장된 메모리는 `--namespace` 없이 실행한 `recall`에서는 절대 나타나지 않습니다.

### 3️⃣ 베스트 프랙티스 (전략)

| 전략 | 설명 | 언제 사용 |
|------|------|-----------|
| **Strategy 1 – 프로젝트당 하나의 네임스페이스** | 각 프로젝트(또는 레포)마다 고유 네임스페이스 부여. 가장 직관적이며 관리가 쉬움. | 다수의 독립 프로젝트를 동시에 운영할 때 |
| **Strategy 2 – Shared + Project Namespaces** | 공통 지식(코딩 스타일, 커밋 규칙 등)은 `default`에 저장하고, 프로젝트‑특정 사실은 별도 네임스페이스에 보관. 두 번 호출해야 하지만, 공유·전용 정보를 명확히 구분 가능. | 팀 전체에 적용되는 정책과 프로젝트‑별 세부 정보가 모두 필요할 때 |
| **Strategy 3 – 클라이언트 격리** | 프리랜서·에이전시가 여러 고객을 다룰 경우, 각 고객을 별도 네임스페이스로 구분해 프라이버시 경계를 확실히 함. | 고객 데이터가 섞이는 것을 절대 허용할 수 없을 때 |
| **Strategy 4 – 환경 네임스페이스** | `prod`, `staging`, `dev` 등 환경별로 메모리를 분리. | 동일 코드베이스가 여러 환경에 배포될 때 |

#### 네이밍 규칙
- 소문자와 하이픈(`-`)만 사용 (예: `api-service`, `client-acme`)  
- 공백, 대문자, 특수문자 금지  
- 레포 이름, 프로젝트 슬러그, 환경명 등 직관적인 식별자 사용  

#### 예시 명령
```bash
# 프로젝트 A (API 서비스)
memoclaw store "Rate limiting set to 100 req/min per user" \
  --namespace api-service --tags "config"

# 프로젝트 B (Docs 사이트)
memoclaw store "Docs use Mintlify, deploy via GitHub integration" \
  --namespace docs-site --tags "infra"

# 클라이언트 C
memoclaw store "Client wants Material UI, no Tailwind" \
  --namespace client-acme --tags "preference"
```

### 4️⃣ 기존 메모를 네임스페이스로 마이그레이션
1. **전체 내보내기**  
   ```bash
   memoclaw export -O all-memories.json
   ```
2. **JSON 편집** – 각 객체에 `"namespace": "<target>"` 필드 추가  
3. **다시 가져오기**  
   ```bash
   memoclaw import namespaced-memories.json
   ```

또는 디렉터리 기반 마이그레이션:
```bash
memoclaw migrate ~/projects/acme/docs/ --namespace client-acme
memoclaw migrate ~/notes/general/          # default namespace
```

### 5️⃣ 언제 네임스페이스를 사용하지 않아도 되는가?
| 상황 | 권장 여부 |
|------|-----------|
| 단일 프로젝트만 작업 | **사용 안 함** |
| 에이전트가 한 번에 하나의 컨텍스트만 처리 | **사용 안 함** |
| 메모리 총량이 100개 미만 | **사용 안 함** |
| **다중 프로젝트** 혹은 **클라이언트 격리**가 필요 | **사용** |
| 메모리 풀이 빠르게 증가 | **사용** |

### TL;DR
- **네임스페이스**는 메모리를 격리합니다 – 모든 명령에 `--namespace` 플래그를 사용하세요.  
- **One‑namespace‑per‑project**는 가장 깔끔하고 이해하기 쉽습니다.  
- **Shared + project** 전략은 공통 정책을 `default`에 두고 프로젝트‑특정 정보를 별도 라벨에 보관합니다.  
- 필요 시 두 네임스페이스를 순차적으로 `recall` 하면 자동 병합이 가능합니다.

---

## QMD 하이브리드 검색 및 메모리 최적화
> **출처**: OpenClaw QMD: 로컬 하이브리드 검색으로 10배 더 똑똑한 메모리 (euno.news) [17]

### 1️⃣ QMD(쿼리‑메모리‑디스크) 하이브리드 검색 개념
QMD는 **세 단계**의 검색 파이프라인을 결합해 기존 “전체 MEMORY.md 주입” 방식의 한계를 극복합니다.

| 단계 | 기술 | 역할 |
|------|------|------|
| **BM25** | 전통적인 키워드 기반 IR | 빠른 정확한 용어 매칭 |
| **벡터 검색** | Jina v3 임베딩 (1024‑차원) | 의미적 유사도 탐색 |
| **LLM 재랭킹** | 로컬 LLM (예: Ollama LLama‑3) | 최종 후보를 질의와 실제 관련성 기준으로 정렬 |

이 접근은 **관련 스니펫만 반환**하고, **결과당 700 문자(기본 6개)** 로 제한해 토큰 사용량을 크게 절감합니다.

### 2️⃣ 메모리 토큰 한계와 해결 방안
- **기존 방식**: `MEMORY.md` 전체 파일을 매 프롬프트에 삽입 → 5 000 토큰 이상이면 **Token explosion** 발생, 비용 급증 및 **Relevance collapse** 로 정확도 저하.  
- **QMD 해결**  
  - **인덱싱**: Markdown 파일을 로컬 SQLite + 벡터 DB에 저장.  
  - **선별 반환**: 검색 결과는 최대 6개, 각 700 문자 → 약 **4 200 문자** (≈ 2 800 토큰) 로 제한.  
  - **토큰 절감**: 동일 쿼리당 평균 **≈ 200 tokens** 절감 [17].

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
| 마일스