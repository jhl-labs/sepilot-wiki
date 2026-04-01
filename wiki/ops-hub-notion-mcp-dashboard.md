---
title: Ops Hub – Notion MCP Dashboard 로 자산·구독·일일 요약 관리하기
author: SEPilot AI
status: published
tags: [Ops Hub, Notion, MCP, 자산 관리, 구독 관리, Daily Digest, Python, Poetry]
quality_score: 86
---

## 1. 문서 개요
Ops Hub는 **Notion‑first** 대시보드이며, Notion MCP와 Python 기반 서버를 활용해 **자산(Assets)·구독(Subscriptions)·일일 요약(Daily Digest)** 을 통합 관리합니다.  
이 문서는 다음을 대상으로 합니다.

| 대상 | 활용 시나리오 |
|------|----------------|
| 운영 담당자 | 장비 유지보수·보증·매뉴얼을 한눈에 파악 |
| 재무·구독 관리자 | 구독 갱신 일정·비용·취소 초안을 자동 생성 |
| 개발·DevOps | 로컬·CI 환경에서 Ops Hub 서버를 설치·운용 |

문서는 **시스템 아키텍처 → 데이터베이스 설계 → 운영 관리 → 배포·보안** 순으로 구성됩니다. 각 섹션은 실제 코드 실행 예시와 함께 설명합니다.

---

## 2. 시스템 아키텍처
### 2.1 전체 흐름도
```
Notion (데이터베이스, 템플릿) <─► Notion API <─► MCP Python 서버 <─► 사용자(CLI/CI)
```
* **읽기**: 서버가 Notion DB에서 “곧 유지보수가 필요한 자산”, “곧 만료되는 보증”, “N일 이내에 갱신되는 구독”을 조회합니다.  
* **쓰기**: `Next Action`, `Lifecycle Stage` 등 운영 필드를 업데이트하고, `Manual Notes`, `Cancel Instructions` 같은 메모를 기록합니다.  
* **생성**: `Daily Digest — YYYY‑MM‑DD` 페이지를 자동으로 생성해 KPI와 실행 가능한 리스트를 삽입합니다.  

> 위 흐름은 euno.news 기사에 기술된 내용에 기반합니다[[출처](https://euno.news/posts/ko/ops-hub-notion-mcp-dashboard-for-assets-subscripti-0c18e8)].

### 2.2 주요 컴포넌트
| 컴포넌트 | 역할 |
|----------|------|
| **Python MCP 서버** | Notion API 호출, 비즈니스 로직 구현 (`create_daily_digest` 등) |
| **Notion API** | Notion 데이터베이스 CRUD, 페이지 생성 |
| **Poetry** | 의존성 관리·가상 환경 제공 |
| **.env** | Notion API 토큰·데이터베이스 ID 등 비밀 정보 저장 |

### 2.3 데이터 흐름 및 동기화
1. **스케줄러(예: cron)** 가 `create_daily_digest(N)` 를 호출 → N일 이내 대상 조회.  
2. 조회 결과를 기반으로 **KPI 요약** 및 **액션 리스트** 를 구성.  
3. Notion에 **Daily Digest** 페이지를 생성하고, 각 항목에 **링크**(클릭 가능한 액션) 를 삽입.  
4. 필요 시 **운영 필드**(`Next Action`, `Lifecycle Stage`) 를 업데이트해 상태를 반영.

---

## 3. Notion 데이터베이스 설계
### 3.1 공통 필드
| 필드 | 타입 | 설명 |
|------|------|------|
| `Name` | Title | 자산·구독 이름 |
| `Next Action` | Select | 현재 수행해야 할 작업(예: “Maintain”, “Renew”) |
| `Lifecycle Stage` | Select | 현재 단계(예: “Active”, “Expired”) |
| `Manual Notes` | Text | 유지보수 안내·기타 메모 |
| `Manual URL` | URL | 매뉴얼 링크 |
| `Warranty End` | Date | 보증 종료일 |

### 3.2 Assets DB 구조
| 필드 | 타입 | 설명 |
|------|------|------|
| `Last Maintenance` | Date | 마지막 유지보수 일자 |
| `Maintenance Interval (days)` | Number | 유지보수 주기(일) |
| `Next Maintenance` | Formula | `Last Maintenance + Maintenance Interval` |
| `Next Maintenance Date` | Date | `Next Maintenance` 결과를 캘린더 형식으로 표시 |
| `Warranty End` | Date | 보증 종료일 |
| `Manual Notes` / `Manual URL` | Text / URL | 매뉴얼 정보 |

> 위 필드 정의는 기사에 명시된 “Assets” 데이터 모델을 그대로 반영합니다[[출처](https://euno.news/posts/ko/ops-hub-notion-mcp-dashboard-for-assets-subscripti-0c18e8)].

### 3.3 Subscriptions DB 구조
| 필드 | 타입 | 설명 |
|------|------|------|
| `Renewal Date` | Date | 다음 갱신 일자 |
| `Billing Cycle` | Select | 월/연 등 청구 주기 |
| `Status` | Select | 현재 상태(Active, Cancelled 등) |
| `Next Action` | Select | “Renew”, “Cancel Draft” 등 |
| `Cancel Instructions` | Text | 취소 초안 메모 |

### 3.4 Daily Digest 페이지 템플릿
* **페이지 제목**: `Daily Digest — YYYY‑MM‑DD` (예: `Daily Digest — 2024-03-27`)  
* **섹션**  
  * **KPI 요약** – 유지보수 건수, 갱신 건수·예정 비용, 보증 현황 등  
  * **액션 리스트** – 각 항목을 클릭하면 해당 Asset/Subscription 페이지로 이동  
* **저장 위치**: Ops Hub 대시보드 페이지 아래 **하위 페이지**로 자동 저장  

---

## 4. 자산(Assets) 운영 관리
### 4.1 추적 대상
* **3C·가전** 등 물리적 장비  
* **유지보수 일정** (`Last Maintenance` + `Maintenance Interval`)  
* **보증 기간** (`Warranty End`)  
* **매뉴얼** (`Manual Notes`, `Manual URL`)

### 4.2 자동 감지 로직
1. **다음 유지보수**가 오늘 날짜 기준 **N일 이내**이면 `Next Action`을 “Maintain” 로 설정.  
2. **보증 종료**가 임박하면 `Lifecycle Stage`을 “Warranty Expiring” 로 전환.  

> 구체적인 N값은 `create_daily_digest(N)` 호출 시 인자로 전달됩니다[[출처](https://euno.news/posts/ko/ops-hub-notion-mcp-dashboard-for-assets-subscripti-0c18e8)].

### 4.3 상태 필드 활용법
| 필드 | 예시 값 | 의미 |
|------|--------|------|
| `Next Action` | Maintain, Review | 수행해야 할 작업 |
| `Lifecycle Stage` | Active, Warranty Expiring, Retired | 자산 현재 단계 |

### 4.4 수동 메모 및 문서 연결
* **Manual Notes**에 유지보수 안내를 입력하고, **Manual URL**에 제조사 매뉴얼 링크를 첨부합니다.  
* Notion 내부 링크(`@` 멘션)로 관련 인시던트 페이지와 연결 가능.

---

## 5. 구독(Subscriptions) 운영 관리
### 5.1 갱신·가격 추적 메커니즘
* `Renewal Date`와 `Billing Cycle`을 기준으로 **다음 갱신**을 계산합니다.  
* `Status`가 “Active”인 경우에만 비용(`Renewal Cost`)을 KPI에 포함합니다.

### 5.2 갱신 알림 및 취소 초안 자동 생성 흐름
1. `Renewal Date`가 **N일 이내**이면 `Next Action`을 “Renew” 로 설정.  
2. 동일 조건에서 **취소**가 필요하면 `Cancel Instructions` 필드에 초안 텍스트를 자동 삽입합니다.

### 5.3 상태 관리
| 필드 | 예시 값 | 설명 |
|------|--------|------|
| `Next Action` | Renew, Cancel Draft | 수행해야 할 작업 |
| `Status` | Active, Cancelled, Pending | 구독 현재 상태 |
| `Cancel Instructions` | “Contact vendor by …” | 취소 절차 초안 |

### 5.4 실행 가능한 액션 리스트 구성
* Daily Digest 페이지에 **클릭 가능한 체크박스** 형태로 각 구독 항목을 나열합니다.  
* 클릭 시 해당 Subscription 페이지로 이동해 상세 정보를 확인하고, `Cancel Instructions`를 바로 복사·실행할 수 있습니다.

---

## 6. Daily Digest 자동 보고서
### 6.1 `create_daily_digest(N)` 함수 동작 원리
```python
from homeops_mcp.server import create_daily_digest
print(create_daily_digest(14))
```
* `N`일 이내에 **유지보수·보증·구독 갱신**이 예정된 레코드를 조회합니다.  
* KPI 요약을 계산하고, 각 레코드에 대한 **액션 링크**를 생성합니다.  
* Notion에 `Daily Digest — YYYY‑MM‑DD` 페이지를 만들고, 대시보드 하위 페이지로 저장합니다.  

> 실행 예시는 기사에 제시된 그대로 사용합니다[[출처](https://euno.news/posts/ko/ops-hub-notion-mcp-dashboard-for-assets-subscripti-0c18e8)].

### 6.2 KPI 요약 항목
| KPI | 계산 방식 |
|-----|-----------|
| 유지보수 건수 | `Next Maintenance Date`가 N일 이내인 Asset 수 |
| 갱신 건수 | `Renewal Date`가 N일 이내인 Subscription 수 |
| 예정 갱신 비용 | 위 갱신 건수에 해당하는 `Renewal Cost` 합계 |
| 보증 현황 | `Warranty End`가 N일 이내인 Asset 비율 |

### 6.3 클릭 가능한 액션 리스트 규칙
* 각 항목은 **Notion 페이지 링크**와 **체크박스** 형태로 표시됩니다.  
* 리스트는 **섹션별**(Assets, Subscriptions)로 구분되어 가독성을 높입니다.

### 6.4 페이지 자동 생성 위치 및 네이밍 규칙
* **위치**: Ops Hub 대시보드 페이지 아래 `Daily Digest` 폴더(또는 하위 페이지).  
* **네이밍**: `Daily Digest — YYYY‑MM‑DD` (ISO 날짜 형식).  

---

## 7. 로컬 환경 설정 및 배포
### 7.1 사전 요구 사항
* Python 3.9 이상  
* Poetry (`pip install poetry`)  
* Notion API 토큰 (통합 → 내부 통합)  
* 대상 Notion 데이터베이스 ID (Assets, Subscriptions, Dashboard)

### 7.2 `.env` 파일 구성
| 변수 | 설명 |
|------|------|
| `NOTION_TOKEN` | Notion API 시크릿 토큰 |
| `ASSETS_DB_ID` | Assets 데이터베이스 ID |
| `SUBSCRIPTIONS_DB_ID` | Subscriptions 데이터베이스 ID |
| `DASHBOARD_PAGE_ID` | Ops Hub 대시보드 페이지 ID |
| `DEFAULT_LOOKAHEAD_DAYS` | `create_daily_digest` 기본 N값 (선택) |

> 기본 파일은 `.env.example` 로 제공되며, `cp .env.example .env` 로 복사 후 수정합니다[[출처](https://euno.news/posts/ko/ops-hub-notion-mcp-dashboard-for-assets-subscripti-0c18e8)].

### 7.3 설치 단계
1. `cp .env.example .env`  
2. `poetry install` – 의존성 설치 및 가상 환경 생성  
3. 테스트 실행  
   ```bash
   poetry run python -c "from homeops_mcp.server import create_daily_digest; print(create_daily_digest(14))"
   ```

### 7.4 CI/CD 연동 방안 (옵션)
* **GitHub Actions**: `poetry install` → `python -m pytest` → `python -c "…create_daily_digest…"`.  
* **Cron**: 서버에 배포 후 `0 8 * * * /path/to/poetry run python -c "from homeops_mcp.server import create_daily_digest; create_daily_digest(14)"` 로 매일 아침 실행.

---

## 8. 사용 가이드
### 8.1 기본 명령어
| 명령 | 설명 |
|------|------|
| `poetry run python -c "from homeops_mcp.server import create_daily_digest; create_daily_digest(14)"` | 오늘 기준 14일 이내 대상에 대한 Daily Digest 생성 |
| `poetry run python -m homeops_mcp.sync_assets` | Assets DB 동기화(수동) |
| `poetry run python -m homeops_mcp.sync_subscriptions` | Subscriptions DB 동기화(수동) |

### 8.2 자산·구독 데이터 입력·수정 절차
1. Notion UI에서 **Assets** 혹은 **Subscriptions** DB에 새 레코드 추가.  
2. 필수 필드(`Name`, `Last Maintenance`, `Maintenance Interval`, `Renewal Date` 등)를 입력.  
3. MCP 서버는 다음 실행 시 자동으로 `Next Action`·`Lifecycle Stage` 등을 업데이트합니다.

### 8.3 Daily Digest 트리거
* **수동**: 위 명령어 실행.  
* **자동**: CI/CD 파이프라인 혹은 시스템 cron에 스케줄링.  

### 8.4 Notion 대시보드 뷰 커스터마이징 팁
* **필터**: “Next Action = Maintain” 로 유지보수 전용 뷰 생성.  
* **정렬**: `Next Maintenance Date` 오름차순 정렬.  
* **그룹**: `Lifecycle Stage` 별 그룹화하여 상태별 현황 파악.

---

## 9. 확장 및 커스터마이징
### 9.1 새로운 데이터베이스 추가
1. Notion에 **Projects** DB 생성 (예: `Project Name`, `Owner`, `Due Date`).  
2. `.env`에 `PROJECTS_DB_ID` 추가.  
3. Python 모듈 `homeops_mcp.projects` 에 CRUD 로직 구현 후 `create_daily_digest` 에 포함.

### 9.2 커스텀 필드·연산식 정의
* Notion **Formula** 필드로 `Days Until Next Maintenance` 와 같은 파생값을 정의하고, MCP 서버에서 해당 필드를 읽어 로직에 활용합니다.

### 9.3 플러그인·스케줄러 연동 예시
* **cron**: `0 6 * * * /usr/local/bin/poetry run python -c "…create_daily_digest(7)"`  
* **GitHub Actions**: `on: schedule: - cron: '0 6 * * *'` 로 매일 6시 실행.

---

## 10. 보안·권한 관리
### 10.1 Notion API 권한 최소화 전략
* **통합** 생성 시 **읽기/쓰기** 권한을 **필요한 DB**(Assets, Subscriptions, Dashboard)만 선택.  
* 불필요한 페이지·워크스페이스 접근 권한은 부여하지 않음.

### 10.2 환경 변수·시크릿 관리 베스트 프랙티스
* `.env` 파일은 **gitignore**에 포함하고, CI 환경에서는 **GitHub Secrets** 혹은 **Vault** 로 관리.  
* 토큰은 **읽기 전용**이 아닌 **읽기·쓰기** 권한만 부여된 토큰을 사용.

### 10.3 접근 제어 및 감사 로그
* Notion 통합 페이지에서 **활동 로그**를 확인해 API 호출 기록을 모니터링.  
* 서버 측에서는 **logging** 모듈을 활용해 요청·응답을 파일에 기록하고, 필요 시 중앙 로그 시스템(ELK 등)으로 전송.

---

## 11. 문제 해결 및 FAQ
### 11.1 일반적인 오류와 해결 방안
| 오류 | 원인 | 해결 방법 |
|------|------|----------|
| `AuthenticationError` | `NOTION_TOKEN` 누락·오류 | `.env`에 올바른 토큰 입력, 토큰 권한 확인 |
| `NotionAPIError: Rate limit exceeded` | API 호출 과다 | 호출 간 **백오프** 적용, 배치 처리로 요청 수 감소 |
| `Property not found` | DB 스키마와 코드 불일치 | Notion DB에 필드 추가·이름 확인, 코드에서 필드명 업데이트 |

### 11.2 성능 튜닝 팁
* **배치 조회**: `filter` 로 한 번에 N일 이내 레코드만 조회.  
* **캐시**: 자주 조회되는 `Database ID` 를 메모리 캐시(예: `functools.lru_cache`)에 저장.  

### 11.3 자주 묻는 질문
**Q1. Daily Digest 페이지는 어디에 저장되나요?**  
A1. Ops Hub 대시보드 페이지 아래 **하위 페이지**로 자동 저장됩니다.

**Q2. N일 값을 어떻게 조정하나요?**  
A2. `create_daily_digest(N)` 함수 인자로 직접 전달하거나, `.env` 의 `DEFAULT_LOOKAHEAD_DAYS` 를 수정합니다.

**Q3. Notion에서 직접 액션을 수행할 수 있나요?**  
A3. Yes. 액션 리스트는 Notion 페이지 링크이므로 클릭하면 해당 레코드로 이동해 수동으로 상태를 변경할 수 있습니다.

---

## 12. 참고 자료 및 링크
* **GitHub 저장소** – `homeops_mcp` 프로젝트 (설치·코드 확인)  
* **Notion API 공식 문서** – <https://developers.notion.com>  
* **Ops Hub 소개 기사** – <https://euno.news/posts/ko/ops-hub-notion-mcp-dashboard-for-assets-subscripti-0c18e8>  
* **Poetry 공식 가이드** – <https://python-poetry.org/docs/>  

### 용어 정의
| 용어 | 의미 |
|------|------|
| MCP | Notion‑based **Management Control Plane** |
| KPI | 핵심 성과 지표 (예: 유지보수 건수, 갱신 비용) |
| HLD | High‑Level Design (본 문서의 아키텍처 섹션) |

---