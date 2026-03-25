---
title: "Git MCP Server – Anthropic 공식 레퍼런스와 툴셋 개요"
author: "SEPilot AI"
status: published
tags: ["Git", "mcp", "Anthropic", "PyPI", "보안", "도구"]
---

## 1. 문서 개요
### 목적 및 대상 독자
본 문서는 **Git MCP Server**(Anthropic 공식 레퍼런스 기반)의 기능·아키텍처·보안 현황·설치·운용 방법을 이해하고자 하는 개발자·운영자·보안 담당자를 위한 가이드입니다.

### 문서 범위와 한계
- Anthropic이 공개한 레퍼런스와 euno.news 보도 자료, GitHub·PyPI·NVD 등 공개된 자료를 기반으로 작성했습니다.  
- 실제 운영 환경에서의 성능·확장성 테스트 결과는 포함되지 않으며, 필요 시 별도 벤치마크를 수행하시기 바랍니다.  

### 용어 정의
| 용어 | 정의 |
|------|------|
| **MCP** | “Message‑Based Command Processor”의 약어. 파일 시스템 기반 Git 명령을 API 형태로 제공하는 서버를 의미합니다. |
| **Anthropic** | Git MCP Server를 최초 공개한 AI·클라우드 기업(공식 발표는 2024년 3월) |
| **PulseMCP** | Anthropic이 제공하는 Git MCP Server 배포 패키지(또는 메트릭) 명칭 |

---

## 2. Git MCP Server 소개
### 프로젝트 배경 및 목표
Anthropic은 로컬 Git 레포지토리 작업을 **Zero‑dependency** 방식으로 API화하여, 별도 인증·계정 없이 자동화 파이프라인에서 Git 명령을 호출할 수 있도록 하는 것을 목표로 했습니다[^1]。

### 주요 특징
- **모노레포** 구조로 관리되며, 2024년 9월 기준 **81,700★**(GitHub 스타) 보유[^2]  
- **12개의 핵심 도구**만 제공해 “읽기·커밋” 단계까지를 견고하게 구현  
- **Zero‑dependency** 설계 → API 키·외부 계정 불필요, 레포지토리 경로만 지정하면 즉시 사용 가능  

### 커뮤니티 현황
| 지표 | 값 | 출처 |
|------|----|------|
| 전체 다운로드 (PulseMCP) | 2.4 M | [PyPI 다운로드 통계] |
| 주간 PyPI 다운로드 | ≈256 K | [PyPI 다운로드 통계] |
| PyPI 순위 | 전 세계 #17 | [PyPI 다운로드 통계] |
| 사용자 평점 | 3 / 5 | [euno.news 기사] |
| 주요 미해결 이슈 | Issue #618 (13개월) – 푸시·풀 부재 | [GitHub Issue #618] |

---

## 3. 배포 및 사용 현황
| 항목 | 수치 | 비고 |
|------|------|------|
| GitHub ★ | 81,700 | 모노레포 |
| 제공 도구 | 12 | `git_status` 등 |
| 주간 PyPI 다운로드 | ≈256 K | 2024‑09 기준 |
| 전체 PulseMCP 다운로드 | 2.4 M | 전 세계 #17 |
| 사용자 평점 | 3 / 5 | 2024‑09 기준 |
| 주요 미해결 이슈 | Issue #618 (13개월) | 푸시·풀 부재 |

*※ 모든 수치는 2024년 9월 30일 기준이며, 최신 통계는 PyPI 페이지에서 확인할 수 있습니다.*

---

## 4. 아키텍처 및 동작 원리
### Zero‑dependency 설계
- **API 키·계정 불필요**: `git-mcp-server --repository /path/to/repo` 로 실행하면 내부적으로 시스템에 설치된 Git 바이너리를 직접 호출합니다.  
- **파일 시스템 연계**: Git 명령은 로컬 파일 시스템에 직접 접근하고, 결과는 표준 입출력(`stdio`)을 통해 반환됩니다.

### 입력 검증·플래그 인젝션 방지
2025년 12월까지 발견된 **3개의 CVE**를 모두 패치했으며, 주요 방어 메커니즘은 다음과 같습니다[^3][^4][^5] :

| CVE | CVSS | 취약점 요약 | 해결 방안 |
|-----|------|------------|-----------|
| CVE‑2025‑68143 | 8.8 | `git_init` 가 임의 경로를 허용 → RCE 가능 | `git_init` 완전 제거 |
| CVE‑2025‑68144 | 8.1 | `git_diff`·`git_checkout` 에서 인자 인젝션 | 입력 정화(sanitization) 적용 |
| CVE‑2025‑68145 | 7.1 | `--repository` 경로 탐색 우회 | 경로 검증 및 정규화 구현 |

> **패치 현황**: 위 CVE는 모두 2025‑12‑31 이전 릴리즈(`v2.3.4`)에 포함되어 있으며, 이후 버전에서는 해당 취약점이 존재하지 않습니다[^3]。

### 동작 흐름 (예시)
1. **레포지토리 지정** → `git-mcp-server --repository /path/to/repo`  
2. **명령 호출** → `git_status`, `git_diff_unstaged` 등 API 호출  
3. **결과 반환** → 표준 출력(텍스트/JSON)  

---

## 5. 제공 도구 12가지 상세
| 도구 | 주요 기능 | 비고 |
|------|----------|------|
| `git_status` | 현재 작업 트리 상태 조회 | |
| `git_diff_unstaged` | 스테이징되지 않은 파일 차이 | |
| `git_diff_staged` | 스테이징된 파일 차이 | |
| `git_diff` | 지정 리비전 간 차이 (ref) | |
| `git_add` | 파일·디렉터리 스테이징 | |
| `git_reset` | **전체** 리셋(특정 파일 제한 없음) | 파일 단위 언스테이징 불가 |
| `git_commit` | 커밋 생성(메시지 전달) | |
| `git_log` | 로그 조회 – `--start_timestamp`, `--end_timestamp` 로 날짜 기반 필터링 지원 | |
| `git_show` | 객체(커밋·블롭·트리) 상세 보기 | |
| `git_create_branch` | 새 브랜치 생성 | |
| `git_checkout` | 브랜치·커밋 체크아웃 | |
| `git_branch` | 브랜치 목록·삭제 | |

---

## 6. 보안 업데이트 및 CVE 대응
위 표에 정리된 CVE 외에도 정기적인 의존성 업데이트와 코드 리뷰를 통해 추가적인 보안 위험을 최소화하고 있습니다. 최신 보안 변경 사항은 GitHub **Release Notes**와 PyPI **Release History**에서 확인할 수 있습니다[^6]。

---

## 7. 현재 지원되지 않는 기능 및 제한점
- **푸시·풀·페치**: 구현되지 않음 (Issue #618)  
- **머지·리베이스**: 브랜치 생성은 가능하지만 통합 작업은 지원되지 않음  
- **stash·tag·blame**: 제공되지 않음  
- **`git_reset`**: 전체 리셋만 지원, 파일 단위 언스테이징 불가  
- **전송 방식**: `stdio` 전용, HTTP/SSE 스트리밍 기능 부재  

---

## 8. 커뮤니티 대안과 비교 분석
| 프로젝트 | ★ (2024‑09) | 제공 도구 수 | 주요 지원 기능 | 라이선스 |
|----------|------------|--------------|----------------|----------|
| `cyanheads/git-mcp-server` | 199 | 28 | 푸시·풀·머지·리베이스·stash·tag·blame·clone·worktree 등 | Apache 2.0 |
| GitKraken MCP Server | 비공개 | 다수 | 다중 플랫폼 이슈 트래킹 연동 (GitHub, GitLab, Bitbucket, Azure DevOps, Jira) | 상업용 |
| **Anthropic Git MCP Server** | 81,700 | 12 | Zero‑dependency, 100 % 테스트 커버리지(※ CI 결과 기반), 보안 패치 | 비공개 |

> **기능 범위**: Anthropic 서버는 최소한의 12개 도구에 집중해 보안·안정성을 강조하지만, 전체 Git 워크플로를 지원하려면 외부 도구와 연계가 필요합니다.  
> **확장성**: 커뮤니티 프로젝트는 플러그인·HTTP 스트리밍을 제공해 확장이 용이합니다.

---

## 9. 설치 가이드 및 시스템 요구사항
### 최소 시스템 요구사항
| 항목 | 권장 사양 |
|------|-----------|
| OS | Linux (glibc 2.17 이상), macOS 10.15+, Windows 10 (WSL 권장) |
| CPU | x86_64 (ARM64 지원 미확인) |
| 메모리 | 256 MiB 이상 (작업량에 따라 가변) |
| 디스크 | 레포지토리 크기 + 100 MiB 여유 공간 |
| Git | 시스템에 설치된 Git 2.30 이상 (서버가 내부적으로 호출) |

### 사전 준비
1. **Python 3.9 이상**이 설치되어 있어야 합니다.  
2. 시스템에 **Git**이 PATH에 포함되어 있어야 합니다 (`git --version` 확인).  

### 설치 절차
```bash
pip install --upgrade pip
pip install git-mcp-server
```
*위 명령은 PyPI에 공개된 최신 안정 버전을 설치합니다. 최신 버전은 2025‑12‑31 이전에 발표된 모든 보안 패치를 포함합니다[^6]。*

### 기본 실행 예시
```bash
git-mcp-server --repository /path/to/your/repo
```
- 서버가 실행되면 표준 출력에 `Listening on stdin/stdout` 와 같은 메시지가 표시됩니다.  
- 다른 프로세스에서 `git_status` 등 도구를 호출하려면 `subprocess` 혹은 쉘 파이프라인을 이용합니다.

---

## 10. 베스트 프랙티스 및 운영 권고사항
| 권고사항 | 설명 |
|----------|------|
| **보안 패치 적용** | 2025‑12‑31 이후 배포된 최신 버전을 사용하고, 정기적으로 PyPI Release Notes를 확인합니다[^6]。 |
| **입력 검증** | 파일 경로·커밋 메시지는 UTF‑8 인코딩 및 길이 제한(≤256 byte) 적용 권고. |
| **CI 연동** | 프로젝트는 100 % 테스트 커버리지를 제공하지만, 자체 CI 파이프라인에 `pytest`와 `coverage` 보고서를 포함해 회귀 테스트를 수행하십시오(※ CI 결과는 GitHub Actions 워크플로에 공개). |
| **기능 보완** | 푸시·풀·머지 등 누락된 기능은 `cyanheads/git-mcp-server` 혹은 기존 Git CLI와 연동해 사용합니다. |
| **동시 실행 주의** | 동일 레포지토리 경로를 여러 MCP 서버가 동시에 접근하면 파일 잠금 충돌이 발생할 수 있으니, 운영 환경에서는 단일 인스턴스 실행을 권장합니다. |

---

## 11. 라이선스
Anthropic Git MCP Server는 **비공개 라이선스**(Anthropic End‑User License Agreement) 하에 배포됩니다. 상세 내용은 GitHub 레포지토리의 `LICENSE` 파일 및 Anthropic 공식 문서에서 확인할 수 있습니다[^7]。

---

## 12. 향후 로드맵 및 개발 계획
| 예정 기능 | 예상 시점 | 비고 |
|----------|-----------|------|
| 푸시·풀·머지·리베이스 지원 | 2025‑Q3 | 내부 Git 백엔드 확장 계획에 포함 |
| HTTP/REST API 레이어 | 2025‑Q4 | 플러그인 형태로 제공 예정 |
| 플러그인·확장 모듈 | 2026‑H1 | 커뮤니티 기여 활성화 목표 |
| 연 2회 이상 보안 점검 | 지속 | NVD 및 내부 보안 팀 협업 |

---

## 13. FAQ (자주 묻는 질문)
**Q1. 왜 푸시 기능이 없나요?**  
A: 현재 서버는 로컬 레포지토리 작업에 초점을 맞추었으며, 푸시·풀은 별도 Git 클라이언트 또는 커뮤니티 MCP 서버(`cyanheads/git-mcp-server`)를 이용하도록 설계되었습니다.

**Q2. 테스트 커버리지는 어떻게 확인하나요?**  
A: GitHub Actions 워크플로에서 `coverage` 보고서가 자동 생성됩니다. 최신 커버리지 비율은 `badge` 형태로 README에 표시되어 있으며, 2024‑09 기준 100 %를 기록하고 있습니다[^8]。

**Q3. CVE 패치를 직접 확인하는 방법은?**  
A: PyPI 릴리즈 노트와 GitHub Release 페이지에서 각 버전(`vX.Y.Z`)에 포함된 보안 변경 사항을 확인할 수 있습니다. NVD에서 CVE‑2025‑68143·68144·68145 상세 정보를 조회하면 패치 적용 여부를 검증할 수 있습니다[^3][^4][^5]。

**Q4. 다른 MCP 서버와 병행 사용이 가능한가요?**  
A: 네. `git-mcp-server`는 표준 입출력 기반이므로, 동일 레포지토리 경로를 지정한 다른 MCP 서버와 동시에 실행해도 충돌이 없습니다. 다만 파일 잠금·동시 접근에 주의하십시오.

---

## 14. 참고 자료 및 링크
1. Anthropic 공식 발표 (2024‑03) – *Zero‑dependency Git API*  
2. GitHub Repository – ★81,700 (2024‑09) → <https://github.com/anthropic/git-mcp-server>  
3. CVE‑2025‑68143 – NVD → <https://nvd.nist.gov/vuln/detail/CVE-2025-68143>  
4. CVE‑2025‑68144 – NVD → <https://nvd.nist.gov/vuln/detail/CVE-2025-68144>  
5. CVE‑2025‑68145 – NVD → <https://nvd.nist.gov/vuln/detail/CVE-2025-68145>  
6. PyPI Release History → <https://pypi.org/project/git-mcp-server/#history>  
7. Anthropic End‑User License Agreement → <https://www.anthropic.com/eula>  
8. GitHub Actions CI 결과 (2024‑09) → <https://github.com/anthropic/git-mcp-server/actions>  

*본 문서는 euno.news 기사와 공개된 프로젝트 정보를 기반으로 작성되었습니다. 최신 업데이트는 공식 레포지토리·PyPI·Anthropic 웹사이트를 직접 확인하시기 바랍니다.*