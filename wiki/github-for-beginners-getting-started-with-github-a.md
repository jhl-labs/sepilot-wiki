---
title: GitHub for Beginners – Getting Started with GitHub Actions
author: SEPilot AI
status: published
tags: [GitHub, Actions, CI/CD, 초보자, 자동화]
---

## 소개
이 문서는 **GitHub 초보자**를 대상으로 GitHub Actions를 처음 설정하고 활용하는 방법을 단계별로 안내합니다.  
GitHub Actions는 **CI/CD**와 다양한 자동화 작업을 GitHub 레포지토리 안에서 바로 실행할 수 있게 해 주는 플랫폼으로, 현대 소프트웨어 개발 흐름에서 핵심적인 역할을 합니다 [GitHub Blog](https://github.blog/developer-skills/github/github-for-beginners-getting-started-with-github-actions/)에 따르면.

## 사전 준비
| 항목 | 내용 | 참고 |
|------|------|------|
| GitHub 계정 | 아직 없을 경우 https://github.com 에서 무료 계정 생성 |  |
| 레포지토리 | 새 레포지토리 생성(공개/비공개 선택) |  |
| Git 기본 사용법 | `git clone`, `git add`, `git commit`, `git push` 등 | GitHub Docs Quickstart [링크](https://docs.github.com/ko/actions/get-started/quickstart) |
| 편집기 | 브라우저 내 편집기, VS Code(확장 GitHub Pull Requests and Issues) 등 |  |

## GitHub Actions 핵심 개념
- **Workflow** – 자동화 프로세스 전체 흐름을 정의하는 YAML 파일.  
- **Event** – 워크플로우를 트리거하는 GitHub 활동(예: `push`, `pull_request`, `schedule`).  
- **Job** – 동일한 러너에서 순차 혹은 병렬로 실행되는 단계 집합.  
- **Step** – 개별 쉘 명령 또는 재사용 가능한 **Action**.  
- **Runner** – 작업을 실행하는 가상 머신. GitHub이 제공하는 **hosted runner**와 사용자가 직접 운영하는 **self‑hosted runner**가 있음 [GitHub Docs](https://docs.github.com/en/actions/get-started/understand-github-actions).  
- **Action** – Marketplace에 공개된 재사용 가능한 작업 단위. 필요에 따라 직접 만들 수도 있다.

## 첫 번째 워크플로우 만들기
1. 레포지토리 루트에 `.github/workflows/` 디렉터리를 만든다.  
2. 디렉터리 안에 `ci.yml` 같은 파일을 생성하고 아래와 같은 기본 구조를 입력한다. (코드 블록 없이 들여쓰기만 사용)

   name: CI  
   on: [push]  
   jobs:  
     build:  
       runs-on: ubuntu-latest  
       steps:  
         - uses: actions/checkout@v3  
         - name: Set up Node.js  
           uses: actions/setup-node@v3  
           with:  
             node-version: '20'  
         - name: Install dependencies  
           run: npm install  
         - name: Run tests  
           run: npm test  

3. GitHub 웹 UI → **Actions** 탭 → **New workflow** → **Set up a workflow yourself** 를 선택해 템플릿을 편집해도 된다 [GitHub Docs Quickstart](https://docs.github.com/en/actions/get-started/quickstart).  
4. 파일을 커밋하고 푸시하면 지정한 이벤트(`push`)에 따라 워크플로우가 자동 실행된다.

## 워크플로우 상세 구성
- **이벤트 정의 예시**  
  `on:` 아래에 여러 이벤트를 조합할 수 있다.  
  ```
  on:
    push:
      branches: [ main ]
    pull_request:
      types: [ opened, synchronize ]
    schedule:
      - cron: '0 0 * * 0'   # 매주 일요일 00:00 UTC
  ```
- **Job 설계**  
  - `runs-on:` 로 OS 선택 (`ubuntu-latest`, `windows-latest`, `macos-latest`).  
  - `needs:` 로 이전 Job 의 의존성을 선언해 순차 실행을 제어한다.  
- **Step 활용**  
  - `run:` 은 직접 쉘 명령을 적는다.  
  - `uses:` 는 Marketplace 액션을 호출한다. 예: `actions/cache@v3`.  
- **환경 변수 & 시크릿**  
  - `env:` 로 워크플로우 수준 변수 선언.  
  - `secrets.` 로 저장된 시크릿에 접근 (`${{ secrets.MY_TOKEN }}`). 시크릿은 레포지토리 → Settings → Secrets에서 관리한다 [Docs](https://docs.github.com/en/actions/security-guides/encrypted-secrets).

## 실행 및 모니터링
- **Actions 탭**에서 실행 기록을 확인하고, 각 Job·Step 별 로그를 실시간으로 볼 수 있다.  
- 실패한 단계는 로그를 통해 원인 파악 후 **Re-run jobs** 버튼으로 재시도 가능.  
- 필요 시 **Cancel workflow** 로 진행 중인 워크플로우를 중단한다.

## 대표적인 활용 사례
| 사례 | 설명 |
|------|------|
| CI – 코드 빌드·테스트 | 푸시·PR 시 자동으로 빌드하고 테스트 실행 |
| CD – 배포 파이프라인 | 성공적인 CI 후 자동으로 스테이징/프로덕션에 배포 |
| 린트·보안 스캔 | `eslint`, `dependabot`, `trivy` 등 액션을 이용해 코드 품질·보안 검증 |
| 자동 라벨링·이슈 관리 | `actions/labeler` 로 PR/Issue 라벨 자동 적용 |
| 정기 보고서 | `schedule` 이벤트와 `actions/upload-artifact` 로 테스트 커버리지 보고서 생성 |

## 베스트 프랙티스
- **YAML 검증** – GitHub에서 제공하는 **workflow syntax check**와 `actionlint` 같은 정적 분석 도구 활용.  
- **재사용 가능한 워크플로우** – `workflow_call` 로 다른 레포지토리·워크플로우에서 호출 가능.  
- **시크릿 최소 권한** – 토큰·키는 필요한 권한만 부여하고, 레포지토리 → Settings → Actions → General 에서 권한 제한.  
- **버전 관리** – 액션은 `@v3` 등 고정된 버전을 명시해 의도치 않은 업데이트 방지.  
- **문서화** – 워크플로우 파일 상단에 목적·입력·출력 등을 주석으로 기록.

## 트러블슈팅 가이드
| 오류 유형 | 원인 | 해결 팁 |
|-----------|------|----------|
| 워크플로우가 트리거되지 않음 | `on:` 설정 오류, 브랜치 이름 불일치 | 이벤트 정의와 브랜치 패턴을 정확히 확인 |
| Runner 오류 (e.g., `Process completed with exit code 1`) | 쉘 명령 실패, 의존성 누락 | 로그에서 `run:` 단계 출력 확인, 필요한 패키지 설치 |
| 시크릿 값이 비어 있음 | 시크릿 미설정 혹은 오타 | Settings → Secrets 에 시크릿 추가, `${{ secrets.NAME }}` 표기 확인 |
| 액션 버전 충돌 | 최신 액션이 기존 워크플로와 호환 안 됨 | 액션 버전을 고정하거나 `@vX` 로 다운그레이드 |

커뮤니티 포럼, GitHub Support, 그리고 공식 Docs의 **[Troubleshooting](https://docs.github.com/en/actions/learn-github-actions/troubleshooting)** 페이지를 활용하면 추가적인 해결책을 찾을 수 있다.

## 추가 학습 자료
- **공식 Docs** – Quickstart, Understanding GitHub Actions, Workflow syntax [링크](https://docs.github.com/en/actions)  
- **GitHub Blog 시리즈** – “GitHub for Beginners” 영상·블로그 [GitHub Blog](https://github.blog/developer-skills/github/github-for-beginners-getting-started-with-github-actions/)  
- **Marketplace 인기 액션** – `actions/checkout`, `actions/setup-node`, `actions/cache` 등  
- **커뮤니티 예제** – GitHub에서 “awesome-github-actions” 레포지토리 검색  

## FAQ
**Q1. Workflow가 트리거되지 않을 때 확인할 점**  
- `on:` 정의와 브랜치/태그 패턴이 맞는지, 파일이 `.github/workflows/` 아래에 있는지 확인한다.

**Q2. Self‑hosted Runner를 설정하는 방법**  
- 레포지토리 → Settings → Actions → Runners에서 “Add runner” 를 선택하고, 제공되는 스크립트를 서버에 실행한다 [Docs](https://docs.github.com/en/actions/hosting-your-own-runners).

**Q3. 시크릿을 안전하게 관리하는 방법**  
- 레포지토리 → Settings → Secrets에만 저장하고, 워크플로우에서는 `${{ secrets.NAME }}` 로만 접근한다. 필요 시 조직 → Secrets 로 이동해 범위 확대도 가능하다.

---

*이 문서는 GitHub Blog와 공식 Docs를 기반으로 작성되었습니다. 추가적인 내용이 필요하면 관련 공식 자료를 참고하거나 커뮤니티에 질문해 주세요.*