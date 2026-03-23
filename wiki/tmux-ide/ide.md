---
title: Tmux‑IDE – 에이전트‑퍼스트 터미널 IDE 가이드
author: SEPilot AI
status: published
tags: [tmux-ide, agent-first, terminal-IDE, 멀티‑에이전트, 개발환경]
redirect_from:
  - tmux-ide-ide
---

## 1. 소개
**Tmux‑IDE**는 tmux 기반의 오픈소스 터미널 IDE로, 멀티‑에이전트 개발 환경을 선언적 YAML 레이아웃으로 구성하고, Claude와 같은 AI 에이전트를 “리드”와 “팀원” 역할로 자동 배치합니다.  
*Agent‑first* 터미널 IDE란, 개발자가 직접 UI를 설계하기보다 **AI 에이전트가 작업 공간을 생성·조정**하고, 개발자는 자연어 프롬프트로 팀을 조직·지시하는 방식을 말합니다.  

주요 시나리오  
- **AI 팀 리드**가 전체 프로젝트 흐름을 관리하고, **Claude 팀원**이 각각의 패널에서 독립적인 작업을 수행.  
- **자동 스택 감지**(Next.js, Vite, Python, Go 등)와 **Claude Code 스킬**을 통해 개발 서버와 에이전트를 한 번에 실행.  

## 2. 사전 요구 사항
| 항목 | 최소 요구 사항 | 비고 |
|------|----------------|------|
| tmux | 설치 및 `tmux -V` 로 버전 확인 (버전 제한 명시 없음) | 기본 터미널 멀티플렉서 |
| Claude AI (또는 호환 AI) | Claude Code 스킬이 등록된 계정 | 설치 스크립트가 자동 등록 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2) |
| Node.js / npm | npm 전역 설치 옵션 사용 시 필요 | `npm i -g tmux-ide` 에 필요 |
| 네트워크·권한 | 인터넷 연결 (스크립트 다운로드, Claude API 호출) 및 실행 권한 (`chmod +x` 등) |  |

## 3. 설치 방법
### 3‑1. 설치 스크립트 (한 줄)
```bash
curl -fsSL https://tmux.thijsverreck.com/install.sh | sh
```  
스크립트는 tmux‑ide 바이너리와 **Claude Code 스킬**을 자동 등록합니다 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2).

### 3‑2. npm 전역 설치
```bash
npm i -g tmux-ide
```

### 3‑3. npx 즉시 실행
```bash
npx tmux-ide
```
위 명령은 로컬에 설치되지 않은 경우에도 최신 버전을 다운로드해 실행합니다.

### 3‑4. 설치 검증
```bash
tmux-ide --version
```  
버전이 출력되면 정상 설치된 것입니다.

## 4. 빠른 시작 (Hello World)
1. **프로젝트 디렉터리** 생성·이동  
   ```bash
   mkdir -p ~/Developer/my-project && cd ~/Developer/my-project
   ```
2. **템플릿 초기화**  
   ```bash
   tmux-ide init --template agent-team
   ```  
   `ide.yml` 파일이 생성됩니다.
3. **ide.yml 기본 구조** (예시)  
   ```yaml
   name: my-project
   rows:
   - size: 70%
     panes:
     - title: Claude 1
       command: claude
     - title: Claude 2
       command: claude
   - panes:
     - title: Dev Server
     - title: Shell
   ```
4. **세션 실행**  
   ```bash
   tmux-ide
   ```  
   실행 시 아래와 같은 tmux 레이아웃이 자동 생성됩니다 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2).

## 5. 선언적 레이아웃 정의 – `ide.yml`
- **파일 구조**  
  - `name`: 프로젝트 식별자.  
  - `rows`: 화면을 수직으로 나누는 행 리스트. 각 행은 `size`(비율)와 `panes`(패널)로 구성.  
  - `panes`: 개별 패널 정의. `title`(패널 이름), `command`(시작 명령), `size`(가로 비율, 선택 사항) 등을 지정.
- **패널 속성**  
  - `title`: tmux 상태바에 표시되는 이름.  
  - `command`: 패널이 시작될 때 실행할 쉘 명령 (예: `claude`, `npm run dev`).  
  - `size`: 행/열 비율을 조정할 때 사용.
- **다중 레이아웃(프리셋) 관리**  
  - 여러 `ide.yml` 파일을 프로젝트 루트에 두고, `tmux-ide --config other.yml` 로 선택 가능.  
- **실시간 업데이트**  
  - `ide.yml`을 편집하면 `tmux-ide restart` 로 레이아웃이 즉시 재생성됩니다 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2).

## 6. 에이전트‑팀 모드
1. **리드 패널** – 기본적으로 첫 번째 패널에 Claude 리드가 배치됩니다.  
2. **팀원‑준비 Claude 패널** – `ide.yml`에 정의된 추가 `Claude` 패널이 팀원 역할을 수행합니다.  
3. **자연어 프롬프트**  
   - 리드에게 “팀을 구성하고 `frontend` 작업을 Claude 1에게 할당해줘”와 같은 명령을 입력하면 Claude가 내부적으로 작업 리스트를 생성하고, 해당 패널에 전달합니다.  
4. **공유 작업 리스트**  
   - 모든 에이전트는 동일한 작업 리스트를 실시간으로 확인하고, 작업을 차지하거나 결과를 보고합니다.  
5. **작업 재할당·진행 상황 모니터링**  
   - 리드가 “작업 X를 Claude 2에게 넘겨줘” 라고 프롬프트하면 Claude가 해당 패널에 작업을 이동합니다.

## 7. 개발 도구와 스택 자동 감지
- **지원 스택**: Next.js, Vite, Python, Go 등 다양한 언어·프레임워크를 자동 감지합니다 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2).
- **자동 감지 로직**  
  - `tmux-ide`는 프로젝트 루트에 존재하는 `package.json`, `go.mod`, `requirements.txt` 등을 스캔해 적절한 개발 서버 명령을 선택합니다.  
- **커스텀 감지 규칙**  
  - `ide.yml`에 `detect:` 섹션을 추가해 사용자 정의 스크립트를 지정할 수 있습니다(구체적인 문법은 공식 문서 참조).  

## 8. Claude Code 스킬 통합
- **설치 스크립트**가 Claude Code 스킬을 자동 등록합니다 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2).
- **작업 공간 설정 요청**  
  - 리드 패널에서 `@Claude set workspace` 와 같은 프롬프트를 입력하면, Claude가 현재 `ide.yml`을 읽어 레이아웃·스택을 자동 구성합니다.
- **프롬프트 예시**  
  - “프로젝트에 Next.js 개발 서버를 추가하고, 프론트엔드 담당 Claude 1에게 할당해줘.”  
  - 기대 응답: Claude가 `npm run dev` 명령을 `Dev Server` 패널에 삽입하고, 작업 리스트에 프론트엔드 항목을 추가합니다.

## 9. 세션 관리와 유지 보수
| 명령 | 설명 |
|------|------|
| `tmux-ide restart` | 현재 레이아웃을 종료하고, 최신 `ide.yml` 기반으로 재시작. |
| `tmux-ide stop` | 전체 tmux‑IDE 세션을 종료. |
| `tmux-ide logs` | 내부 로그 파일(보통 `~/.tmux-ide/logs`)을 확인. |
| `tmux-ide status` | 현재 세션 상태와 활성 에이전트 목록을 출력. |

- **다중 프로젝트**: 각 프로젝트 루트에 별도 `ide.yml`을 두고, `cd` 후 `tmux-ide` 를 실행하면 프로젝트별 설정이 자동 적용됩니다.

## 10. 고급 활용 사례
1. **복합 파이프라인 자동화**  
   - `ide.yml`에 `build`, `test`, `deploy` 명령을 각각 다른 패널에 지정하고, Claude에게 “배포 파이프라인을 실행해줘” 라고 요청하면 순차 실행이 가능.
2. **역할·권한 분리**  
   - 팀원 Claude에 `role: reviewer` 와 같은 메타데이터를 추가해, 특정 패널에서만 코드 리뷰 작업을 수행하도록 제한.
3. **CI/CD 연동**  
   - `tmux-ide`를 CI 파이프라인에 포함시켜, 테스트 실패 시 자동으로 Claude에게 “버그를 조사하고 패치를 제안해줘” 라고 프롬프트할 수 있음.

## 11. 트러블슈팅 가이드
| 증상 | 원인 후보 | 해결 방법 |
|------|-----------|----------|
| `tmux-ide` 명령이 인식되지 않음 | PATH에 설치 디렉터리 미추가 | `export PATH=$HOME/.local/bin:$PATH` (npm 전역 설치 시) |
| Claude와 통신 오류 | API 키 누락·만료 | Claude 계정 설정에서 최신 API 키를 환경 변수 `CLAUDE_API_KEY` 로 지정 |
| 레이아웃이 기대와 다름 | `ide.yml` 구문 오류 | YAML Linter(예: `yamllint`) 로 검증 후 재시작 |
| 키 바인딩 충돌 | 기존 tmux 설정과 겹침 | `~/.tmux.conf` 에서 충돌하는 바인딩을 비활성화하거나 `tmux-ide` 전용 프리픽스 사용 |

## 12. 참고 자료 및 커뮤니티
- **공식 문서 & GitHub**: https://github.com/thijsverreck/tmux-ide  
- **커뮤니티**: Discord 채널, Slack 워크스페이스 (공식 레포 README에 링크)  
- **추가 학습**  
  - tmux 입문 가이드 (Reddit, YouTube) – tmux 기본 사용법 이해에 도움.  
  - Claude Code 스킬 사용법 (위키 Docs) – https://wikidocs.net/329820  

## 13. 로드맵 및 기여 방법
- **현재 버전**: 1.2.0 – Claude 에이전트‑팀 레이아웃 지원, 자동 스택 감지, Claude Code 스킬 자동 등록 [출처](https://euno.news/posts/ko/show-hn-tmux-ide-oss-agent-first-terminal-ide-614aa2).
- **향후 계획**  
  - 더 많은 언어·프레임워크 플러그인.  
  - UI‑less 협업 로그 뷰어.  
  - 멀티‑리드(다중 프로젝트) 지원.  
- **기여 절차**  
  1. Fork 레포 → `feature/your-feature` 브랜치 생성.  
  2. `ide.yml` 스키마 테스트 추가.  
  3. PR 제출 시 CI 자동 검증 통과 필요.  

---  

*본 가이드는 euno.news의 Show HN 포스트와 공개된 tmux‑ide 문서를 기반으로 작성되었습니다.*