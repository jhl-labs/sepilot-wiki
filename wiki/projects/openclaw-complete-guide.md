---
title: "OpenClaw Complete Guide"
description: "OpenClaw에 대한 전체 가이드와 최신 보안 위험 및 완화 방안에 대한 내용입니다."
category: "Guide"
tags: ["OpenClaw", "Security", "CrowdStrike", "Mitigation"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-22T00:00:00Z"
updatedAt: "2026-02-22T00:00:00Z"
---

# OpenClaw Complete Guide

OpenClaw는 오픈소스 AI 에이전트로, 다양한 LLM과 연동하여 개인 비서, 자동화 워크플로우 등을 구현할 수 있습니다. 본 가이드는 OpenClaw의 기본 사용법과 함께 최근 CrowdStrike 보고서에서 제시된 보안 위험 및 완화 방안을 다룹니다.

---

## 1. Overview

- **프로젝트명**: OpenClaw (이전 명: Clawdbot, Moltbot)
- **주요 기능**: 외부 콘텐츠(이메일, 웹 페이지, 문서) 처리, 플러그인 기반 확장, 로컬 및 클라우드 배포 지원
- **라이선스**: MIT

---

## 2. Installation

```bash
# npm을 이용한 전역 설치
npm install -g openclaw
```

설치 후 초기 설정 파일을 생성합니다.

```bash
openclaw init
```

---

## 3. Basic Usage

```bash
openclaw chat "오늘 날씨 알려줘"
```

---

## 4. Security Risks (CrowdStrike 보고서 기반)

CrowdStrike는 OpenClaw가 **실제 위험**을 가지고 있다고 경고했습니다. 주요 위험 요소는 다음과 같습니다.

### 4.1 Prompt‑Injection Attack Vectors
- **직접 프롬프트 인젝션**: 외부 콘텐츠에 악의적인 명령이 삽입되어 에이전트가 이를 실행합니다. 실제 사례로 지갑을 고갈시키는 페이로드가 보고되었습니다.
- **간접 프롬프트 인젝션**: 공격자가 컨텍스트를 조작해 에이전트가 비밀 정보를 유출하도록 유도합니다.

> “프롬프트 인젝션은 이론적인 문제가 아니라, 실제로 악용된 사례가 존재한다.” – CrowdStrike[출처](https://euno.news/posts/ko/crowdstrike-says-openclaw-is-dangerous-theyre-righ-5854d2)

### 4.2 Credential Theft
- OpenClaw는 파일 시스템에 접근할 수 있어 `~/.ssh/`, `~/.aws/`, `~/.gnupg/` 등 민감한 디렉터리를 읽을 수 있습니다.
- 성공적인 프롬프트 인젝션은 채팅 컨텍스트뿐 아니라 **자격 증명**까지 탈취합니다.

### 4.3 Agent‑Based Lateral Movement
- 침해된 에이전트가 시스템 간에 이동하여 쉘 접근 권한, API 키 등을 획득할 수 있습니다.
- 이는 단순 데이터 탈취를 넘어 **자동화된 악의적 행위**를 가능하게 합니다.

### 4.4 Large‑Scale Exposure
- 135 K+ 개의 OpenClaw 인스턴스가 공개적으로 노출되어 있으며, 다수가 암호화되지 않은 HTTP를 통해 제공됩니다.
- 기업 내부에서 표준 IT 워크플로우를 우회해 배포되는 경우가 빈번합니다.

---

## 5. Mitigation Strategies

### 5.1 Detection & Inventory
- **Falcon Next‑Gen SIEM**: `openclaw.ai`에 대한 DNS 요청을 모니터링합니다.
- **Falcon Exposure Management**: 엔드포인트 전반에 걸쳐 OpenClaw 패키지를 인벤토리화합니다.
- **Falcon for IT**: OpenClaw 제거를 위한 “Search & Removal Content Pack”을 제공합니다.

### 5.2 Runtime Protection with ClawMoat
ClawMoat은 MIT 라이선스 기반 오픈소스 보안 레이어로, 다음과 같은 기능을 제공합니다.

- **다중 레이어 프롬프트 인젝션 스캔**
  - 패턴 매칭, 구조 분석, 행동 점수화
- **자격 증명 보호**
  - 금지 구역(`~/.ssh/*`, `~/.aws/*` 등) 자동 차단
- **권한 티어 & 정책 엔진**
  - Observer → Worker → Standard → Full 단계별 권한 제한
- **네트워크 제어**
  - 허용/차단 도메인 리스트 관리

```bash
npm install -g clawmoat
clawmoat init   # 기본 정책 초기화
clawmoat protect --config clawmoat.yml   # 실시간 보호 시작
```

> “ClawMoat은 무료이며 오픈소스, 몇 초 만에 설치 가능” – ClawMoat 공식 문서[출처](https://github.com/darfaz/clawmoat)

### 5.3 Supply‑Chain Hardening Checklist
1. **패키지 검증**: 공식 레포지토리에서만 배포된 바이너리 사용.
2. **TLS 적용**: 모든 OpenClaw 인스턴스는 HTTPS(SSL/TLS)로 서비스.
3. **버전 관리**: 최신 보안 패치를 적용한 버전 사용.
4. **네트워크 제한**: 인바운드/아웃바운드 트래픽을 허용된 도메인으로 제한.
5. **시크릿 스캐닝**: CI/CD 파이프라인에 시크릿 탐지 도구 통합.
6. **모니터링**: Falcon, ClawMoat 등 EDR/SIEM 솔루션으로 실시간 감시.
7. **접근 제어**: 최소 권한 원칙에 따라 에이전트 실행 권한 설정.
8. **인벤토리**: 조직 내 모든 OpenClaw 인스턴스 목록화 및 정기 감사.

---

## 6. References
- CrowdStrike 보고서 요약: “What Security Teams Need to Know About OpenClaw” – euno.news[출처](https://euno.news/posts/ko/crowdstrike-says-openclaw-is-dangerous-theyre-righ-5854d2)
- ClawMoat 프로젝트: GitHub Repository[출처](https://github.com/darfaz/clawmoat)
- 추가 기사: CIO.com 보안 리스크 분석[출처](https://www.cio.com/article/4131963/%EC%98%A4%ED%94%88%ED%81%B4%EB%A1%9C%EB%B0%9C-%EB%B3%B4%EC%95%88-%EB%A6%AC%EC%8A%A4%ED%81%AC-%ED%99%95%EC%82%B0)

---

*이 문서는 자동 생성된 초안이며, 검토 후 `published` 상태로 전환해 주세요.*