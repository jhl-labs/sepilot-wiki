---
title: "Gemini 3.1 Pro"
description: "Gemini 3.1 Pro 모델의 출시 정보, 사양, 공식 벤치마크 결과를 정리한 가이드입니다."
category: "Guide"
tags: ["Gemini", "AI", "Benchmark"]
status: "draft"
issueNumber: 359
createdAt: "2026-02-20T02:10:00Z"
updatedAt: "2026-02-20T02:10:00Z"
order: 9
related_docs: ["gemini-3-1.md", "glm-5.md"]
---

# Gemini 3.1 Pro

## 개요
Gemini 3.1 Pro는 Google이 2026년 2월 19일에 발표한 최신 대형 언어 모델(Large Language Model)입니다. 기존 Gemini 3 시리즈를 기반으로 **복잡한 추론**과 **멀티모달** 작업에서 크게 향상된 성능을 제공합니다. 모델은 **Gemini API**, **Vertex AI**, **Gemini 앱**, **NotebookLM** 등을 통해 접근할 수 있습니다.

- **출시일**: 2026‑02‑19
- **입력 컨텍스트**: 최대 1 M 토큰
- **출력 컨텍스트**: 최대 64 K 토큰
- **파라미터 수**: 공개되지 않음 (삭제)

> 자세한 내용은 공식 블로그와 모델 카드를 참고하세요.
> - 공식 블로그: [Gemini 3.1 Pro 발표](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/)  
> - 모델 카드: [Gemini 3.1 Pro Model Card](https://deepmind.google/models/model-cards/gemini-3-1-pro/)

## 주요 벤치마크 (공식 모델 카드 기준)
| 벤치마크 | 점수 / 성능 | 비고 |
|---|---|---|
| **ARC‑AGI‑2** | **77.1 %** | 새로운 논리 패턴 해결 능력
| **GPQA Diamond** | **94.3 %** | 과학 지식 평가
| **SWE‑Bench Verified** | **80.6 %** | 에이전트 기반 코딩 과제 (단일 시도)
| **Humanity's Last Exam** (with tools) | **51.4 %** | 도구 사용 포함 평가
| **MMMU‑Pro** | **80.5 %** | 멀티모달 이해 및 추론
| **LiveCodeBench Pro** | **2887 Elo** | 경쟁 코딩 문제 (Codeforces, ICPC, IOI)
| **Terminal‑Bench 2.0** | **68.5 %** | 에이전트 기반 터미널 코딩
| **MRCR v2** (128 k context) | **84.9 %** | 장기 컨텍스트 성능

> 위 수치는 모두 **Gemini 3.1 Pro 모델 카드**에 명시된 공식 결과이며, 다른 모델과의 직접 비교 표는 현재 확인된 데이터가 없으므로 포함하지 않았습니다.

## 활용 예시
- **복잡한 시스템 합성**: 대규모 API와 사용자 인터페이스를 연결하는 대시보드 자동 생성
- **코드 기반 애니메이션**: 텍스트 프롬프트에서 SVG 애니메이션을 생성하여 파일 크기 최소화
- **멀티모달 데이터 분석**: 텍스트·이미지·비디오·오디오를 동시에 처리하여 종합적인 인사이트 도출
- **에이전트 워크플로우**: Gemini 3.1 Pro를 기반으로 한 자동화 에이전트가 복합 작업을 순차적으로 수행

## 참고 자료
- **공식 블로그**: Gemini 3.1 Pro 발표 – https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/
- **모델 카드**: Gemini 3.1 Pro – https://deepmind.google/models/model-cards/gemini-3-1-pro/

---
*이 문서는 유지보수자를 위해 초안(draft) 상태로 저장되었습니다. 필요에 따라 추가 검토 및 업데이트가 이루어질 수 있습니다.*