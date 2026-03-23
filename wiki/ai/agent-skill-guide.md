---
title: AI 코딩 어시스턴트를 위한 에이전트 스킬 작성 가이드
author: SEPilot AI
status: published
tags: [AI, 코딩 어시스턴트, 에이전트 스킬, DRY, 토큰 관리]
redirect_from:
  - ai
---

## 1. 서론
이 문서는 **GitHub Copilot**과 **Claude Code**와 같은 AI 코딩 어시스턴트를 효율적으로 활용하기 위해 **에이전트 스킬**을 설계·작성·운용하는 방법을 단계별로 안내합니다.  

스킬을 도입하면  

- 프로젝트‑특화 규칙·코딩 표준·불변성 정책을 매 세션마다 재전달할 필요가 없어 **중복을 최소화(DRY)**  
- 토큰 사용량을 절감해 비용 효율성을 높이고  
- 팀 전체가 일관된 개발 표준을 공유할 수 있습니다.  

### 대상 독자
- 개인 개발자 (Copilot·Claude Code 사용자)  
- 팀 리더·프로젝트 매니저 (스킬 기반 표준화 필요)  
- AI 어시스턴트 운영자 (스킬 배포·버전 관리 담당)  

문서는 **개념·설계·구현·테스트·배포·운영** 순으로 구성됩니다.

## 2. 사전 준비
### 지원되는 코딩 어시스턴트 개요

| 어시스턴트 | 스킬 로드 방식 | 기본 지시 파일 |
|------------|----------------|----------------|
| GitHub Copilot | `.github/instructions.md` 자동 로드 | `instructions.md` (전역) |
| Claude Code | `/skill-name` 호출 시 로드 가능 (비공식) | `CLAUDE.md` (전역) |

> **주의**: 현재 Copilot은 `skill 파일`이라는 개념을 공식적으로 지원하지 않습니다. 본 가이드에서 사용하는 “스킬”은 **사용자 정의 프롬프트·스크립트 집합**을 의미하며, 실제 적용 시에는 `.github/instructions.md`에 해당 내용을 삽입하거나, Claude Code에서는 `/skill-name` 형태로 호출하는 방식을 가정합니다[[GitHub Copilot Docs](https://docs.github.com/copilot)].

### 필수 도구 및 환경
- **Git** – 버전 관리  
- **VS Code** – `markdownlint` 플러그인 권장  
- **CLI** (예: `node`, `gradle`) – 스킬 내부 스크립트 실행에 필요  
- **토큰 모니터링 툴** – OpenAI Tokenizer, Claude Token Viewer 등  

### 기본 용어 정의
- **Skill**: 특정 작업을 수행하기 위한 지시·스크립트·리소스 집합 (`SKILL.md` 포함)  
- **전역 지시 파일**: 어시스턴트가 자동으로 읽는 파일 (`instructions.md`, `CLAUDE.md`)  
- **프런트‑머터**: `SKILL.md` 상단에 위치하는 메타데이터 블록 (name, description, version 등)  

## 3. 에이전트 스킬이란?
- **역할**: 어시스턴트에게 “어떤 상황에서 어떻게 행동해야 하는가”를 명시해, 컨텍스트를 **필요 최소 토큰**만 포함하도록 함.  
- **장점**  
  - 프로젝트‑특화 규칙을 재사용 가능하게 함  
  - 자동 로드 시 불필요한 컨텍스트 오염 방지  
  - 팀원 간 지식 공유와 표준화 촉진  

### 기본 구조
```
skill-name/
├─ SKILL.md        ← 프런트‑머터 + 명령·스크립트 정의
├─ scripts/        ← 실행 파일·쉘 스크립트
├─ templates/      ← 코드·설정 템플릿
└─ README.md       ← 사용법·버전 기록
```

### 로드 방식
- **자동 로드** (Claude Code 가정) : 프로젝트 루트에 스킬 폴더가 있으면 프런트‑머터를 인식하고 자동으로 로드합니다.  
- **수동 호출** : `/skill-name` 형태로 명시적으로 호출하거나, Copilot은 `.github/instructions.md`에 포함된 지시를 통해 스킬을 활용합니다.  

## 4. 설계 원칙
### DRY 적용 방안
- **프로젝트 분석·코딩 규칙·불변성 정책**을 하나의 스킬에 집중시켜 매 세션마다 재전달하지 않음.  
- `templates/` 디렉터리를 활용해 **공통 함수·템플릿**을 재사용합니다.  

### 토큰 효율성
- 컨텍스트 토큰은 비용과 직결되는 핵심 자원이며, 파일이 클수록 토큰 소모가 증가합니다.  
- 스킬 파일은 **5 KB 이하** 크기로 유지하고, 필요 시 리팩터링하여 토큰을 절감합니다.  

### 가독성·유지보수성
- 파일·디렉터리·함수에 **명확한 네이밍** 적용  
- 프런트‑머터에 **버전·작성자·태그**를 명시해 추적성을 확보  

### 보안·프라이버시
- API 키·비밀 정보는 **환경 변수** 또는 **시크릿 매니저**에 저장하고, 스킬 파일에 직접 포함하지 않음  
- 외부 스크립트 실행은 **샌드박스**(Docker 등)에서 수행하도록 설계  

## 5. 파일 및 폴더 구조
```
my-skill/
├─ SKILL.md          ← 메타데이터 + 명령 정의
├─ scripts/
│  └─ build.sh       ← 예시 쉘 스크립트
├─ templates/
│  └─ kotlin_class.kt
├─ README.md
└─ LICENSE
```

- **필수 파일**: `SKILL.md`, `README.md`, `LICENSE` (오픈소스 시)  
- **파일 크기 가이드라인**: 각 마크다운 파일은 **5 KB 이하** 권장 (큰 파일은 토큰 낭비)  

## 6. 프런트‑머터 정의
프런트‑머터는 YAML 형식으로 작성하며, 어시스턴트가 자동으로 파싱합니다.

| 필드 | 설명 | 예시 |
|------|------|------|
| `name` | 스킬 식별자 (소문자, 하이픈 사용 가능) | `kotlin` |
| `description` | 스킬 사용 상황을 상세히 기술 (마크다운 허용) | `Use this skill when working with Kotlin code…` |
| `version` | SemVer 형식 | `1.0.0` |
| `author` | 작성자·연락처 | `Jane Doe <jane@example.com>` |
| `tags` | 검색·분류용 키워드 배열 | `["kotlin","gradle","testing"]` |

> Claude Code는 이 프런트‑머터를 **도구 정의**로 변환해 자동 로드 판단에 활용합니다(비공식 가정).  

## 7. 스킬 내용 작성
### 명령·스크립트 작성 규칙
- **단일 책임**: 하나의 스크립트는 한 작업만 수행하도록 설계  
- **입출력 표준화**: JSON 형태의 입력·출력 스키마 정의 (예: `{"path":"src/main.kt","action":"format"}`)  
- **오류 처리**: 표준 오류 스트림에 명확한 메시지 출력, 비정상 종료 시 **exit code** 1 반환  

### 언어·프레임워크 별 템플릿 활용
- `templates/kotlin_class.kt`에 **클래스·함수** 기본 구조 제공  
- 스크립트는 `templates/`를 **템플릿 엔진**(예: `mustache`, `handlebars`)으로 렌더링 후 실행  

### 로그 출력 방안
- `stdout`에 **작업 요약**(성공/실패) 출력  
- `stderr`에 **디버그·스택 트레이스** 기록  

## 8. 토큰 관리 전략
1. **컨텍스트 토큰 계산**  
   - 파일 길이(바이트) → UTF‑8 토큰 변환(대략 4 바이트당 1 토큰) → 전체 스킬 토큰 합산  

2. **불필요한 정보 제거**  
   - 주석·예시 코드는 최소화하고, 필요 시 별도 `docs/` 디렉터리에 보관  

3. **동적 로딩·조건부 포함**  
   - 큰 템플릿은 **필요 시**(`--template=xyz`)만 로드하도록 설계  

> 토큰은 **한정된 비용 자원**이며, 효율적인 사용이 개발 비용 절감에 직접 연결됩니다.  

## 9. Copilot·Claude와의 연동
### Copilot (비공식 가정)
- `.github/instructions.md`에 **전역 지시**를 작성하고, 스킬은 `skill-name/` 디렉터리 아래에 배치  
- Copilot은 `instructions.md`를 자동 읽어 전역 컨텍스트에 포함하므로, 스킬은 **별도 호출**(`/skill-name`)을 통해 사용  

### Claude (비공식 가정)
- 스킬 폴더를 프로젝트 루트에 두면 Claude가 **프런트‑머터**를 인식하고 자동 로드 가능  
- 직접 호출은 `/skill-name` 형태로 입력 가능  

### 충돌 방지
- 스킬 **네임스페이스**를 고유하게 (`myteam-kotlin`) 지정  
- 동일 이름 스킬이 존재할 경우 **버전 태그**(`kotlin@1.2.0`)를 명시  

## 10. 테스트 및 검증
### 로컬 시뮬레이션 도구
- **Mock Agent Runner**(커뮤니티 제공) – 스킬을 로컬에서 호출해 입력·출력 검증  
- **VS Code Tasks** – `tasks.json`에 스킬 실행 명령 등록  

### 단위·통합 테스트 설계
- **단위 테스트**: 각 스크립트·템플릿에 대해 입력/출력 JSON 검증 (예: `jq` 사용)  
- **통합 테스트**: 전체 스킬 호출 흐름을 시뮬레이션하고, 토큰 사용량을 로그에 기록  

### 체크리스트
- [ ] 프런트‑머터 파싱 성공 여부  
- [ ] 스크립트 실행 시 **exit code 0** 반환  
- [ ] 예상 토큰 사용량 ≤ 5 KB 파일 기준  

## 11. 배포·버전 관리
1. **Git 레포지토리**에 `skill-name/` 디렉터리 전체를 커밋  
2. **버전 태깅**: `v1.0.0`, `v1.1.0` 등 SemVer 사용  
3. **CI/CD**: GitHub Actions 워크플로우에서  
   - `lint` (markdownlint)  
   - `test` (스크립트 실행)  
   - `release` (GitHub Release 생성, `.github/instructions.md` 자동 업데이트)  

### GitHub Actions 예시 (yaml)

```yaml
name: Skill CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Set up Node.js (for lint)
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install markdownlint
        run: npm install -g markdownlint-cli

      - name: Lint markdown files
        run: markdownlint "**/*.md"

      - name: Run skill tests
        run: |
          chmod +x skill/kotlin/scripts/format.sh
          ./skill/kotlin/scripts/format.sh ./sample.kt

      - name: Create GitHub Release
        if: github.ref == 'refs/heads/main'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ github.run_number }}
          name: Release v${{ github.run_number }}
          body: Automated release from CI
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Update .github/instructions.md
        if: github.ref == 'refs/heads/main'
        run: |
          echo "## Updated skill paths" >> .github/instructions.md
          echo "- skill/kotlin" >> .github/instructions.md
```

> Copilot은 `.github/instructions.md`를 자동 읽으므로, 배포 시 해당 파일에 최신 스킬 경로를 반영해야 합니다.

## 12. 유지보수·리팩터링
- **정기 리뷰**(월 1회): 토큰 사용량·파일 크기·테스트 결과 점검  
- **파일 크기 초과** 시  
  1. 공통 로직을 `scripts/common/`로 이동  
  2. 템플릿을 `templates/`에 분리  
  3. 프런트‑머터에 **추가 설명**을 `docs/`로 옮겨 토큰 절감  

- **메타데이터 업데이트**: 버전·작성자·변경 로그를 `SKILL.md`에 즉시 반영  

## 13. 보안·프라이버시 고려사항
- **API 키·시크릿**: `.env` 파일에 저장하고 `.gitignore`에 추가  
- **샌드박스 실행**: Docker 컨테이너(`docker run --rm -v $(pwd):/work`) 내에서 스크립트 실행  
- **민감 데이터 마스킹**: 로그에 `***` 로 대체하고, 필요 시 **로그 레벨**을 `INFO`/`DEBUG` 로 구분  

## 14. 흔히 발생하는 문제와 해결책
| 문제 | 원인 | 해결책 |
|------|------|--------|
| 컨텍스트 토큰 초과 | 파일이 너무 크거나 불필요한 주석 포함 | 파일을 5 KB 이하로 리팩터링, `docs/`로 이동 |
| Skill 자동 로드 실패 | 프런트‑머터 형식 오류 | YAML 구문 검증(`yamllint`) 후 재배포 |
| 네임스페이스 충돌 | 동일 이름 스킬이 여러 개 존재 | 고유 접두사(`team-`)와 버전 태그 사용 |

## 15. 실전 예제: Kotlin Skill 만들기
### 1) 프로젝트 초기 설정
```bash
git clone https://github.com/yourorg/kotlin-skill.git
cd kotlin-skill
mkdir -p skill/kotlin/{scripts,templates}
```

### 2) 프런트‑머터 작성 (`skill/kotlin/SKILL.md`)
```markdown
---
name: kotlin
description: |
  Use this skill when working with Kotlin code in any capacity:
  - Reading, writing, editing, or reviewing Kotlin files (*.kt, *.kts)
  - Running Gradle tasks for Kotlin modules
  - Writing or debugging Kotlin/JS code that targets Node.js
  - Working with external JavaScript libraries from Kotlin
  - Writing tests for Kotlin code (@Test)
version: 1.0.0
author: Jane Doe <jane@example.com>
tags: ["kotlin","gradle","testing"]
---
```

### 3) 주요 스크립트 (`scripts/format.sh`)
```bash
#!/usr/bin/env bash
# 입력: 파일 경로
# 출력: ktlint 적용 결과
FILE=$1
if [[ -z "$FILE" ]]; then
  echo "Error: 파일 경로가 필요합니다" >&2
  exit 1
fi
ktlint -F "$FILE"
```

### 4) 템플릿 (`templates/kotlin_class.kt`)
```kotlin
package com.example

class {{ClassName}} {
    fun hello() = println("Hello, {{ClassName}}!")
}
```

### 5) 테스트·배포 흐름
1. 로컬에서 `scripts/format.sh src/main/kotlin/App.kt` 실행 → 정상 동작 확인  
2. `git add . && git commit -m "Add Kotlin skill v1.0.0"`  
3. GitHub Actions가 자동으로 **lint → test → release** 수행  

## 16. 체크리스트
- [ ] 프런트‑머터에 `name, description, version, author, tags` 포함 여부  
- [ ] 각 마크다운 파일 크기 ≤ 5 KB  
- [ ] 토큰 사용량 로그(`token_usage.txt`) 존재 여부  
- [ ] 단위·통합 테스트 모두 통과  
- [ ] CI/CD 파이프라인에 자동 배포 단계 포함  

## 17. 참고 자료·링크
- **GitHub Copilot 공식 문서** – `.github/instructions.md` 자동 로드 설명  
- **Claude Code 문서** – 스킬 호출 방식(`/skill-name`) (비공식)  
- **Agent Skills: AI 에이전트를 위한 가이드** – 스킬 개념 정의[[Agent Skills: AI 에이전트를 위한 가이드](https://x.com/lucas_flatwhite/status/2012717341222850647)]  
- **Reddit 토론** – 코딩 어시스턴트와 스킬 활용 사례[[Reddit](https://www.reddit.com/r/SideProject/comments/1q8ofek/agent_skills_generator_teach_your_ai_coding/)]  
- **Token Viewer 도구** – OpenAI Tokenizer, Claude Token Viewer (공식 제공)  

*본 가이드는 현재 공개된 자료를 기반으로 작성되었으며, 향후 어시스턴트 업데이트에 따라 내용이 변경될 수 있습니다.*