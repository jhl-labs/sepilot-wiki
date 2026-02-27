---
title: Docker Model Runner가 macOS Apple Silicon에서 vLLM을 지원합니다
author: SEPilot AI
status: published
tags: [Docker, Model Runner, vLLM, macOS, Apple Silicon, LLM Inference]
---

## 개요
이 문서는 Docker Model Runner에 새롭게 추가된 **vllm‑metal** 백엔드를 통해 macOS Apple Silicon 환경에서 고성능 LLM 서빙을 수행하는 방법을 안내합니다.  
대상 독자는  
- LLM 서빙을 컨테이너화하고자 하는 개발자  
- Docker Model Runner를 기존 Linux/GPU 또는 Windows WSL2 환경에서 사용하던 엔지니어  
- Apple Silicon(M‑series) 기반 로컬 개발·테스트 환경을 구축하려는 데이터 사이언티스트  

주요 업데이트  
- Docker Model Runner가 **vllm‑metal** 백엔드를 지원, macOS Apple Silicon에서 Metal GPU를 활용한 vLLM 추론 가능[[Docker Blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/)]  
- OpenAI 호환 API와 Anthropic 호환 API를 동일한 Docker 워크플로우에서 제공  

관련 기술 스택 및 용어 정의  
| 용어 | 정의 |
|------|------|
| **vLLM** | 고처리량(throughput) LLM 서빙을 위한 오픈소스 추론 엔진 |
| **Docker Model Runner** | 로컬·클라우드에서 컨테이너 기반 LLM 추론을 간편하게 실행하도록 설계된 Docker 제품 |
| **Metal** | Apple GPU를 위한 저수준 그래픽·컴퓨팅 프레임워크 |
| **MLX** | Apple Silicon 전용 머신러닝 프레임워크, Metal 위에서 동작 |
| **vllm‑metal** | vLLM에 Metal 기반 추론을 제공하는 플러그인, Docker와 vLLM 프로젝트 협업 결과 |

---

## 배경
### vLLM 소개
vLLM은 대규모 언어 모델(LLM)의 고처리량 서빙을 목표로 설계된 엔진으로, 효율적인 토큰 스케줄링과 GPU 메모리 관리 기능을 제공해 개발자 사이에서 빠르게 표준으로 자리 잡았습니다[[Docker Blog](https://www.docker.com/blog/docker-model-runner-integrates-vllm/)].

### 기존 Docker Model Runner 지원 현황
- **Linux (NVIDIA GPU)**: vLLM 백엔드가 기본 제공되어 GPU 가속 추론 가능  
- **Windows (WSL2)**: Linux와 동일한 이미지가 WSL2 환경에서 동작하도록 확장[[Docker Blog](https://www.docker.com/blog/docker-model-runner-integrates-vllm/)]  

### Apple Silicon에서 LLM 추론 필요성
M‑series 칩은 높은 연산 효율과 낮은 전력 소모를 제공하지만, 기존 vLLM은 CUDA 기반 GPU에 종속돼 있어 macOS에서는 직접 사용이 어려웠습니다. 따라서 로컬 개발·테스트 환경을 macOS에 그대로 두고 싶어하는 사용자에게 별도 솔루션이 요구되었습니다.

---

## vllm‑metal 백엔드 소개
- **정의**: vLLM 엔진에 Metal GPU를 활용하도록 하는 플러그인으로, Apple Silicon 전용 MLX와 PyTorch를 연결해 하나의 추론 파이프라인을 구성합니다[[Docker Blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/)].
- **협업 배경**: Docker와 vLLM 프로젝트가 공동으로 개발했으며, MLX와 PyTorch를 통합해 기존 vLLM API와 호환성을 유지합니다[[Docker Blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/)].
- **지원 API**  
  - **OpenAI 호환**: `/v1/completions`, `/v1/chat/completions` 등 표준 엔드포인트 제공  
  - **Anthropic 호환**: Claude Code 등 Anthropic 모델을 위한 엔드포인트 제공  

---

## 아키텍처 상세
```
+-------------------------------------------------------------+
|                          vLLM Core                         |
|  Engine | Scheduler | API | Tokenizer                       |
+-------------------------------------------------------------+
                |
                v
+-------------------------------------------------------------+
|                vllm_metal Plugin Layer                      |
|  +-----------+  +-----------+  +------------------------+   |
|  | Platform  |  | Worker    |  | ModelRunner            |   |
|  +-----------+  +-----------+  +------------------------+   |
+-------------------------------------------------------------+
                |
                v
+-------------------------------------------------------------+
|                하위 실행 엔진 (MLX, PyTorch)               |
+-------------------------------------------------------------+
```
- **vLLM Core**: 기존 엔진·스케줄러·토크나이저·API는 그대로 유지됩니다.  
- **Plugin Layer**: `MetalPlatform`, `MetalWorker`, `MetalModelRunner`가 Apple Silicon 특화 로직을 담당합니다.  
- **하위 엔진**:  
  - **MLX**: Metal 위에서 실제 텐서 연산을 수행하는 Apple 전용 프레임워크  
  - **PyTorch**: 모델 가중치 로드·변환을 담당, 필요 시 `torch`‑Metal 빌드를 사용  

Metal GPU 활용 흐름  
1. Docker 컨테이너가 시작되면 `MetalPlatform`이 시스템 Metal 디바이스를 탐색합니다.  
2. `MetalWorker`가 MLX를 통해 모델을 메모리로 매핑하고, PyTorch가 가중치를 로드합니다.  
3. `MetalModelRunner`가 vLLM 스케줄러와 연동해 요청을 받아 토큰을 생성하고, 결과를 API 서버를 통해 반환합니다.

---

## 설치 및 환경 설정
| 항목 | 요구 사항 |
|------|-----------|
| **macOS 버전** | macOS 12.3 이상 (Apple Silicon 지원) |
| **Apple Silicon 모델** | M1, M2, M3 계열 모두 지원 |
| **Docker Desktop** | Docker Desktop 4.30 이상 (macOS Apple Silicon용) |
| **Docker Model Runner** | `docker model-runner install` 명령으로 최신 버전 설치 |

### 설치 단계
1. Docker Desktop 최신 버전 설치 후 실행  
2. 터미널에서 Model Runner 설치  
   ```bash
   docker model-runner install
   ```  
3. vllm‑metal 플러그인 활성화 (Model Runner CLI 옵션)  
   ```bash
   docker model-runner start --backend vllm-metal
   ```  
4. 필요 시 MLX와 PyTorch 의존성을 자동으로 다운로드하도록 설정 (Model Runner가 내부적으로 처리)  

> **주의**: 현재 macOS용 vLLM Docker 이미지가 공식적으로 제공되지 않으며, 로컬에서 소스 빌드가 필요합니다[[vLLM 포럼](https://discuss.vllm.ai/t/vllm-docker-image-for-mac-cpu-silicon/1583)].

---

## 사용 방법
### 기본 실행 커맨드
```bash
docker run -d \
  -p 8000:8000 \
  --name vllm-metal-runner \
  ghcr.io/docker/model-runner:vllm-metal
```  
위 명령은 컨테이너를 백그라운드에서 실행하고, 로컬 8000 포트에 OpenAI 호환 API 서버를 노출합니다.

### OpenAI 호환 API 엔드포인트
- **URL**: `http://localhost:8000/v1/completions`  
- **예시 요청** (curl)
  ```bash
  curl http://localhost:8000/v1/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"meta-llama/Meta-Llama-3-8B","prompt":"Hello, world!","max_tokens":50}'
  ```

### Anthropic 호환 API 사용 예시
- **URL**: `http://localhost:8000/v1/anthropic/completions`  
- **예시 요청** (curl)
  ```bash
  curl http://localhost:8000/v1/anthropic/completions \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-code","prompt":"Write a Python function to reverse a string.","max_tokens":100}'
  ```

### 모델 로드 및 추론 파라미터 지정
Model Runner CLI에서 `--model` 옵션으로 safetensors 형식 모델 경로를 지정합니다. 예:
```bash
docker model-runner start --backend vllm-metal --model /models/Meta-Llama-3-8B.safetensors
```
추가 파라미터(`temperature`, `top_p` 등)는 API 요청 본문에 포함하면 됩니다.

---

## 성능 및 벤치마크
공식 블로그에서는 **macOS Apple Silicon**과 **Linux GPU** 간의 정량적 벤치마크 수치를 아직 공개하지 않았습니다. 현재 알려진 내용은:

- Metal GPU를 활용해 Apple Silicon에서도 **고처리량** 추론이 가능하다는 점[[Docker Blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/)]  
- 동일한 OpenAI 호환 API를 제공하므로 기존 워크플로우와 호환성이 유지됩니다.

> **추가 조사 필요**: 정확한 지연 시간(latency), 처리량(throughput), 메모리 사용량 등에 대한 실측 데이터는 추후 Docker 또는 vLLM 커뮤니티에서 제공될 예정입니다.

---

## 호환성 및 제한 사항
| 항목 | 내용 |
|------|------|
| **지원 모델 포맷** | `safetensors` 등 vLLM이 지원하는 포맷 전체(버전 제한 없음) |
| **제한 기능** | 일부 커스텀 연산(예: GPU 전용 CUDA 커널) 은 Metal에서 지원되지 않음 |
| **macOS 업데이트** | 주요 macOS 버전(12.x → 13.x) 업그레이드 시 Metal SDK 호환성 확인 필요 |
| **CPU 전용 모드** | 현재 vllm‑metal은 Metal GPU 사용을 전제로 하며, 순수 CPU 모드는 제공되지 않음 |

---

## 마이그레이션 가이드
1. **컨테이너 이미지 재빌드**  
   - 기존 Linux용 `docker model-runner` 이미지 태그를 macOS용 `vllm-metal` 태그로 교체  
   - `Dockerfile`에 `FROM ghcr.io/docker/model-runner:base` 대신 `vllm-metal` 베이스 사용  

2. **환경 변수 이전**  
   - `MODEL_PATH`, `API_KEY`, `PORT` 등 기존 변수는 그대로 유지 가능  
   - Metal 전용 옵션(`METAL_DEVICE=default`)을 추가  

3. **설정 파일 검토**  
   - `model-runner.yaml`에 `backend: vllm-metal` 항목을 명시  

4. **테스트**  
   - 로컬에서 `docker compose up` 후 API 호출 테스트 수행  

---

## 보안 및 운영 고려사항
- **컨테이너 보안**: 최신 Docker Desktop 보안 패치를 적용하고, 최소 권한 원칙에 따라 `--user` 옵션으로 비루트 사용자 실행 권장  
- **API 인증**: OpenAI 호환 API는 기본적으로 토큰 기반 인증을 지원하므로, `Authorization: Bearer <TOKEN>` 헤더를 사용해 접근 제어 구현  
- **로그·모니터링**: Docker Desktop의 **Insights** 또는 `docker logs` 명령으로 추론 로그 확인 가능. Prometheus·Grafana와 연동하려면 `--metrics` 플래그를 활성화  

---

## 트러블슈팅
| 증상 | 원인 후보 | 해결 방안 |
|------|-----------|-----------|
| **컨테이너 시작 시 Metal 초기화 실패** | macOS 버전이 낮거나 Apple Silicon 드라이버 미설치 | macOS 12.3 이상으로 업데이트, `xcode-select --install` 실행 |
| **모델 로드 오류 (Unsupported wheel)** | PyTorch‑Metal 바이너리 미설치 | `pip install torch==2.2.0+cpu` 등 공식 PyTorch‑Metal 빌드 설치 (공식 문서 참고) |
| **추론 속도 저하** | 메모리 스와핑 또는 GPU 메모리 부족 | 모델 크기를 줄이거나 `--max_batch_size` 파라미터 조정 |
| **API 인증 오류** | 잘못된 `Authorization` 헤더 | 토큰 형식 확인 후 재전송 |

---

## FAQ
**Q1. Docker Model Runner는 Apple Silicon 전용인가?**  
A: 아니요. Linux (NVIDIA GPU)와 Windows (WSL2)에서도 동일한 Model Runner를 사용할 수 있습니다. macOS는 새롭게 추가된 **vllm‑metal** 백엔드만 지원합니다[[Docker Blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/)].

**Q2. GPU가 아닌 CPU만 사용할 수 있는가?**  
A: 현재 vllm‑metal은 Metal GPU를 전제로 설계되었습니다. 순수 CPU 모드가 필요하면 기존 Linux용 vLLM CPU 백엔드를 사용해야 합니다.

**Q3. 다른 LLM 프레임워크와 병행 사용이 가능한가?**  
A: Docker Model Runner는 하나의 컨테이너 안에서 하나의 백엔드(vLLM)만 실행합니다. 다른 프레임워크(예: Ollama, Text Generation Inference)를 사용하려면 별도 컨테이너를 배포해야 합니다.

---

## 참고 자료
- **Docker 공식 블로그 포스트**: “Docker Model Runner Brings vLLM to macOS with Apple Silicon” – <https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/>  
- **vllm‑metal GitHub 레포지토리**: <https://github.com/vllm-project/vllm-metal>  
- **MLX 공식 문서**: <https://ml-explore.github.io/mlx/>  
- **PyTorch Metal 지원 페이지**: <https://pytorch.org/docs/stable/notes/mps.html>  
- **vLLM 포럼 – macOS Docker 이미지 논의**: <https://discuss.vllm.ai/t/vllm-docker-image-for-mac-cpu-silicon/1583>  

---