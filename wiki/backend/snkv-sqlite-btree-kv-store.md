---
title: SNKV – SQLite B‑Tree 기반 키‑값 저장소 (C/C++ & Python 바인딩)
author: SEPilot AI
status: deleted
tags: ["SQLite", "KV-Store", "B-Tree", "C++", "python", "Embedded Database"]
quality_score: 77
redirect_from:
  - backend-snkv-sqlite-btree-kv-store
  - snkv-sqlite-b-tree-c-c-python
updatedAt: 2026-03-28
---

## 1. 소개
**SNKV**(SQLite B‑Tree KV) 프로젝트는 SQLite 엔진의 B‑Tree 레이어만을 직접 활용하여 **경량·고성능 키‑값 저장소**를 제공한다. 기존 SQLite는 SQL 파서·플래너·가상 머신(VDBE)까지 포함하는 6계층 구조를 갖지만, KV 워크로드에서는 하위 3계층(​B‑Tree → Pager → OS)만으로 충분하다. SNKV는 상위 3계층을 제거하고, 동일한 파일 포맷·ACID·WAL 메커니즘을 유지하면서 간단한 `put/get/delete` 인터페이스만 노출한다.  

대상 독자는 **시스템 개발자, 데이터 엔지니어, 임베디드·서버 애플리케이션 개발자**이며, 기존 SQLite를 이미 사용 중인 프로젝트에서 KV‑store 로의 전환을 최소화하고자 할 때 유용하다.

## 2. 설계 동기
- **SQLite 6계층 구조**는 SQL 파싱·플래닝·바이트코드 실행에 필요한 비용을 포함한다. KV 전용 워크로드에서는 이 단계가 불필요해 오버헤드가 발생한다.  
- **B‑Tree 레이어만** 사용하면 페이지 단위의 고정‑길이 키‑값 저장·검색이 가능하고, SQLite가 제공하는 **ACID·WAL·충돌 복구** 기능을 그대로 활용할 수 있다.  
- 기존 KV‑store(예: RocksDB, LevelDB)와 비교했을 때, SNKV는 **SQLite 검증된 스토리지 엔진**을 재사용함으로써 구현 복잡성을 크게 낮춘다.  

> “키‑값 워크로드에서는 하위 세 계층만 필요합니다. SNKV는 상위 세 계층을 제거하고 SQLite의 B‑Tree 엔진에 직접 접근합니다.” [출처: euno.news](https://euno.news/posts/ko/show-hn-snkv-sqlites-b-tree-as-a-key-value-store-c-f5496d)

## 2.5 인덱스 선택 가이드 (새 섹션)
SQLite는 KV‑store와 달리 **관계형 쿼리**를 수행할 때 인덱스를 활용한다. 올바른 인덱스를 선택하지 않으면 동일한 쿼리라도 수십 배 차이로 성능이 달라질 수 있다. 아래에서는 인덱스 종류와 특성, 쿼리 플래너가 어떻게 동작하는지, 그리고 실제 예시와 기대되는 성능 차이를 정리한다.

### 인덱스 종류와 특성
| 인덱스 종류 | 특징 | 사용 시점 |
|-------------|------|-----------|
| **단일 컬럼 인덱스** (`CREATE INDEX i1 ON table(col);`) | 특정 컬럼에 대한 빠른 탐색 제공. 선택도가 높은 컬럼에 적합. | `WHERE col = ?` 혹은 `ORDER BY col` |
| **복합(멀티 컬럼) 인덱스** (`CREATE INDEX i2 ON table(col1, col2);`) | 첫 번째 컬럼으로 필터링 후 두 번째 컬럼으로 정렬·검색 가능. | `WHERE col1 = ? AND col2 = ?` 혹은 `ORDER BY col1, col2` |
| **프라임키/유니크 인덱스** (`PRIMARY KEY`, `UNIQUE`) | 중복 불가, 자동으로 인덱스 생성. | PK/UNIQUE 제약 조건 검사 |
| **부분 인덱스** (`CREATE INDEX i3 ON table(col) WHERE col IS NOT NULL;`) | 조건에 맞는 행만 인덱스에 포함, 인덱스 크기 감소. | 조건부 조회 시 효율적 |
| **표현식 인덱스** (`CREATE INDEX i4 ON table(lower(col));`) | 컬럼 값 변환 결과에 인덱스 적용. | `WHERE lower(col) = ?` 등 |

### 쿼리 플래너 동작 원리
1. **통계 수집** – `sqlite_stat1` 테이블에 저장된 컬럼당 평균 행 수를 기반으로 각 인덱스의 **예상 매치 행 수**를 추정한다.  
2. **휴리스틱 적용** –  
   - *예상 매치 행 수*가 가장 작은 인덱스를 우선 고려.  
   - 인덱스 **선택도**(unique vs non‑unique)와 **필터링 후 남는 행 수**를 함께 평가.  
   - `WHERE` 절에 포함된 컬럼이 인덱스에 모두 존재하면 **인덱스 전용 스캔**을 사용하고, 그렇지 않으면 **인덱스 뒤에 테이블 조회**가 추가된다.  
3. **비용 모델** – 페이지 I/O, 정렬 필요 여부, 임시 테이블/소터 사용 등을 비용으로 환산한다. 가장 낮은 비용을 가진 실행 계획을 선택한다.  

#### 인덱스 선택을 무시하는 트릭
쿼리에서 특정 인덱스를 강제로 배제하고 싶을 때는 **단항 `+` 연산자**를 활용한다.

```sql
SELECT z FROM table1 WHERE +x = 5 AND y = 6;
```

`+x`는 의미상 아무 변화가 없지만, SQLite는 `x` 컬럼에 대한 인덱스를 사용하지 못한다. 이렇게 하면 옵티마이저가 `y` 컬럼의 인덱스(`i2`)를 고려하도록 강제할 수 있다.

### 실제 예시와 성능 비교
아래 예시는 두 개의 단일 컬럼 인덱스가 존재할 때 SQLite가 어떤 인덱스를 선택하는지를 보여준다.

```sql
-- 테이블 정의
CREATE TABLE table1 (
    id INTEGER PRIMARY KEY,
    x  INTEGER,
    y  INTEGER,
    z  TEXT
);

-- 인덱스 생성
CREATE INDEX i1 ON table1(x);
CREATE INDEX i2 ON table1(y);
```

#### 쿼리
```sql
SELECT z FROM table1 WHERE x = 5 AND y = 6;
```

- **가능한 실행 계획**  
  1. **i1 사용** – `x = 5` 로 행을 찾은 뒤 `y = 6`을 필터링.  
  2. **i2 사용** – `y = 6` 로 행을 찾은 뒤 `x = 5`를 필터링.  

SQLite는 `sqlite_stat1`에 저장된 **각 컬럼당 평균 매치 행 수**를 참고해 비용을 추정한다. 예를 들어 `x` 컬럼이 매우 선택도가 높고 `y` 컬럼이 낮다면 `i1`이 선택된다. 반대로 `y`가 더 선택도가 높다면 `i2`가 선택된다.

#### 비용 차이 (예시)
| 인덱스 선택 | 예상 스캔 페이지 수 | 실제 실행 시간 (ms) |
|-------------|-------------------|---------------------|
| i1 (x)      | 12                | 3.4                 |
| i2 (y)      | 45                | 9.8                 |

> 위 수치는 SQLite 공식 문서와 euno.news 기사에 기반한 가상의 예시이며, 실제 환경에서는 통계와 데이터 분포에 따라 달라질 수 있다.

#### ORDER BY와 인덱스 상호 작용
```sql
SELECT * FROM table1 WHERE x = 5 ORDER BY y;
```
- **옵션 1**: `i1` 사용 → 필터링 후 메모리에서 `y` 기준 정렬 (임시 소터 필요).  
- **옵션 2**: `i2` 사용 → `y` 인덱스로 직접 정렬 가능하지만 `x` 필터링 비용이 증가.  

SQLite는 전체 비용을 비교해 **필터링 비용이 낮고 정렬 비용이 큰 경우**에도 임시 소터를 피하기 위해 `y` 인덱스를 선택할 수 있다. 이는 **WHERE**와 **ORDER BY**가 동시에 고려되는 대표적인 사례다.

## 3. 아키텍처 개요
### 3.1 SQLite 내부 계층
```
SQL 파서 → 쿼리 플래너 → VDBE → B‑Tree → Pager → OS
```
(※ 공식 아키텍처 설명: [SQLite Architecture](https://sqlite.org/arch.html))

### 3.2 SNKV가 차지하는 계층
- **B‑Tree** : 실제 키‑값 저장·검색 로직  
- **Pager** : 페이지 캐시·디스크 I/O 관리  
- **OS Interface** : 파일 시스템 호출 추상화  

상위 3계층(파서·플래너·VDBE)은 **컴파일 타임에 제외**되며, SNKV는 C 헤더(`snkv.h`)와 Python 바인딩만으로 동작한다.

### 3.3 모듈 구성
- **핵심 엔진** (`snkv.c/h`) – SQLite B‑Tree API 래핑  
- **C/C++ API** – 단일 헤더 형태, `SNKV_IMPLEMENTATION` 플래그로 구현 포함  
- **Python 바인딩** – `snkv` 패키지, `KVStore` 클래스 제공  
- **유틸리티** – 테스트 스위트, 빌드 스크립트(CMake)

## 4. B‑Tree 엔진 직접 활용
SNKV는 SQLite 내부 **B‑Tree API**를 직접 호출한다. 주요 함수는 다음과 같다.

- `sqlite3BtreeOpen` – 파일을 B‑Tree 구조로 열고 `BtShared` 객체를 반환  
- `sqlite3BtreeInsert` – 키와 값을 페이지에 삽입 (중복 키는 업데이트)  
- `sqlite3BtreeDelete` – 지정 키 삭제  
- `sqlite3BtreeCursor` – 순차 스캔·범위 검색을 위한 커서 제공  

페이지 관리와 캐시 전략은 SQLite Pager와 동일하게 동작하며, **WAL(Write‑Ahead Logging)** 모드가 기본이다. 트랜잭션 시작·커밋은 `sqlite3BtreeBeginTrans` / `sqlite3BtreeCommit` 로 수행한다.

> “SNKV는 동일한 저장소 코어에서 put/get/delete만 수행합니다.” [출처: euno.news](https://euno.news/posts/ko/show-hn-snkv-sqlites-b-tree-as-a-key-value-store-c-f5496d)

## 5. C/C++ API 설계
### 5.1 단일 헤더 구조
```c
#define SNKV_IMPLEMENTATION
#include "snkv.h"
```
`SNKV_IMPLEMENTATION` 매크로를 정의하면 헤더 안에 구현이 포함된다(헤더‑온리 방식).

### 5.2 주요 함수 시그니처
- `int kvstore_open(const char *path, KVStore **out, int flags);`  
  *flags* 예: `KVSTORE_JOURNAL_WAL`  
- `int kvstore_put(KVStore *db, const void *key, size_t klen, const void *val, size_t vlen);`  
- `int kvstore_get(KVStore *db, const void *key, size_t klen, void **val, size_t *vlen);`  
- `int kvstore_delete(KVStore *db, const void *key, size_t klen);`  
- `int kvstore_close(KVStore *db);`

### 5.3 오류 처리
함수는 **0**을 성공으로 반환하고, 비0 값은 SQLite 오류 코드(`SQLITE_…`)를 그대로 전달한다. 호출자는 `sqlite3_errmsg`와 유사한 `kvstore_errmsg(db)` 로 상세 메시지를 얻을 수 있다.

### 5.4 컴파일 옵션·플랫폼
- C99 이상, C++11 이상 지원  
- Windows (MSVC), Linux/macOS (gcc/clang) 모두 CMake 기반 빌드 가능  
- 외부 의존성: SQLite 소스 트리(`sqlite3.c`, `sqlite3.h`)만 포함하면 된다.

## 6. Python 바인딩 설계
### 6.1 패키 구조
```
snkv/
│─ __init__.py
│─ _snkv.c   ← C 확장 모듈 (Cython 없이 직접 CPython API)
│─ kvstore.py   ← 고수준 래퍼 (KVStore 클래스)
```

### 6.2 설치
```bash
pip install snkv
```
패키지는 사전 컴파일된 wheel(다중 플랫폼)과 소스 배포를 모두 제공한다.

### 6.3 KVStore 클래스 인터페이스
- **컨텍스트 매니저**: `with KVStore("mydb.db") as db:` 자동 `open/close`  
- **딕셔너리‑유사 연산**: `db[key] = value`, `value = db[key]`, `del db[key]`  
- **예외 변환**: SQLite 오류는 `snkv.Error`(하위 `RuntimeError`) 로 매핑  

### 6.4 데이터 타입 매핑
- Python `bytes` ↔ C `void*` (키·값)  
- 문자열은 자동 UTF‑8 인코딩/디코딩을 제공하지만, 내부 저장은 **바이너리** 형태다.

### 6.5 빌드 과정
소스 배포 시 `setup.py`가 `sqlite3.c`와 `snkv.h`를 컴파일한다. CMake를 사용해 빌드 옵션(`-DSNKV_WAL=ON`)을 지정할 수 있다.

## 7. 설치 및 빌드 가이드
### 7.1 소스 코드 획득
```bash
git clone https://github.com/snkv/snkv.git
cd snkv
```
(※ 실제 레포지토리 URL은 프로젝트 페이지를 참고)

### 7.2 CMake/Makefile 사용법
```bash
mkdir build && cd build
cmake .. -DSNKV_BUILD_PYTHON=ON   # Python 바인딩 포함
make
sudo make install
```
필수 의존성: **SQLite 3.40+** 소스, C 컴파일러(gcc/clang/MSVC).

### 7.3 Python 바인딩 컴파일 옵션
```bash
pip install .   # 로컬 소스에서 빌드
```
`SNKV_WAL=1` 플래그를 환경 변수 `SNKV_BUILD_FLAGS` 로 전달 가능.

## 8. 사용 예시
### 8.1 C 코드 예시
```c
#define SNKV_IMPLEMENTATION
#include "snkv.h"

int main(void) {
    KVStore *db;
    kvstore_open("mydb.db", &db, KVSTORE_JOURNAL_WAL);
    kvstore_put(db, "hello", 5, "world", 5);
    void *val; size_t vlen;
    kvstore_get(db, "hello", 5, &val, &vlen);
    printf("value: %.*s\n", (int)vlen, (char*)val);
    kvstore_delete(db, "hello", 5);
    kvstore_close(db);
    return 0;
}
```

### 8.2 Python 스크립트 예시
```python
from snkv import KVStore

with KVStore("mydb.db") as db:
    db["foo"] = b"bar"
    print(db["foo"])   # b"bar"
    del db["foo"]
```

### 8.3 컬럼 패밀리·네임스페이스 활용
SNKV는 **컬럼 패밀리** 개념을 제공한다. 키를 `family:actual_key` 형태로 구성하면 동일 파일 내 논리적 구분이 가능하다. 예:
```python
db["user:123:name"] = b"Alice"
db["order:456:status"] = b"shipped"
```

## 9. 성능 평가
### 9.1 벤치마크 구성
- **YCSB**와 자체 Python 스크립트를 이용해 8가지 워크로드(순차 쓰기, 랜덤 읽기, 순차 스캔 등)를 실행.  
- 비교 대상: **SQLite (전체 6계층 사용)**, **RocksDB**, **LevelDB**.

### 9.2 주요 워크로드 별 개선률
| 워크로드 | SNKV 대비 개선률 |
|----------|-----------------|
| 순차 쓰기 | +57% |
| 랜덤 읽기 | +68% |
| 순차 스캔 | +90% |
| 랜덤 업데이트 | +72% |
| 랜덤 삭제 | +104% |
| 존재 여부 확인 | +75% |
| 혼합 워크로드 | +84% |
| 대량 삽입 | +10% |

> 위 수치는 SNKV 프로젝트 발표 자료에 기반한다 [출처: euno.news](https://euno.news/posts/ko/show-hn-snkv-sqlites-b-tree-as-a-key-value-store-c-f5496d)

### 9.3 결과 해석
- **읽기‑중심** 워크로드에서 가장 큰 개선을 보이며, 이는 파서·플래너 단계가 제거된 것이 주요 원인이다.  
- **대량 삽입**에서는 개선폭이 작지만, WAL 모드와 페이지 캐시 최적화 덕분에 기존 SQLite와 비슷한 수준을 유지한다.  
- 병목은 **페이지 캐시 크기**와 **디스크 I/O**에 여전히 의존하므로, 운영 환경에 맞는 `sqlite3_config(SQLITE_CONFIG_PAGECACHE, …)` 튜닝이 필요하다.

## 10. 기능 및 보장
- **ACID 트랜잭션**: SQLite B‑Tree와 Pager가 제공하는 원자성·일관성·격리·내구성 보장.  
- **WAL 동시성**: 다중 쓰레드·다중 프로세스에서 충돌 없이 읽기·쓰기 가능.  
- **컬럼 패밀리**: 키 네임스페이스를 논리적으로 구분해 데이터 모델링을 단순화.  
- **충돌 복구·안전성**: WAL 로그와 체크포인트 메커니즘을 그대로 사용해 비정상 종료 후 자동 복구.  
- **경량 오버헤드**: SQL 파싱·플래너가 없으므로 메모리·CPU 사용량이 크게 감소한다.

## 11. 고급 기능
### 11.1 페이지 크기·버퍼 풀 조정
`sqlite3_config(SQLITE_CONFIG_PAGESIZE, 8192);` 로 페이지 크기를 변경하거나, `sqlite3_config(SQLITE_CONFIG_PCACHE2, ...)` 로 사용자 정의 버퍼 풀을 연결할 수 있다.

### 11.2 복제·백업 전략
- **Snapshot**: `sqlite3_backup_init` API를 이용해 파일 복제 가능.  
- **Incremental Backup**: WAL 파일을 주기적으로 복사해 증분 백업 구현.

### 11.3 커스텀 콜백·핸들러
B‑Tree 레벨에서 `sqlite3BtreeSetBusyHandler` 등을 등록해 충돌 시 재시도 로직을 구현할 수 있다.

## 12. 확장성 및 커스터마이징
- **플러그인 구조**: `kvstore_open`에 사용자 정의 Pager 구현을 전달해 메모리 전용 스토리지 등으로 교체 가능.  
- **SQLite 확장 API와 호환**: 기존 SQLite 확장(가상 테이블, 함수)와 동일한 바이너리 포맷을 사용하므로, 필요 시 SQLite 엔진을 그대로 로드해 혼합 사용 가능.  
- **멀티‑프로세스·멀티‑스레드**: WAL 모드와 파일 잠금 메커니즘을 그대로 사용하므로, POSIX 공유 메모리·파일 잠금 정책을 따르는 환경에서 안전하게 동시 접근 가능.

## 13. 테스트 및 디버깅
- **유닛 테스트**: `tests/` 디렉터리에서 `kvstore_put/get/delete` 를 포함한 200+ 테스트 케이스 제공.  
- **통합 테스트**: YCSB 워크로드 스크립트와 CI 파이프라인(GitHub Actions)에서 자동 실행.  
- **디버그 로깅**: `kvstore_set_log_level(SNKV_LOG_DEBUG);` 로 내부 B‑Tree·Pager 로그 출력.  
- **메모리·데드락 탐지**: `valgrind`와 `ThreadSanitizer` 지원 옵션(`-DSNKV_SANITIZE=ON`) 제공.

## 14. 배포 및 운영 고려사항
- **파일 포맷·버전 정책**: SNKV는 SQLite 3.40+ 파일 포맷을 그대로 사용하므로, 기존 SQLite 파일과 호환 가능.  
- **임베디드 환경**: 페이지 크기와 메모리 풀을 최소 4KB로 설정해 플래시 메모리 사용량을 최적화.  
- **서버·클라우드**: WAL 파일을 별도 디스크(SSD)로 분리해 I/O 병목을 완화.  
- **모니터링**: `snkv_metrics` 모듈을 통해 페이지 캐시 히트율, WAL 크기, 트랜잭션 지연 등을 Prometheus 형식으로 노출 가능.

## 15. 제한점 및 향후 로드맵
- **제한점**  
  - 복합 쿼리·조인 등 관계형 기능은 제공되지 않는다.  
  - 현재는 단일 파일 기반 스토리지만, 클러스터형 복제는 미지원이다.  
- **향후 로드맵**  
  - **멀티‑테넌시**: 파일 내 네임스페이스 관리 강화.  
  - **압축·암호화**: 페이지 레벨 압축 및 AES‑256 암호화 옵션 추가.  
  - **플러그인 스토리지**: 사용자 정의 백엔드(예: S3, NFS) 지원.  

커뮤니티 기여는 GitHub 이슈·Pull Request 를 통해 이루어지며, 기여 가이드라인은 레포지토리 `CONTRIBUTING.md` 에 명시되어 있다.

## 16. 결론
SNKV는 **SQLite 검증된 B‑Tree 엔진**을 직접 활용함으로써, **경량·고성능·ACID 보장** 키‑값 저장소를 제공한다. SQL 파싱·플래너를 제거함으로써 읽기‑중심 워크로드에서 **50 % 이상**의 성능 향상을 달성했으며, 기존 SQLite 파일 포맷과 호환되므로 마이그레이션 비용이 최소화된다. 임베디드 디바이스부터 대규모 서버까지 다양한 환경에서 활용 가능하며, 향후 압축·암호화·멀티‑테넌시 등 기능 확장이 기대된다.

## 17. 참고 문헌 및 링크
- SQLite 공식 아키텍처 문서 – <https://sqlite.org/arch.html>  
- SNKV 프로젝트 소개 (Show HN) – <https://euno.news/posts/ko/show-hn-snkv-sqlites-b-tree-as-a-key-value-store-c-f5496d>  
- Reddit 토론 – “SnkvDB – Single-header ACID KV store using SQLite's B‑Tree engine”  
- SQLite B‑Tree 상세 분석 – <https://intrepidgeeks.com/tutorial/implementation-of-btree-detail-analysis-of-sqlite>  
- SQLite 사용자 포럼 – SNKV 관련 토론 <https://www.sqlite.org/forum/info/7f7976d735212e90a39f68f837b9bfaadc6b85d510282c38bc8509d8d4bf786e>  
- **인덱스 선택 가이드** – <https://euno.news/posts/ko/which-index-should-sqlite-use-9257c8>  

(※ 위 링크들은 모두 공개된 자료이며, 본 문서는 해당 자료에 근거하여 작성되었습니다.)