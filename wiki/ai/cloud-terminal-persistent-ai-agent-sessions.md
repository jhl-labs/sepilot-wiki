---
title: "클라우드 터미널 구축: 지속적인 AI 에이전트 세션 유지하기"
author: SEPilot AI
status: published
tags: [클라우드 터미널, SSH, AI 에이전트, PTY, WebSocket, tmux, 세션 관리]
redirect_from:
  - cloud-persistent-terminal-design
  - cloud-persistent-terminal-design
  - 207
  - cloud-terminal-persistent-ai-agent-sessions
order: 2
related_docs: ["persistent-terminal-design.md"]
---

## 1. 서론

이 문서는 **클라우드 기반 터미널**을 구축하여 AI 에이전트의 세션을 지속적으로 유지하는 방법을 다룹니다.
로컬 터미널의 한계(노트북 종료, 네트워크 단절, 기기 변경 시 세션 손실)를 극복하고, 서버 측에서 영구적으로 실행되는 터미널 환경을 설계·구현하는 실전 가이드를 제공합니다.

대상 독자는 장기 실행 AI 에이전트를 운영하는 개발자, DevOps 엔지니어, 그리고 원격 개발 환경을 개선하려는 기술 리더입니다.

## 2. 로컬 터미널의 한계

### 2.1 기존 방식의 문제점

| 상황 | 결과 |
|------|------|
| 노트북을 닫음 | SSH 세션 종료, 실행 중인 프로세스 강제 종료 |
| 네트워크 단절 | 터미널 연결 끊김, 진행 상황 소실 |
| 기기 변경 | 이전 세션 접근 불가, 환경 재설정 필요 |
| 장시간 부재 | 유휴 타임아웃으로 세션 종료 |

### 2.2 tmux/screen의 한계

`tmux`나 `screen`은 세션 유지를 위한 전통적인 도구이지만, 근본적인 한계가 존재합니다.

- **특정 서버에 종속**: tmux 세션은 해당 서버에서만 접근 가능
- **웹 접근 불가**: 브라우저에서 직접 접속할 수 없음
- **다중 기기 동기화 어려움**: 기기 간 실시간 세션 공유가 제한적
- **AI 에이전트 통합 부재**: 프로그래밍 방식의 세션 관리 API 미제공

## 3. 클라우드 터미널 아키텍처

### 3.1 핵심 설계 원칙

```
┌─────────────────────────────────────────────────────┐
│                    클라이언트 계층                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 브라우저   │  │  CLI     │  │  API     │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       └──────────────┼──────────────┘                │
│                      │ WebSocket (wss://)            │
├──────────────────────┼──────────────────────────────┤
│                 서버 계층                              │
│       ┌──────────────┴──────────────┐                │
│       │      세션 매니저              │                │
│       │  ┌─────┐ ┌─────┐ ┌─────┐   │                │
│       │  │PTY 1│ │PTY 2│ │PTY N│   │                │
│       │  └─────┘ └─────┘ └─────┘   │                │
│       └─────────────────────────────┘                │
│                      │                               │
│       ┌──────────────┴──────────────┐                │
│       │     영구 스토리지             │                │
│       │  (세션 상태, 히스토리, 설정)   │                │
│       └─────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

### 3.2 핵심 구성 요소

| 구성 요소 | 역할 | 기술 선택지 |
|-----------|------|------------|
| **PTY (Pseudo Terminal)** | 서버 측 가상 터미널 | `node-pty`, `python-pty` |
| **세션 매니저** | 세션 생명주기 관리 | Node.js, Go, Rust |
| **WebSocket 서버** | 실시간 양방향 통신 | `ws`, `Socket.IO` |
| **인증/인가** | 사용자 식별 및 권한 관리 | JWT, OAuth 2.0 |
| **암호화 저장소** | 민감 데이터 보호 | AES-256, Vault |

## 4. 구현 가이드

### 4.1 서버 측 PTY 레이어

PTY(Pseudo Terminal)는 클라우드 터미널의 핵심입니다. 서버에서 실제 쉘 프로세스를 생성하고, 클라이언트와의 입출력을 중계합니다.

```typescript
// PTY 세션 생성 예시 (node-pty 기반)
import * as pty from 'node-pty';

interface SessionConfig {
  shell: string;
  cols: number;
  rows: number;
  env: Record<string, string>;
}

function createSession(config: SessionConfig) {
  const ptyProcess = pty.spawn(config.shell, [], {
    name: 'xterm-256color',
    cols: config.cols || 80,
    rows: config.rows || 24,
    cwd: process.env.HOME,
    env: { ...process.env, ...config.env },
  });

  return {
    id: generateSessionId(),
    pty: ptyProcess,
    createdAt: new Date(),
    lastActivity: new Date(),
  };
}
```

### 4.2 WebSocket 통신

클라이언트와 서버 간의 실시간 통신은 보안 WebSocket(wss://)을 통해 이루어집니다.

```typescript
// WebSocket 서버 설정 예시
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  // 인증 검증
  const token = extractToken(req);
  const user = verifyToken(token);
  if (!user) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  // 기존 세션 복원 또는 새 세션 생성
  const session = restoreSession(user.id) || createSession({
    shell: '/bin/bash',
    cols: 80,
    rows: 24,
    env: {},
  });

  // PTY 출력 → 클라이언트 전송
  session.pty.onData((data: string) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  });

  // 클라이언트 입력 → PTY 전송
  ws.on('message', (msg: string) => {
    const parsed = JSON.parse(msg);
    if (parsed.type === 'input') {
      session.pty.write(parsed.data);
    } else if (parsed.type === 'resize') {
      session.pty.resize(parsed.cols, parsed.rows);
    }
    session.lastActivity = new Date();
  });

  // 연결 종료 시 세션은 유지 (PTY 종료하지 않음)
  ws.on('close', () => {
    saveSessionState(session);
    // 주의: session.pty.kill()을 호출하지 않음
  });
});
```

### 4.3 세션 영속성

클라우드 터미널의 핵심 가치는 **세션이 클라이언트 연결과 독립적으로 유지**되는 것입니다.

```typescript
// 세션 상태 관리
interface PersistentSession {
  id: string;
  userId: string;
  ptyPid: number;
  scrollback: string[];    // 스크롤백 버퍼
  env: Record<string, string>;
  cwd: string;
  createdAt: Date;
  lastActivity: Date;
}

// 세션 상태 저장 (Redis 또는 파일 시스템)
async function saveSessionState(session: PersistentSession): Promise<void> {
  await redis.hset(`session:${session.id}`, {
    ...session,
    scrollback: JSON.stringify(session.scrollback.slice(-10000)),
  });
  await redis.expire(`session:${session.id}`, 86400 * 7); // 7일 유지
}

// 세션 복원
async function restoreSession(userId: string): Promise<PersistentSession | null> {
  const sessionKeys = await redis.keys(`session:*`);
  for (const key of sessionKeys) {
    const session = await redis.hgetall(key);
    if (session.userId === userId && isProcessAlive(session.ptyPid)) {
      return deserializeSession(session);
    }
  }
  return null;
}
```

## 5. AI 에이전트 세션 유지

### 5.1 AI 에이전트 전용 설계 고려사항

AI 에이전트가 클라우드 터미널을 활용할 때는 일반 사용자와 다른 요구사항이 있습니다.

| 요구사항 | 설명 | 구현 방법 |
|----------|------|----------|
| **장기 실행** | 수 시간~수 일간 지속 실행 | 세션 타임아웃 비활성화 또는 확장 |
| **프로그래밍 접근** | API를 통한 명령 실행 | REST/gRPC 엔드포인트 제공 |
| **출력 수집** | 명령 실행 결과 구조화 | JSON 응답 래핑 |
| **병렬 세션** | 동시 다중 작업 수행 | 세션 풀 관리 |
| **상태 모니터링** | 에이전트 상태 실시간 확인 | 헬스체크 엔드포인트 |

### 5.2 에이전트 API 인터페이스

```typescript
// AI 에이전트용 REST API 예시
interface AgentCommand {
  sessionId: string;
  command: string;
  timeout?: number;       // 명령 실행 제한 시간 (ms)
  waitForPrompt?: boolean; // 프롬프트 대기 여부
}

interface AgentResponse {
  sessionId: string;
  output: string;
  exitCode: number | null;
  duration: number;
  isAlive: boolean;
}

// POST /api/agent/execute
async function executeCommand(req: AgentCommand): Promise<AgentResponse> {
  const session = await getOrCreateSession(req.sessionId);
  const startTime = Date.now();

  return new Promise((resolve) => {
    let output = '';
    const timeout = setTimeout(() => {
      resolve({
        sessionId: session.id,
        output,
        exitCode: null,
        duration: Date.now() - startTime,
        isAlive: true,
      });
    }, req.timeout || 30000);

    session.pty.onData((data: string) => {
      output += data;
      if (req.waitForPrompt && isPrompt(data)) {
        clearTimeout(timeout);
        resolve({
          sessionId: session.id,
          output,
          exitCode: 0,
          duration: Date.now() - startTime,
          isAlive: true,
        });
      }
    });

    session.pty.write(req.command + '\n');
  });
}
```

### 5.3 에이전트 세션 생명주기

```
에이전트 시작 → 세션 요청 → [기존 세션 복원 / 새 세션 생성]
     │                              │
     ▼                              ▼
명령 실행 ←──── 작업 큐 ←──── 오케스트레이터
     │
     ▼
결과 수집 → 다음 작업 결정 → 반복
     │
     ▼ (에이전트 중단/재시작)
세션 상태 저장 → 세션 유지 (PTY 계속 실행)
     │
     ▼ (에이전트 재연결)
세션 복원 → 이전 상태에서 작업 재개
```

## 6. 보안 설계

### 6.1 보안 체크리스트

- **통신 암호화**: 모든 WebSocket 연결에 TLS(wss://) 적용
- **인증**: JWT 또는 OAuth 2.0 기반 토큰 인증
- **세션 격리**: 사용자별 독립된 PTY 프로세스 및 네임스페이스
- **민감 데이터 보호**: 환경변수, API 키 등은 암호화 저장
- **비활동 잠금**: 일정 시간 비활동 시 자동 잠금
- **감사 로그**: 모든 명령 실행 이력 기록

### 6.2 컨테이너 기반 격리

```yaml
# Docker Compose를 활용한 세션 격리 예시
services:
  terminal-session:
    image: cloud-terminal:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    networks:
      - isolated
    environment:
      - SESSION_TIMEOUT=3600
      - MAX_SCROLLBACK=10000
```

### 6.3 네트워크 보안

```
클라이언트 ──[TLS]──▶ 리버스 프록시 (Nginx/Traefik)
                           │
                     [인증 미들웨어]
                           │
                     [Rate Limiting]
                           │
                  ┌────────┴────────┐
                  │  내부 네트워크    │
                  │  (격리된 세션)   │
                  └─────────────────┘
```

## 7. 운영 고려사항

### 7.1 리소스 관리

| 항목 | 권장값 | 비고 |
|------|--------|------|
| 세션당 메모리 | 256MB~512MB | 작업 유형에 따라 조정 |
| 스크롤백 버퍼 | 10,000줄 | 메모리 사용량 균형 |
| 세션 타임아웃 | 7일 (AI), 24시간 (일반) | 용도별 차등 설정 |
| 최대 동시 세션 | 서버 리소스에 비례 | CPU 코어 * 4 권장 |

### 7.2 모니터링

클라우드 터미널 운영 시 다음 지표를 모니터링해야 합니다.

- **활성 세션 수**: 현재 실행 중인 PTY 프로세스 수
- **메모리 사용량**: 세션별 및 전체 메모리 소비
- **WebSocket 연결 상태**: 활성 연결 수, 재연결 빈도
- **세션 생존 시간**: 평균 세션 유지 기간
- **명령 실행 지연**: PTY 입출력 레이턴시

### 7.3 장애 복구

```
PTY 프로세스 비정상 종료
     │
     ▼
세션 매니저 감지 (프로세스 모니터링)
     │
     ▼
마지막 저장 상태에서 새 PTY 생성
     │
     ▼
환경변수, 작업 디렉토리 복원
     │
     ▼
스크롤백 히스토리 복원
     │
     ▼
클라이언트에 재연결 알림
```

## 8. 기존 도구 및 대안 비교

| 도구 | 영구 세션 | 웹 접근 | AI 통합 | 격리 | 비용 |
|------|:---------:|:-------:|:-------:|:----:|------|
| tmux/screen | O | X | X | X | 무료 |
| Eternal Terminal (et) | O | X | X | X | 무료 |
| Mosh | △ | X | X | X | 무료 |
| VS Code Remote | O | O | △ | △ | 무료 |
| GitHub Codespaces | O | O | O | O | 유료 |
| 자체 구축 클라우드 터미널 | O | O | O | O | 인프라 비용 |

## 9. 실전 구축 체크리스트

- [ ] PTY 레이어 구현 및 테스트
- [ ] WebSocket 서버 구축 (TLS 적용)
- [ ] 인증/인가 시스템 연동
- [ ] 세션 영속성 구현 (Redis/파일시스템)
- [ ] 컨테이너 기반 세션 격리
- [ ] AI 에이전트용 API 엔드포인트 구현
- [ ] 모니터링 및 알림 설정
- [ ] 장애 복구 시나리오 테스트
- [ ] 부하 테스트 및 리소스 최적화
- [ ] 보안 감사 수행

## 10. 결론

클라우드 터미널은 로컬 터미널의 한계를 극복하고, 특히 AI 에이전트의 장기 실행 세션을 안정적으로 유지하는 데 핵심적인 인프라입니다. PTY 레이어, WebSocket 통신, 세션 영속성이라는 세 가지 핵심 축을 중심으로 구축하면, 기기 독립적이고 안정적인 터미널 환경을 확보할 수 있습니다.

보안(TLS, 세션 격리, 암호화)과 운영(모니터링, 장애 복구, 리소스 관리)을 함께 설계해야 프로덕션 수준의 클라우드 터미널을 운영할 수 있습니다.

## 참고 자료

- [원본 기사: 클라우드 터미널 구축 경험](https://euno.news/posts/ko/i-built-a-cloud-terminal-because-i-was-tired-of-ba-4274c8)
- [node-pty - Node.js PTY 라이브러리](https://github.com/microsoft/node-pty)
- [xterm.js - 웹 기반 터미널 에뮬레이터](https://xtermjs.org/)
- [tmux - 터미널 멀티플렉서](https://github.com/tmux/tmux)
- [Eternal Terminal](https://eternalterminal.dev/)
