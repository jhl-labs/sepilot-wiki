---
title: GHSA‑QR2G‑P6Q7‑W82M – Coinbase x402 SDK (Solana) 결제 검증 우회 취약점
author: SEPilot AI
status: published
tags: [보안, 취약점, x402, Solana, 결제 검증, 인증 우회]
redirect_from:
  - security-coinbase-x402-sdk-slopsquatting-vulnerability
  - security-coinbase-x402-sdk-vulnerability
quality_score: 80
---

# Summary
- **취약점 ID**: GHSA‑QR2G‑P6Q7‑W82M (GitHub Advisory)  
- **공개 여부**: 현재 NVD·CVE·OSV 등 공식 데이터베이스에 등재되지 않아 정확한 CVSS 점수와 공개일이 확인되지 않음.  
- **영향**: `@x402/svm`, `x402`(Python), `github.com/coinbase/x402/go` SDK의 **구버전**에서 결제 서명 검증 로직이 잘못 구현돼 **인증 우회**가 가능함.  
- **위험도**: 결제 검증이 우회되면 비용이 청구되지 않은 채 유료 API·컴퓨팅·디지털 자산에 접근할 수 있어 **재정 손실 및 서비스 남용** 위험이 매우 높음(실제 CVSS는 미확인).  
- **핵심 대응**: 모든 x402 SDK를 **최신 버전**(≥ 2.6.0 / 2.3.0 / 2.5.0)으로 업그레이드하고, 임시로 Solana 결제 기능을 비활성화하거나 모니터링을 강화한다.  

---

## 1. 취약점 개요
| 항목 | 내용 |
|------|------|
| **GHSA ID** | GHSA‑QR2G‑P6Q7‑W82M |
| **공개일** | 공식 데이터베이스에 등재되지 않음 (GitHub Advisory에만 존재) |
| **CVSS** | 미확인 (GitHub Advisory에서는 “Critical” 수준으로 표시) |
| **관련 CWE** | CWE‑347 (인증 우회) |
| **영향받는 SDK** | `@x402/svm` (npm), `x402` (PyPI), `github.com/coinbase/x402/go` |
| **주요 위험** | 결제 서명 검증 오류 → 비용 청구 없이 유료 서비스 이용 가능 |

### 1.1 x402 SDK와 Solana 결제 흐름
- **x402**는 Coinbase Development Platform이 제공하는 “인터넷‑네이티브 결제 프로토콜”이며, Solana Virtual Machine(SVM) 위에서 **facilitator** 컴포넌트를 통해 HTTP 402 결제를 중개한다.  
- 클라이언트는 **Ed25519 서명**이 포함된 트랜잭션을 전송하고, facilitator는 서명을 검증한 뒤 블록체인에 정산한다.  

### 1.2 핵심 위험
- 서명 검증 로직이 **잘못된 공개키 매핑** 혹은 **검증 결과 무시**로 구현돼 변조된 서명이라도 `true`를 반환한다.  
- 공격자는 결제 서명을 임의값(예: `0`)으로 바꾸어도 결제가 승인되어, 비용이 청구되지 않은 채 서비스에 접근한다.  

---

## 2. 기술적 세부 사항
### 2.1 결제 검증 로직 결함
- **위치**: `facilitator` 내부, Solana 구현부의 `verify_ed25519_signature` 함수.  
- **문제**:  
  1. 공개키를 하드코딩하거나 잘못 매핑 → 검증 대상이 아닌 키로 서명을 검증.  
  2. 검증 결과를 무시하고 무조건 `true` 반환.  

### 2.2 공격 흐름
| 단계 | 공격자 행동 |
|------|------------|
| 1 | 대상 서비스의 x402 facilitator 엔드포인트를 파악 |
| 2 | 정상 결제 트랜잭션을 캡처하고 `signature` 필드를 임의값(예: `0`)으로 변조 |
| 3 | 변조된 트랜잭션을 동일 엔드포인트에 재전송 |
| 4 | 결제 검증 로직 오류로 `true` 반환 → 결제 승인 |
| 5 | 블록체인에 비용이 정산되지 않은 상태로 유료 API·리소스에 접근 |

- **재현 난이도**: 중간 (HTTP 요청을 자유롭게 변조할 수 있는 환경 필요)  
- **POC**: GitHub Advisory와 일부 보안 블로그에서 공개된 예시가 존재함(※ 사용 시 법·윤리적 검토 필요).  

---

## 3. 영향 받는 구성 요소 및 버전
| 패키지 | 취약 버전 | 안전 버전(≥) |
|--------|-----------|--------------|
| `@x402/svm` (npm) | < 2.6.0 | 2.6.0 이상 |
| `x402` (PyPI) | < 2.3.0 | 2.3.0 이상 |
| `github.com/coinbase/x402/go` | < 2.5.0 | 2.5.0 이상 |

### 사용 사례
- **Node.js**: AI‑agent 백엔드가 `@x402/svm`을 통해 Solana 결제 처리  
- **Python**: 데이터 피드 구독 서비스가 `x402` 패키지 사용  
- **Go**: 고성능 트레이딩 봇이 `x402/go` SDK로 결제 검증  

---

## 4. 비즈니스 및 보안 영향 평가
| 영역 | 예상 영향 |
|------|-----------|
| **재정 손실** | 비용이 청구되지 않은 유료 API·컴퓨팅 사용으로 수천 달러 이상 손실 가능 |
| **무단 접근** | 인증 없이 데이터베이스 조회, 모델 추론, 클라우드 컴퓨팅 등 비용 발생 작업 수행 |
| **가용성·평판** | 대량 남용으로 인프라 과부하·서비스 중단, 고객 신뢰도 하락 |
| **법적·규제** | 결제 시스템 보안 미비에 따른 규제 위반 위험 |

---

## 5. 완화 및 대응 전략
### 5.1 즉시 적용
1. **패치 적용** – 모든 x402 SDK를 최신 버전으로 업그레이드.  
2. **임시 비활성화** – Solana(SVM) 결제 기능을 일시적으로 차단하고, 가능한 경우 EVM 전용 결제로 전환.  

### 5.2 방어 강화
- **로그·모니터링**  
  - 동일 IP·키에 대한 **반복 서명** 또는 **비정상적인 트랜잭션량** 감지.  
  - 결제 요청/응답 로그에 `signature_valid` 플래그 기록, 실패 시 알림 생성.  
- **접근 제어**  
  - facilitator 앞에 **WAF**·**API Gateway** 배치, 비정상 요청 차단 규칙 적용.  

---

## 6. 패치 적용 가이드
### Node.js / TypeScript
```bash
# 현재 설치된 버전 확인
npm list @x402/svm

# 최신 버전(2.6.0 이상) 설치
npm install @x402/svm@latest
```

### Python
```bash
# 현재 버전 확인
pip show x402

# 최신 버전(2.3.0 이상) 업그레이드
pip install --upgrade x402
```

### Go
```bash
# go.mod에서 버전 수정
require github.com/coinbase/x402/go v2.5.0

# 의존성 업데이트 및 재빌드
go get github.com/coinbase/x402/go@v2.5.0
go build ./...
```

### 서비스 재시작 및 검증 체크리스트
- 모든 facilitator 서비스 재시작  
- 테스트 트랜잭션 실행 → `signature_valid: true` 로그 확인  
- 모니터링 대시보드에서 결제 성공 비율이 100%에 가깝게 유지되는지 확인  

---

## 7. 탐지 및 모니터링 권고사항
| 로그 포인트 | 수집 내용 |
|------------|-----------|
| HTTP 헤더 | `x402-signature` |
| 내부 로그 | `signature_valid: true/false` |
| 트랜잭션 메타 | 트랜잭션 ID ↔ 결제 금액 매핑 |

### SIEM/EDR 알림 규칙 예시
- `signature_valid == true && payment_status == unpaid` → **Critical** 알림  
- 동일 IP에서 5분 내 10건 이상 결제 시도 → **Suspicious** 경보  

### 사후 검증 테스트
1. 변조된 서명을 포함한 요청 전송 → `signature_valid`가 `false` 기록 확인  
2. 정상 서명과 변조 서명 모두에 대해 결제 정산 여부 비교  

---

## 8. 참고 자료 및 외부 링크
- **GitHub Advisory Database** – [GHSA‑QR2G‑P6Q7‑W82M](https://github.com/advisories/GHSA-QR2G-P6Q7-W82M)  
- **OSV Vulnerability Record** – 동일 취약점 기록 (검색 시 “x402”와 “signature verification” 키워드 사용)  
- **Coinbase x402 Repository** – 공식 패치 및 릴리즈 노트 (GitHub)  
- **EUNO.NEWS 기사** – 취약점 상세 설명 및 초기 보고 (※ 비공식)  
- **CVEReports** – 취약점 요약 및 CVSS 점수 (공식 CVE 미등록)  
- **Solana x402 공식 페이지** – 프로토콜 개요 (https://solana.com/ko/x402)  

---

## 9. 부록
### 용어 정의
- **facilitator**: x402 프로토콜에서 결제 검증·정산을 담당하는 중개 서비스 컴포넌트.  
- **SVM (Solana Virtual Machine)**: Solana 블록체인 위에서 실행되는 스마트 계약 실행 환경.  
- **Ed25519**: 고속 디지털 서명 알고리즘, x402 결제 서명에 사용됨.  

### CVE/GHSA 매핑 표
| 식별자 | 유형 | 공개일 | CVSS |
|--------|------|--------|------|
| GHSA‑QR2G‑P6Q7‑W82M | 인증 우회 (CWE‑347) | 공식 데이터베이스에 등재되지 않음 | 미확인 (GitHub에서는 “Critical”로 표시) |

### 버전 호환성 매트릭스
| SDK | 최소 안전 버전 | 지원 런타임 |
|-----|----------------|-------------|
| `@x402/svm` (npm) | 2.6.0 | Node ≥ 14 |
| `x402` (PyPI) | 2.3.0 | Python ≥ 3.8 |
| `github.com/coinbase/x402/go` | 2.5.0 | Go 1.18+ |

### FAQ
**Q1. 패치를 적용해도 기존 결제 기록이 변조될 수 있나요?**  
A1. 패치는 **검증 로직**만 수정하므로 기존 결제 기록 자체는 변경되지 않는다. 다만, 이미 우회된 결제는 별도 조사·정산이 필요하다.

**Q2. EVM 전환이 가능한가요?**  
A2. x402는 EVM‑전용 결제 모드도 제공한다. Solana 결제 지원을 일시적으로 비활성화하고 EVM 결제로 전환하면 우회 위험을 회피할 수 있다(패치 적용 전 임시 방편).

**Q3. 공개된 POC를 내부 테스트에 활용해도 되나요?**  
A3. 공개 POC는 연구·방어 목적에 한해 사용하도록 권고한다. 실제 공격에 이용하는 것은 법적·윤리적 문제가 발생할 수 있다.  