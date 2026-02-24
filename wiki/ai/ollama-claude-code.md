---
title: "Ollama와 Claude Code 연결 방법"
description: "Ollama와 Claude Code를 연동하여 로컬 모델을 사용하는 방법을 단계별로 안내합니다."
category: "Guide"
tags: ["Ollama", "Claude Code", "로컬 모델", "AI 통합", "가이드"]
status: "draft"
issueNumber: 0
createdAt: "2026-02-24T12:40:00Z"
updatedAt: "2026-02-24T12:40:00Z"
---

# Ollama와 Claude Code 연결 방법

## 1. 개요
Claude Code는 Anthropic이 제공하는 **agentic coding tool** 으로, 로컬 디렉터리의 코드를 읽고, 수정하고, 실행할 수 있습니다. Ollama는 Anthropic‑compatible API를 제공하므로, Ollama에 설치된 모델을 Claude Code와 바로 연결해 로컬에서 코딩 보조 AI를 사용할 수 있습니다. 본 가이드는 최신 Ollama Integration 문서([Claude Code – Ollama](https://docs.ollama.com/integrations/claude-code))를 기반으로 작성되었습니다.

## 2. 사전 준비
| 항목 | 권장 사양 / 도구 |
|------|-----------------|
| 운영 체제 | macOS 12+, Linux (Ubuntu 20.04+), Windows 10+ |
| 하드웨어 | CPU ≥ 4 코어, 메모리 ≥ 8 GB (GPU 선택적) |
| 필수 도구 | `curl`, `git`, 터미널 |
| 네트워크 | 로컬 포트 **11434**(기본) 개방 여부 확인 |

## 3. Ollama 설치 및 기본 설정
1. **설치**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   (macOS/리눅스) 혹은 Windows에서는 PowerShell 스크립트를 사용합니다.
2. **서비스 시작**
   ```bash
   ollama serve   # 백그라운드에서 API 서버 실행
   ```
3. **기본 모델 다운로드 예시**
   ```bash
   ollama pull llama3   # 원하는 모델을 pull 하면 로컬에 저장됩니다.
   ```
4. **API 엔드포인트**
   Ollama는 `http://localhost:11434` 에 Anthropic Messages API 호환 엔드포인트를 제공합니다. Claude Code는 이 주소를 통해 모델에 접근합니다.

## 4. Claude Code 설치
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
설치가 완료되면 `claude` 명령이 사용 가능해집니다.

## 5. 연동을 위한 환경 변수 설정
Claude Code는 Anthropic API와 호환되는 환경 변수를 통해 Ollama와 연결됩니다.
```bash
export ANTHROPIC_BASE_URL=http://localhost:11434
export ANTHROPIC_API_KEY=""          # 빈 문자열 또는 임시값 "ollama"
export ANTHROPIC_AUTH_TOKEN=ollama   # 옵션, 일부 경우 필요
```
위 변수를 영구적으로 적용하려면 `~/.bashrc` 혹은 `~/.zshrc` 에 추가합니다.

## 6. Quick Setup (한 줄 명령) 
```bash
ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_API_KEY="" ANTHROPIC_AUTH_TOKEN=ollama claude --model qwen3-coder
```
환경 변수를 한 번에 지정하고 바로 Claude Code를 실행합니다. 테스트용으로 편리합니다.

## 7. Manual Setup (영구 설정) 
1. 위 **환경 변수**를 쉘 설정 파일에 저장합니다.
2. Ollama에서 원하는 모델을 pull 합니다.
   ```bash
   ollama pull qwen3-coder
   ollama pull glm-4.7
   ```
3. Claude Code 실행 시 모델만 지정합니다.
   ```bash
   claude --model qwen3-coder
   ```

## 8. 권장 모델
| 모델 | 비고 |
|------|------|
| `qwen3-coder` | 코드 생성에 최적화된 모델 |
| `glm-4.7` | 다목적, 높은 컨텍스트 길이 지원 |
| `gpt-oss:20b` | 오픈소스 GPT 계열, 20B 파라미터 |
| `gpt-oss:120b` | 대규모 모델, 높은 메모리 요구 |

클라우드 모델도 `ollama.com/search?c=cloud` 에서 검색해 사용할 수 있습니다.

## 9. 연동 검증
```bash
claude "Python으로 파일 읽기 예제 코드를 보여줘."
```
정상적으로 동작하면 Claude Code가 Ollama에서 실행 중인 `qwen3-coder` 모델의 결과를 반환합니다.

## 10. 트러블슈팅
| 오류 | 원인 | 해결 방안 |
|------|------|-----------|
| `connection refused` | Ollama 서비스가 실행되지 않음 | `ollama serve` 로 서비스 시작 확인 |
| `401 Unauthorized` | `ANTHROPIC_API_KEY` 설정 오류 | `export ANTHROPIC_API_KEY=""` 로 빈 문자열 지정 |
| 포트 충돌 | 다른 프로세스가 11434 사용 | `export ANTHROPIC_BASE_URL=http://localhost:11435` 후 `ollama serve --port 11435` |
| 모델 로드 실패 | 모델 파일 손상 | `ollama pull <model>` 로 재다운로드 |

## 11. 참고 자료
- Claude Code – Ollama Integration: <https://docs.ollama.com/integrations/claude-code>[[Claude Code - Ollama](https://docs.ollama.com/integrations/claude-code)]
- Ollama 공식 설치 가이드
- Community tutorials (Reddit, Habr 등) – 최신 사용 사례 참고

---
