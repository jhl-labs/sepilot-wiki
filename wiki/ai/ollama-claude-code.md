---
title: Ollama와 Claude Code 연결 방법
author: SEPilot AI
status: draft
tags: [Ollama, Claude Code, 로컬 모델, AI 통합, 가이드]
order: 13
---

## 1. 문서 개요
- **목적**: Ollama와 Claude Code를 연동하여 로컬 LLM을 활용하는 절차를 상세히 안내합니다.  
- **대상 독자**: 개발자, AI 엔지니어, 데이터 사이언티스트 등 로컬 모델 운영에 관심 있는 기술 사용자.  
- **기대 효과**  
  - 클라우드 비용 절감  
  - 모델 커스터마이징 및 빠른 피드백 루프 제공  

## 2. 사전 준비
| 항목 | 권장 사양 / 도구 | 비고 |
|------|----------------|------|
| 운영 체제 | Windows 10 이상 / macOS 12 이상 / Linux (Ubuntu 20.04 이상) | Ollama는 공식적으로 macOS, Linux, Windows 10 이상에서 지원됩니다. |
| 하드웨어 | CPU ≥ 4 코어, 메모리 ≥ 8 GB (GPU 선택적) | GPU 사용 시 모델 로딩 속도가 개선됩니다. |
| 필수 도구 | `curl`, `git`, 터미널, (선택) Docker | Docker는 Ollama를 컨테이너화할 때 활용 가능. |
| 네트워크 | 로컬 포트 **11434**(기본) 개방 여부 확인 | Ollama API는 기본적으로 `http://localhost:11434`에서 서비스됩니다. |

## 3. Ollama 설치 및 기본 설정
1. **설치**  
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```  
   (공식 설치 스크립트는 Ollama 홈페이지에서 제공됩니다.)  

2. **서비스 시작 / 중지**  
   - 시작: `ollama serve`  
   - 중지: `ollama stop`  

3. **기본 모델 다운로드 예시**  
   ```bash
   ollama pull llama3
   ```  

4. **로컬 API 엔드포인트 확인**  
   기본 엔드포인트는 `http://localhost:11434/v1/messages`이며, Claude Code는 이 **Anthropic Messages API 호환** 엔드포인트에 연결합니다[[Claude Code - Ollama's documentation](https://docs.ollama.com/integrations/claude-code)].

## 4. Claude Code 설치
1. **설치 스크립트 실행**  
   ```bash
   curl -fsSL https://claude.ai/install.sh | bash
   ```  
   (공식 설치 가이드에 명시된 명령)  

2. **CLI/GUI 실행**  
   - CLI: `claude` 명령으로 실행  
   - GUI: 설치 후 자동으로 데스크톱 아이콘이 생성됩니다.  

3. **버전 확인 및 업데이트**  
   ```bash
   claude --version
   ```  
   최신 버전은 공식 설치 스크립트를 재실행하면 업데이트됩니다.

## 5. 연동을 위한 환경 변수 설정
Claude Code는 **Anthropic API**와 호환되는 환경 변수를 통해 Ollama와 연결됩니다.

| 변수 | 값 | 설명 |
|------|----|------|
| `ANTHROPIC_BASE_URL` | `http://localhost:11434` | Ollama가 제공하는 로컬 엔드포인트 |
| `ANTHROPIC_API_KEY` | `""` (빈 문자열) 또는 임시값 `ollama` | 실제 API 키가 필요 없으며, 빈 문자열 혹은 `ollama` 로 설정 |
| `ANTHROPIC_AUTH_TOKEN` | `ollama` (옵션) | 일부 경우 인증 토큰을 명시적으로 지정 |

**영구 적용**  
```bash
echo 'export ANTHROPIC_BASE_URL=http://localhost:11434' >> ~/.bashrc
echo 'export ANTHROPIC_API_KEY=""' >> ~/.bashrc
source ~/.bashrc
```  

## 6. 모델 추가 및 선택
1. **Ollama에 모델 푸시**  
   ```bash
   ollama pull qwen3-coder
   ollama pull gpt-oss:20b
   ```  

2. **Claude Code에서 모델 지정**  
   ```bash
   claude --model qwen3-coder
   ```  

3. **파라미터 설정 팁**  
   - `temperature`와 `max_tokens`는 Claude Code 실행 시 옵션으로 전달 가능 (예: `claude --model qwen3-coder --temperature 0.7 --max-tokens 1024`).  
   - 구체적인 파라미터 값은 모델마다 다르므로, 모델 문서를 참고하세요.

## 7. Quick Setup vs Manual Setup
| 구분 | 명령 예시 | 특징 |
|------|----------|------|
| **Quick Setup** | `ANTHROPIC_BASE_URL=http://localhost:11434 ANTHROPIC_API_KEY="" claude --model qwen3-coder` | 한 줄 명령으로 즉시 연동. 환경 변수를 일시적으로 적용. |
| **Manual Setup** | 환경 변수를 `.bashrc`에 영구 저장 후 `claude --model qwen3-coder` 실행 | 단계별 설정으로 재사용성·가독성 향상. 복잡한 인증 토큰이 필요할 경우 활용. |

- **장점**: Quick Setup은 테스트에 유리, Manual Setup은 운영 환경에 적합.  
- **적용 시나리오**: 빠른 검증 → Quick Setup, 지속적인 개발·배포 → Manual Setup.

## 8. 연동 검증 및 테스트
1. **프롬프트 실행 예시**  
   ```bash
   claude "Python으로 파일 읽기 예제 코드를 보여줘."
   ```  

2. **응답 확인**  
   - 정상적인 경우 Claude Code가 Ollama에서 실행 중인 `qwen3-coder` 모델의 결과를 반환합니다.  

3. **로그 확인**  
   - Ollama 로그: `ollama logs`  
   - Claude Code 디버그: `claude --debug`  

4. **성능 측정**  
   - 응답 시간은 로컬 하드웨어와 모델 크기에 따라 달라집니다.  
   - 토큰 사용량은 Claude Code UI 혹은 `--verbose` 옵션으로 확인 가능.

## 9. 트러블슈팅 가이드
| 오류 | 원인 | 해결 방안 |
|------|------|-----------|
| **연결 거부** (`connection refused`) | Ollama 서비스가 실행되지 않음 또는 포트 11434가 차단됨 | `ollama serve` 실행 확인, 방화벽 설정 점검 |
| **인증 실패** (`401 Unauthorized`) | `ANTHROPIC_API_KEY`가 잘못 설정됨 | `ANTHROPIC_API_KEY=""` 혹은 `ollama` 로 재설정 |
| **포트 충돌** | 다른 프로세스가 11434 포트를 사용 | `export ANTHROPIC_BASE_URL=http://localhost:11435` 로 포트 변경 후 Ollama 재시작 (`ollama serve --port 11435`) |
| **모델 로드 실패** | 모델 파일 손상 또는 다운로드 미완료 | `ollama pull <model>` 로 재다운로드 |

**디버깅 도구**  
- `curl http://localhost:11434/v1/models` 로 API 가용성 확인  
- 커뮤니티 포럼: Ollama GitHub Issues, Claude Code 공식 포럼 등  

## 10. 베스트 프랙티스 및 참고 자료
- **자동화 스크립트 예시**  
  ```bash
  #!/usr/bin/env bash
  export ANTHROPIC_BASE_URL=http://localhost:11434
  export ANTHROPIC_API_KEY=""
  ollama pull qwen3-coder
  claude --model qwen3-coder "$@"
  ```  
- **보안 권고**  
  - 로컬 네트워크에 외부 접근을 차단하고, 필요 시 VPN을 사용합니다.  
  - API 키(비어 있더라도)와 인증 토큰은 환경 변수 파일에 평문으로 저장하지 말고, `dotenv` 등 안전한 방법을 활용합니다.  

- **공식 문서**  
  - Ollama Integration – Claude Code: <https://docs.ollama.com/integrations/claude-code>[[Claude Code - Ollama's documentation](https://docs.ollama.com/integrations/claude-code)]  
  - TILNOTE 가이드: <https://tilnote.io/pages/6976f335d9c8b2d35781b893>[[Claude Code에서 Ollama 모델 사용하는 방법 - TILNOTE](https://tilnote.io/pages/6976f335d9c8b2d35781b893)]  

- **커뮤니티 리소스**  
  - Peterica 블로그: “Ollama launch + GLM‑4.7‑Flash로 로컬 Claude Code 실행하기” (설정 단계 상세)  
  - DataCamp 튜토리얼: “Using Claude Code With Ollama Local Models” (GPU 환경 예시)  

## 11. 부록 (옵션)

### Docker 기반 Ollama 배포 예시
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama:latest
```
(공식 Docker 이미지가 제공되는 경우 사용)

### OS 별 설치 차이점 표

| OS | Ollama 설치 | Claude Code 설치 |
|----|-------------|-------------------|
| Windows | `curl -fsSL https://ollama.com/install.ps1 | powershell -` | 동일 `curl` 스크립트 사용 |
| macOS | Homebrew: `brew install ollama` | 동일 `curl` 스크립트 |
| Linux | `curl -fsSL https://ollama.com/install.sh | sh` | 동일 `curl` 스크립트 |

### FAQ
- **Q: GPU 없이도 모델을 실행할 수 있나요?**  
  A: 네, CPU만으로도 실행 가능하지만 속도가 느릴 수 있습니다.  
- **Q: 여러 모델을 동시에 사용할 수 있나요?**  
  A: Ollama는 포트당 하나의 모델만 서비스하지만, 모델 이름을 지정해 전환할 수 있습니다.  

---