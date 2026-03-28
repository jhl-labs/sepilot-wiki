---
title: ".claude 폴더 해부 – Claude Code 설정 레이어 상세 가이드"
author: SEPilot AI
status: draft
tags: [Claude, .claude, 설정, 툴킷, 프롬프트, 히스토리, 캐시]
---

## 1. 서론
이 문서는 **Claude Code** 를 활용하는 개발자를 대상으로, Claude AI 의 생산성을 극대화하기 위한 핵심 설정 레이어인 **`.claude/` 폴더**의 구조와 활용 방법을 상세히 설명합니다.  
`.claude/` 폴더는 Claude 를 일반적인 LLM 에서 **맞춤형 생산성 엔진** 으로 변환시키는 설정 파일·플러그인·템플릿·히스토리·캐시 등을 포함하는 **통합 관리 영역** 입니다.  

> “Claude AI를 코딩, 글쓰기 또는 자동화에 사용하고 있다면, 성능을 충분히 활용하지 못하고 있을 가능성이 높습니다. `.claude/` 폴더는 마법이 일어나는 곳으로, Claude를 일반적인 AI에서 여러분만의 맞춤형 생산성 엔진으로 변환시키는 설정 레이어입니다.” [출처](https://euno.news/posts/ko/anatomy-of-the-claude-folder-a-deep-dive-into-clau-9f5de6)

## 2. `.claude/` 폴더 위치와 기본 구조
- **위치**: 사용자의 홈 디렉터리(`~/.claude/`)에 자동으로 생성됩니다.  
- **주요 서브디렉터리**  
  - `config.json` – 전역 설정 파일  
  - `tools/` – 사용자 정의 툴(플러그인)  
  - `prompts/` – 재사용 가능한 프롬프트 템플릿  
  - `history/` – 대화·세션 기록  
  - `cache/` – 응답·툴 결과 캐시  

> 폴더 권한은 기본적으로 사용자(`$USER`)에게만 읽기·쓰기 권한이 부여됩니다. 필요 시 `chmod 700 ~/.claude` 로 권한을 강화할 수 있습니다.  

### 초기화 방법
```bash
mkdir -p ~/.claude/{tools,prompts,history,cache}
touch ~/.claude/config.json
```
(위 명령은 실제 파일·디렉터리를 생성합니다.)

## 3. `config.json` 상세 분석
`config.json` 은 Claude Code 전체 동작을 제어하는 **핵심 설정 파일**이며, JSON 형식으로 작성됩니다. 예시는 다음과 같습니다.

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "max_tokens": 4096,
  "tools": ["code_interpreter", "file_search"],
  "system_prompt": "You are a senior developer focused on clean code."
}
```

| 키 | 설명 | 비고 |
|---|---|---|
| `model` | 사용할 Claude 모델 및 버전 | 예: `claude-3-5-sonnet-20241022` |
| `temperature` | 창의성 수준 (0.0 = 결정론적, 1.0 = 창의적) | |
| `max_tokens` | 응답 길이 상한 | |
| `tools` | 활성화할 툴(플러그인) 목록 | `code_interpreter`, `file_search` 등 |
| `system_prompt` | AI의 기본 성격·역할 정의 | |

> **JSON 포맷 검증**: `jq . ~/.claude/config.json` 로 구문 오류를 확인할 수 있습니다.  
> **환경별 설정 관리**: 개발·테스트·프로덕션 환경마다 별도 `config.dev.json`, `config.prod.json` 등을 두고, 실행 시 `--config` 플래그로 지정하는 전략이 일반적입니다. (구체적인 구현 방법은 **추가 조사가 필요합니다**.)

## 4. `tools/` – 맞춤형 툴킷
`tools/` 디렉터리는 Claude 의 기능을 확장하는 **플러그인**을 저장합니다. 각 툴은 최소한 다음 파일을 포함해야 합니다.

- `manifest.json` – 메타데이터 정의  
- `handler.*` – 실제 로직 구현 (예: `handler.py`)  
- `README.md` – 사용법·설명  

### `manifest.json` 예시
```json
{
  "name": "code_review",
  "version": "1.0.0",
  "description": "Automated code review with best practices",
  "entry_point": "handler.py",
  "permissions": ["read_files", "write_files"]
}
```

### 샘플 디렉터리 트리
```
~/.claude/tools/
├── code_review/
│   ├── manifest.json
│   ├── handler.py
│   └── README.md
├── file_operations/
│   ├── manifest.json
│   ├── handler.py
│   └── README.md
└── web_search/
    ├── manifest.json
    ├── handler.py
    └── README.md
```

#### 툴 추가·수정·삭제 절차
1. 새 디렉터리 생성 → `manifest.json`·핸들러·README 작성  
2. `config.json` 의 `tools` 배열에 툴 이름 추가  
3. Claude Code 를 재시작하거나 `claude reload-tools` 명령으로 로드  

> 툴 로딩 순서는 `config.json` 에 정의된 순서대로이며, 동일 이름·버전 충돌을 방지하기 위해 **버전 관리**가 권장됩니다. (구체적인 충돌 방지 메커니즘은 **추가 조사가 필요합니다**.)

## 5. `prompts/` – 재사용 가능한 프롬프트 템플릿
템플릿은 **`.md`** 혹은 **`.txt`** 파일 형태로 저장되며, 변수 삽입 규칙은 `{{variable}}` 로 표기합니다.

### 디렉터리 레이아웃
```
~/.claude/prompts/
├── code_review.md
├── bug_fix.md
├── feature_implementation.md
└── documentation.md
```

#### `code_review.md` 예시
```
# Code Review Template
Review the following code for:
1. Security vulnerabilities
2. Performance issues
3. Code style violations
4. Edge cases

Code:
{{code}}

Provide:
- Summary of issues
- Line‑by‑line feedback
- Suggested fixes
```

#### 활용 방법
- CLI: `claude run --prompt-file ~/.claude/prompts/code_review.md --var code="..."`  
- API: `POST /v1/prompt` 에 `template_path` 와 `variables` 를 전달  

> 템플릿 버전 관리는 Git 등 VCS 로 관리하는 것이 일반적이며, 공동 편집 시 **Pull Request** 기반 리뷰를 권장합니다. (구체적인 워크플로우는 **추가 조사가 필요합니다**.)

## 6. `history/` – 대화 기록 및 메모리 관리
Claude 가 수행한 각 세션은 `history/` 아래 날짜별 디렉터리와 `session_XXX.json` 파일로 저장됩니다.

### 구조 예시
```
~/.claude/history/
├── 2026-03-28/
│   ├── session_001.json
│   ├── session_002.json
│   └── session_003.json
└── 2026-03-27/
    ├── session_001.json
    └── session_002.json
```

#### 기록 포맷 (예시)
```json
{
  "timestamp": "2026-03-28T14:32:10Z",
  "prompt": "...",
  "response": "...",
  "tools_used": ["code_review"]
}
```

- **컨텍스트 재활용**: 이전 세션 기록을 `system_prompt` 에 포함하거나, `--load-history` 옵션으로 불러와 연속적인 대화를 유지할 수 있습니다.  
- **자동 정리**: 오래된 기록을 아카이브하거나 삭제하는 스크립트를 `cron` 으로 실행하는 것이 일반적이며, 구체적인 스크립트 예시는 **추가 조사가 필요합니다**.

## 7. `cache/` – 응답 캐시와 성능 최적화
캐시 디렉터리는 **프롬프트·응답·툴 결과** 등을 저장해 재요청 시 지연 시간을 감소시키고 API 비용을 절감합니다.

### 캐시 대상 (확인된 내용)
- 자주 사용되는 프롬프트와 그에 대한 응답  
- 툴 실행 결과 (예: 파일 검색 결과)

> **TTL(Time‑to‑Live)** 설정 및 캐시 무효화 정책은 현재 문서에 구체적인 정의가 없으며, 구현 방식은 Claude Code 버전에 따라 다를 수 있습니다. 따라서 **추가 조사가 필요합니다**.

## 8. 베스트 프랙티스
| 분야 | 권장 방법 |
|---|---|
| **버전 관리** | `~/.claude` 전체를 Git 레포지토리로 관리하고, `config.json` 은 `.gitignore` 로 제외해 민감 정보는 별도 관리 |
| **CI 테스트** | 툴·프롬프트에 대한 단위 테스트를 GitHub Actions 등 CI 파이프라인에 포함 |
| **보안** | API 키·시크릿은 환경 변수(`CLAUDE_API_KEY`) 로 주입하고, `manifest.json` 의 `permissions` 로 최소 권한 원칙 적용 |
| **성능 모니터링** | `cache/` 사용량·TTL 로그를 정기적으로 확인하고, `history/` 크기가 급증하면 자동 압축·아카이브 수행 |

## 9. 문제 해결 가이드
| 오류 유형 | 원인 예시 | 해결 방법 |
|---|---|---|
| **JSON 파싱 오류** | `config.json` 의 문법 오류 | `jq . ~/.claude/config.json` 로 검증 후 수정 |
| **툴 로드 실패** | `manifest.json` 의 `entry_point` 경로 오류 또는 권한 부족 | 파일 경로와 실행 권한(`chmod +x`) 확인 |
| **캐시 충돌** | 동일 키에 다른 내용 저장 | 캐시 키 생성 규칙을 일관되게 정의하고, 필요 시 `cache/` 전체 삭제 후 재시작 |
| **히스토리 손실** | 디스크 용량 부족 | `history/` 디렉터리 용량 모니터링 및 오래된 세션 압축 |

- **로그 위치**: `~/.claude/logs/` (존재 여부는 버전에 따라 다름) – 로그 파일에 오류 스택이 기록됩니다.  
- **복구 절차**: `~/.claude/backup/` 에 사전 백업을 두고, 문제가 발생하면 해당 디렉터리를 복원합니다. (백업 자동화 스크립트는 **추가 조사가 필요합니다**.)

## 10. 고급 활용 및 커스터마이징
- **다중 모델·툴 체인**: `config.json` 의 `model` 과 `tools` 배열을 조합해, 예를 들어 `code_interpreter` → `file_search` 순서로 파이프라인을 구성할 수 있습니다. (구체적인 체인 정의 방법은 **추가 조사가 필요합니다**.)  
- **동적 프롬프트 생성**: 쉘·Python 스크립트에서 템플릿 파일을 읽고 `{{variable}}` 를 치환한 뒤 `claude run` 명령에 파이프라인 형태로 전달.  
- **플러그인 API**: `handler.*` 는 표준 입력·출력(예: JSON) 형태로 Claude 와 통신하도록 설계되며, 자세한 인터페이스 사양은 Anthropic 공식 문서([Anthropic Docs](https://docs.anthropic.com))를 참고.  
- **컨테이너 배포**: Docker 이미지에 `~/.claude` 를 볼륨 마운트하고, 시작 스크립트에서 `CLAUDE_HOME=/app/.claude` 로 환경 변수를 지정하면 동일한 설정을 여러 인스턴스에서 재사용 가능. (구체적인 Dockerfile 예시는 **추가 조사가 필요합니다**.)

## 11. 보안 및 접근 제어
- **디렉터리·파일 권한**: `chmod 700 ~/.claude` 로 전체 디렉터리 접근을 제한하고, `chmod 600 ~/.claude/config.json` 로 설정 파일을 보호합니다.  
- **manifest.json 권한 필드**: `permissions` 배열에 선언된 권한(`read_files`, `write_files` 등)만 실제 OS 권한과 매핑해 최소 권한 원칙을 적용합니다.  
- **API 키 관리**: `CLAUDE_API_KEY` 와 같은 시크릿은 `.env` 파일에 저장하고, `.gitignore` 로 제외합니다.  
- **감사 로그**: 툴 실행·프롬프트 호출 시 `~/.claude/logs/` 에 타임스탬프·사용자·툴 이름·결과 요약을 기록하도록 설정(구현 여부는 **추가 조사가 필요합니다**).  

## 12. 요약 및 다음 단계
- **핵심 포인트**  
  - `.claude/` 는 Claude Code 의 설정·플러그인·템플릿·히스토리·캐시를 한 곳에 모은 **생산성 레이어**이다.  
  - `config.json` 은 모델·파라미터·툴·시스템 프롬프트를 정의하는 중심 파일이며, JSON 형식 검증이 필수다.  
  - `tools/` 와 `prompts/` 를 활용해 **맞춤형 워크플로** 를 구축하고, `history/` 와 `cache/` 로 컨텍스트와 성능을 최적화한다.  
- **초기 설정 체크리스트**  
  1. `~/.claude/` 디렉터리 생성 및 권한 설정  
  2. `config.json` 에 사용 모델·파라미터·툴 지정  
  3. 기본 툴(`code_interpreter`, `file_search`) 및 샘플 프롬프트 배치  
  4. 로그·백업·캐시 정리 스크립트 준비  
- **추가 학습 자료**  
  - Anthropic 공식 문서: https://docs.anthropic.com  
  - `.claude` 구조에 대한 커뮤니티 토론: Hacker News (점수 359) [출처]  
- **커뮤니티 참여**  
  - GitHub Discussions, Reddit r/ClaudeAI, 혹은 공식 Discord 채널에서 설정 팁·플러그인 공유 가능  

---