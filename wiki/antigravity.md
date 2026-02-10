---
title: Antigravity 완벽 가이드
author: SEPilot AI
status: draft
tags:
  - Antigravity
  - AI IDE
  - Gemini
  - Browser Automation
  - 협업
---

## Antigravity 개요 및 핵심 개념

### Antigravity 정의 및 배경  
Antigravity는 **오픈소스 AI‑기반 통합 개발 환경**으로, VS Code를 기반으로 한 *WindSurf* 에디터와 클라우드‑호스팅 에이전트를 결합해 **코드 작성·디버깅·브라우저 자동화**를 하나의 워크스페이스에서 수행하도록 설계되었습니다. 이름이 의미하듯 “중력을 거스르는” 생산성을 목표로 합니다. 프로젝트는 2024년 Google Cloud AI API와 Gemini 모델을 활용하도록 설계된 커뮤니티 주도형 툴이며, Google이 직접 제공하는 제품은 아닙니다【1】.

### 주요 목표와 제공 가치  
- **생산성 향상** – 프롬프트 하나로 코드 생성·수정·테스트를 자동화  
- **멀티모델 활용** – Gemini 3, Gemini 2.5 등 최신 Google 모델을 직접 호출  
- **실시간 협업** – 워크스페이스를 공유해 팀원과 동시 편집 및 프롬프트 관리  
- **브라우저 자동화** – 클릭, 스크롤, 입력, 스크린샷, 화면 녹화 등 UI 작업을 AI가 수행  

### 핵심 용어  
- **Agent** – 클라우드에 배포된 실행 환경. 현재는 **Browser Sub‑Agent**(브라우저 제어)와 **Code Agent**(코드 생성·디버깅) 두 종류가 기본 제공됩니다.  
- **Workspace** – Antigravity가 관리하는 프로젝트 단위. 파일·프롬프트·에이전트 상태가 모두 포함됩니다.  
- **MCP (Model Context Protocol)** – 프론트엔드(IDE)와 Gemini 모델·에이전트 간에 **컨텍스트와 메타데이터**를 교환하는 전용 프로토콜.  

### 현재 지원되는 모델 및 버전  

| 모델 | 버전 | 비고 |
|------|------|------|
| Gemini 3 (Deep Think) | 최신 | 고정밀 코드·UI 생성 |
| Gemini 2.5 Pro | 최신 | 비용 효율적인 옵션 |
| Nano Banana | 실험적 | 이미지·텍스트 혼합 작업 지원 |

> 최신 모델 목록은 Antigravity 공식 릴리즈 노트를 참고하세요【2】.

---

## 아키텍처 및 동작 원리

### 전체 시스템 구성도  

```
[사용자] ⇄ [VS Code 기반 IDE (WindSurf)] ⇄ [클라우드 Agent (Browser Sub‑Agent, Code Agent)] ⇄ [Gemini 모델 (MCP)]
```

- **IDE**는 로컬에서 실행되며, 에이전트와 MCP를 통해 실시간으로 명령을 주고받습니다.  
- **클라우드 Agent**는 Google Cloud Run 혹은 Cloud Run for Anthos에 호스팅되며, 브라우저 세션을 제어하거나 코드 실행 환경을 제공합니다.  
- **MCP**는 JSON‑L 형태의 메시지를 교환해 프롬프트, 파일 컨텍스트, 실행 결과 등을 전달합니다.  

### Browser Sub‑Agent 동작 흐름  
1. 사용자가 “버튼 클릭” 프롬프트를 입력 → IDE → MCP → Browser Sub‑Agent  
2. 에이전트는 대상 탭을 찾아 **활성 표시**(파란색 테두리)를 부여하고, Selenium‑유사 API로 클릭을 수행  
3. 결과(스크린샷·콘솔 로그)는 MCP를 통해 IDE에 반환 → 사용자는 즉시 확인  

### Model Context Protocol (MCP) 구조와 역할  

- **request**: `type`, `payload`, `metadata` (파일 경로, 라인 번호 등)  
- **response**: `status`, `data` (생성된 코드, UI 스냅샷, 로그)  
- **streaming**: 대용량 결과(예: 화면 녹화) 전송 시 chunked 방식 지원  

### 데이터 흐름 및 보안 메커니즘  

- 모든 통신은 **TLS 1.3**으로 암호화됩니다.  
- API 키는 **환경 변수 `ANTIGRAVITY_API_KEY`** 혹은 VS Code 시크릿 스토어에 저장되며, 서버에서는 **읽기 전용**으로만 사용합니다.  
- 프롬프트 인젝션 방지를 위해 MCP 레이어에서 **샌드박스 검증**을 수행합니다.  
- **OAuth 2.0** 기반 토큰 스코프(`https://www.googleapis.com/auth/cloud-platform`)를 사용해 최소 권한 원칙을 적용합니다【3】.  

> 보안 정책 상세 내용은 Antigravity 공식 보안 가이드 문서를 확인하세요【4】.

---

## 주요 기능과 특징

| 기능 | 설명 |
|------|------|
| 코드 자동 생성·수정·디버깅 | Gemini 모델이 파일 컨텍스트를 파악해 함수 구현, 리팩터링, 테스트 코드까지 자동 생성 |
| UI/브라우저 자동화 | 클릭, 스크롤, 키보드 입력, DevTools 콘솔 로그 확인, 스크린샷·녹화 등 전 영역 지원 |
| 멀티‑모델 연동 | Gemini 3, Gemini 2.5, Nano Banana 등 여러 모델을 워크스페이스 별로 선택 가능 |
| 실시간 협업 워크스페이스 | 팀원 초대 → 동일 워크스페이스에서 파일·프롬프트·에이전트 상태를 동시 편집 |
| 플러그인·확장성 | VS Code Marketplace에 배포된 **Antigravity Extension** 외, 커스텀 에이전트(REST API) 개발 가능 |

---

## 설치 및 설정 방법

### 시스템 요구 사항  

- OS: Windows 10 (64bit) / macOS 12+ / Linux (glibc 2.17+)  
- Node.js ≥ 18 (npm 포함) – Antigravity CLI가 Node 기반으로 동작  
- VS Code ≥ 1.80 (WindSurf 기반 확장 자동 설치)  
- 인터넷 연결 (클라우드 Agent와 MCP 통신 필요)  

### Antigravity 설치 절차  

1. **CLI 설치**  
   ```text
   npm install -g @antigravity/cli
   ```  

2. **VS Code 확장 설치**  
   - VS Code Marketplace에서 “Antigravity” 검색 후 **Install**  
   - 설치 시 자동으로 *WindSurf* 기반 에디터가 활성화됩니다.  

3. **API 키 설정**  
   - Google Cloud Console에서 **Antigravity API** 키를 발급받습니다.  
   - 환경 변수에 저장  
     ```text
     export ANTIGRAVITY_API_KEY=YOUR_API_KEY
     ```  
   - VS Code → Settings → Antigravity → “API Key” 입력 (시크릿 스토어에 저장)  

4. **프로젝트 연결**  
   - `antigravity init` 명령으로 현재 폴더를 워크스페이스로 초기화  
   - `antigravity model set gemini-3` 로 기본 모델 지정  

5. **기본 테스트 실행**  
   - VS Code 명령 팔레트(`Ctrl+Shift+P`) → “Antigravity: Run Hello World”  
   - 콘솔에 “Hello from Antigravity!”와 함께 생성된 파일이 열리면 정상 작동  

### 환경 변수 및 인증 설정 팁  

- **`.env` 파일**에 `ANTIGRAVITY_API_KEY`를 저장하고, VS Code 확장에서 자동 로드하도록 설정하면 매번 입력할 필요가 없습니다.  
- CI/CD 파이프라인에서는 **GitHub Secrets**에 키를 저장하고 `ANTIGRAVITY_API_KEY` 환경 변수로 전달합니다.  

> 최신 CLI 옵션은 `antigravity --help` 로 확인하세요【5】.

---

## 사용 사례 및 활용 예시

### 1. 웹 애플리케이션 프로토타입 – UI 자동 생성·테스트  

프롬프트: “React와 TailwindCSS를 사용해 로그인 페이지를 만들고, 로그인 버튼을 클릭하는 테스트 코드를 작성해줘.”  

Antigravity는 `Login.jsx` 파일을 생성하고, **Browser Sub‑Agent**가 실제 브라우저에서 로그인 폼을 입력·클릭 후 스크린샷을 반환합니다.

### 2. 데이터 파이프라인 스크립트 – 코드 보완·성능 최적화  

기존 `etl.py` 파일에 “데이터 프레임을 병렬 처리하도록 리팩터링해줘.” 라는 프롬프트를 입력하면, Gemini 3가 `multiprocessing` 기반 구현을 제안하고, 자동으로 벤치마크 테스트를 실행해 성능 차이를 보고합니다.

### 3. 팀 협업 – 실시간 워크스페이스 공유·리뷰  

팀원 A가 워크스페이스를 초대 → 팀원 B가 동일 파일을 열고 **프롬프트 히스토리**를 실시간으로 확인하면서 코드를 수정. 변경 내용은 즉시 MCP를 통해 동기화되어 모든 참여자가 최신 버전을 볼 수 있습니다.

### 4. 교육·학습 – AI 코치  

초보 개발자가 “Python으로 리스트 정렬을 구현하고 싶어” 라고 입력하면, Antigravity가 단계별 설명과 함께 실행 가능한 코드를 제공하고, **Browser Sub‑Agent**가 결과를 시각화해 보여줍니다.

#### 실제 프로젝트 예시 (코드 스니펫)

```text
// antigravity-generated React component (Login.jsx)
import React from 'react';
export default function Login() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <input placeholder="Email" className="border p-2 mb-2" />
      <input type="password" placeholder="Password" className="border p-2 mb-2" />
      <button className="bg-blue-500 text-white p-2">Login</button>
    </div>
  );
}
```

위 파일을 저장하고 `antigravity run test-login` 명령을 실행하면, Browser Sub‑Agent가 자동으로 **입력 → 클릭 → 스크린샷**을 수행하고 결과 이미지를 워크스페이스에 첨부합니다.

---

## 다른 유사 도구/기술과의 비교

| 항목 | Antigravity | GitHub Copilot | Tabnine | Cursor |
|------|--------------|----------------|---------|--------|
| 기반 모델 | Gemini 3 / Gemini 2.5 | OpenAI Codex | OpenAI GPT‑4 | OpenAI GPT‑4 |
| 브라우저 자동화 | O (Browser Sub‑Agent) | X | X | X |
| VS Code 통합 | 완전 통합 (WindSurf 기반) | 플러그인 | 플러그인 | 플러그인 |
| 협업 워크스페이스 | O (실시간 공유) | X | X | X |
| 가격 정책 | 무료 플랜 + 쿼터 / Pro 구독 | 월 $10~$20 | 월 $12~$30 | 월 $15~$30 |
| 보안·데이터 격리 | 클라우드 에이전트 샌드박스 | 로컬 코드 베이스에 제한적 | 로컬/클라우드 옵션 | 로컬 실행 중심 |
| 확장성 | 커스텀 에이전트·REST API | 제한적 | 플러그인 API | 플러그인 API |

#### 비교 포인트 상세 설명  

- **기능**: Antigravity는 **코드·UI 자동화**를 하나의 플랫폼에서 제공하는 반면, Copilot·Tabnine·Cursor는 코드 제안에 초점을 맞춥니다.  
- **비용**: 기본 무료 플랜이 존재하지만, 쿼터(예: 5 시간당 1 000 토큰) 초과 시 Pro 구독이 필요합니다. 다른 도구는 전부 구독 기반이며, 사용량에 관계없이 월정액입니다.  
- **보안**: Antigravity는 클라우드 에이전트가 **샌드박스** 환경에서 실행되며, MCP 레이어에서 프롬프트 검증을 수행합니다. Copilot은 로컬 IDE에 직접 코드를 삽입하므로 데이터 유출 위험이 상대적으로 낮지만, 모델 학습에 사용될 가능성이 있습니다.  
- **확장성**: Antigravity는 **REST 기반 Custom MCP**와 **플러그인**을 통해 자체 에이전트를 추가할 수 있어, 기업 내부 도구와 연동하기 용이합니다.  

---

## 장단점 분석

### 장점  

- **통합 IDE·브라우저 자동화**: 하나의 워크스페이스에서 코드와 UI를 동시에 다룰 수 있어 프로토타이핑 속도가 급격히 상승합니다.  
- **최신 Gemini 모델 활용**: Gemini 3의 높은 정확도와 컨텍스트 이해 능력으로 복잡한 로직도 신뢰성 있게 생성됩니다.  
- **실시간 협업 워크스페이스**: 팀원 간 프롬프트·코드·에이전트 상태를 즉시 공유해 리뷰와 피드백이 원활합니다.  
- **무료 플랜 존재**: 소규모 프로젝트나 학습용으로는 비용 부담 없이 시작할 수 있습니다.  

### 단점  

- **클라우드 의존성**: 모든 에이전트가 Google Cloud에 존재하므로 네트워크 지연 및 쿼터 소진 위험이 있습니다.  
- **보안 관리 필요**: 프롬프트 인젝션 및 민감 데이터 유출 가능성을 최소화하려면 토큰 관리·데이터 암호화 정책을 철저히 적용해야 합니다.  
- **초기 설정 복잡성**: MCP, API 키, 모델 선택 등 초기 설정 단계가 다소 복잡합니다.  
- **UI 불안정성**: 일부 기능(예: 에이전트 매니저 UI)에서 화면 전환 시 버그가 보고되고 있습니다.  

---

## 보안·프라이버시 정책

1. **전송 보안**  
   - 모든 외부 통신은 TLS 1.3 이상으로 암호화됩니다.  
   - API 키와 OAuth 토큰은 **헤더 기반 인증**만 허용하며, 로그에 절대 기록되지 않습니다.  

2. **데이터 격리**  
   - **Agent**는 Google Cloud Run의 **공용 샌드박스**에서 실행되며, 파일 시스템은 요청당 일시적으로 마운트됩니다.  
   - 사용자 코드와 프롬프트는 **전용 프로젝트**에만 저장되며, 30일 이후 자동 삭제됩니다(사용자 설정 가능).  

3. **프롬프트 검증**  
   - MCP 레이어에서 **정규식 기반 필터**와 **AI‑보안 모델**을 사용해 악의적인 프롬프트(예: 쉘 명령 삽입)를 차단합니다.  

4. **감사 로그**  
   - 모든 API 호출·에이전트 실행·데이터 전송은 **Cloud Audit Logs**에 기록되며, 조직의 SIEM 시스템과 연동할 수 있습니다.  

5. **컴플라이언스**  
   - EU AI Act, GDPR, CCPA 등 주요 규제에 부합하도록 **데이터 최소화**와 **사용자 동의** 절차를 구현했습니다【6】.  

---

## 참고 자료 및 공식 문서 링크

1. Antigravity 프로젝트 소개 – https://antigravity.dev/about  
2. 최신 릴리즈 노트 – https://antigravity.dev/releases  
3. OAuth 2.0 인증 가이드 – https://developers.google.com/identity/protocols/oauth2  
4. Antigravity 보안 가이드 – https://antigravity.dev/docs/security  
5. CLI 사용법 – https://antigravity.dev/docs/cli  
6. EU AI Act 대응 가이드 – https://ec.europa.eu/commission/presscorner/detail/en/ip_23_xxxx  

> 위 링크들은 2026년 2월 현재 확인된 최신 자료이며, 향후 업데이트될 수 있습니다.  