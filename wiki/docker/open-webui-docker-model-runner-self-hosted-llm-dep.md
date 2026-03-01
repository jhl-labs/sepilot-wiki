---
title: Open WebUI + Docker Model Runner – Self‑Hosted LLM Deployment Guide
author: SEPilot AI
status: published
tags: [Open WebUI, Docker, Model Runner, LLM, Self‑Hosted, Deployment]
quality_score: 80
---

## 1. 소개 및 목표
- **Open WebUI**는 로컬 혹은 온‑프레미스 환경에서 LLM을 대화형 UI로 제공하는 오픈소스 인터페이스이며, Ollama·OpenAI 등 다양한 백엔드와 연동할 수 있습니다[[Open WebUI GitHub](https://github.com/open-webui/open-webui)].
- **Docker Model Runner**는 Docker Desktop 4.40 이상에서 제공되는 실험적 기능으로, `docker model` 명령 하나로 LLM을 다운로드·서빙하고 GPU 가속까지 지원합니다[[Docker Model Runner Docs](https://docs.docker.com/desktop/)].
- **셀프‑호스팅 LLM**의 주요 장점  
  - **프라이버시**: 데이터가 외부 서비스로 전송되지 않음.  
  - **비용 절감**: 클라우드 API 호출 비용이 사라짐.  
  - **커스터마이징**: 모델 버전·프롬프트·플러그인 등을 자유롭게 조정 가능.  
- 이 가이드는 **Docker Desktop**(또는 Docker Engine) 환경에서 **Open WebUI**와 **Docker Model Runner**를 연동해 로컬 LLM을 배포하고, 보안·성능·운영까지 다루는 엔드‑투‑엔드 흐름을 제공합니다.

---

## 2. 사전 준비
| 항목 | 권장/필수 사항 | 비고 |
|------|----------------|------|
| **운영 체제** | macOS, Windows 10/11, Linux (Docker Desktop 지원) | Docker Desktop 4.40 이상 필요[[Docker Model Runner Docs](https://docs.docker.com/desktop/)] |
| **Docker Desktop** | 최신 버전(4.40 이상) 설치 및 실행 | Extensions → Model Runner 활성화 필요 |
| **하드웨어** | CPU와 메모리는 선택한 모델 크기에 따라 다름. 8 GB 이상의 RAM을 권장하지만, 모델에 따라 더 많이 필요할 수 있음. GPU 사용 시 NVIDIA GPU와 최신 드라이버 필요[[Docker Model Runner Docs](https://docs.docker.com/desktop/)] |
| **계정·권한** | Docker Hub 로그인(이미지 Pull 필요)·sudo(리눅스) 권한 | |
| **네트워크·포트** | 기본 UI 포트 3000(또는 8080) 개방·외부 모델 다운로드를 위한 인터넷 접근 | 포트 충돌 시 `-p <host>:<container>` 옵션으로 변경 가능 |

> **주의**: GPU 가속을 사용하려면 **NVIDIA Container Toolkit**을 별도 설치하고 Docker Desktop 설정에서 “Enable GPU support”를 켜야 합니다[[Docker Model Runner Docs](https://docs.docker.com/desktop/)].

---

## 3. Docker Desktop & Model Runner 설치
1. **Docker Desktop 설치**  
   - 공식 설치 가이드: <https://www.docker.com/products/docker-desktop> (공식 사이트)  
   - 설치 후 **Settings → General**에서 “Use Docker Desktop as the default engine”을 확인.

2. **Model Runner 활성화**  
   - Docker Desktop UI → **Extensions** 탭 → **Model Runner** 설치(버튼 클릭).  
   - 설치가 완료되면 터미널에서 `docker model --help` 명령이 동작하는지 확인.

3. **기본 `docker model` 명령 구조**  

   ```bash
   # 모델 다운로드
   docker model pull <model-id>

   # 모델 서빙 (GPU 사용 시 --gpus 옵션)
   docker model serve <model-id> [--port <port>] [--gpus all]
   ```

   - `model-id`는 Docker Hub에 등록된 LLM 이름(예: `llama3:8b`)이며, `docker model pull` 명령이 자동으로 해당 모델을 다운로드합니다[[Run Local AI with Open WebUI + Docker Model Runner](https://www.docker.com/blog/open-webui-docker-desktop-model-runner/)].

4. **GPU 설정**  
   - NVIDIA 드라이버와 **NVIDIA Container Toolkit** 설치 후 Docker Desktop → **Resources → GPU**에서 “Enable GPU support”를 켭니다.  
   - 서빙 시 `--gpus all` 옵션을 추가하면 GPU 가속이 적용됩니다.

---

## 4. Open WebUI Docker 배포
### 4.1 이미지 Pull
```bash
docker pull ghcr.io/open-webui/open-webui:latest
```
(공식 이미지 위치: `ghcr.io/open-webui/open-webui`[[Open WebUI GitHub](https://github.com/open-webui/open-webui)]])

### 4.2 기본 `docker run` 예시
```bash
docker run -d \
  -p 3000:8080 \
  -v open-webui:/app/backend/data \
  -e WEBUI_PORT=8080 \
  -e OLLAMA_BASE_URL= \
  ghcr.io/open-webui/open-webui:latest
```
- `-v open-webui:/app/backend/data`는 대화 기록·설정 영구 저장을 위한 권장 볼륨입니다[[Open WebUI GitHub](https://github.com/open-webui/open-webui)].
- 환경 변수 `WEBUI_PORT`와 `OLLAMA_BASE_URL` 등은 필요에 따라 조정합니다.

### 4.3 Docker Compose 템플릿
```yaml
version: "3.8"

services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:latest
    container_name: open-webui
    ports:
      - "3000:8080"
    volumes:
      - open-webui:/app/backend/data
    environment:
      - WEBUI_PORT=8080
      - BACKEND_URL=http://model-runner:8081   # 추후 연동 단계에서 사용
    restart: unless-stopped

volumes:
  open-webui:
```
> **Tip**: `restart: unless-stopped`는 장기 운영 시 컨테이너 자동 복구를 보장합니다.

---

## 5. Model Runner와 Open WebUI 연동
1. **Model Runner 로컬 API 엔드포인트 확인**  
   - 기본 서빙 포트는 8081(예시)이며, `docker model serve` 실행 시 출력에 `Listening on http://0.0.0.0:8081` 형태로 표시됩니다.

2. **Open WebUI 환경 변수 설정**  
   - `BACKEND_URL` 또는 `MODEL_ENDPOINT`에 Model Runner의 주소를 지정합니다. 예시: `http://host.docker.internal:8081`(Docker Desktop에서 호스트 접근) 또는 `http://model-runner:8081`(Compose 네트워크 사용).

3. **Compose 파일에 두 컨테이너 동시 정의**  
   ```yaml
   version: "3.8"

   services:
     model-runner:
       image: docker/model-runner:latest   # 실제 이미지 이름은 Docker Desktop에 내장됨
       command: ["serve", "llama3:8b", "--port", "8081"]
       ports:
         - "8081:8081"
       restart: unless-stopped

     open-webui:
       image: ghcr.io/open-webui/open-webui:latest
       ports:
         - "3000:8080"
       volumes:
         - open-webui:/app/backend/data
       environment:
         - BACKEND_URL=http://model-runner:8081
       depends_on:
         - model-runner
       restart: unless-stopped

   volumes:
     open-webui:
   ```
   - `depends_on`는 Open WebUI가 Model Runner가 준비될 때까지 대기하도록 합니다.

4. **UI에서 로컬 모델 선택**  
   - Open WebUI에 접속(`http://localhost:3000`) 후 **Settings → Model** 메뉴에서 “Custom Endpoint” 혹은 “Local Model Runner” 옵션을 선택하면, 서빙 중인 모델이 자동으로 목록에 표시됩니다[[Run Local AI with Open WebUI + Docker Model Runner](https://www.docker.com/blog/open-webui-docker-desktop-model-runner/)].

---

## 6. 첫 번째 LLM 배포 (예: Llama 3‑8B)
1. **모델 다운로드**  
   ```bash
   docker model pull llama3:8b
   ```
   - Docker Hub에 등록된 Llama 3 8B 모델을 로컬 캐시로 가져옵니다[[Run Local AI with Open WebUI + Docker Model Runner](https://www.docker.com/blog/open-webui-docker-desktop-model-runner/)].

2. **모델 서빙**  
   ```bash
   docker model serve llama3:8b --port 8081
   # GPU 사용 시
   docker model serve llama3:8b --port 8081 --gpus all
   ```

3. **Open WebUI에서 모델 선택**  
   - UI → **Chat** 화면 → **Model** 드롭다운 → “Llama 3‑8B (local)” 선택.  
   - 기본 프롬프트 예시: `Hello, Llama! Explain the benefits of self‑hosted LLMs.`

4. **성능 확인**  
   - 응답 시간과 토큰 처리량은 모델 크기·하드웨어에 따라 달라집니다. 일반적인 CPU‑only 실행에서는 수 초, GPU 가속 시 1 초 이하 응답이 가능하다는 사용자 보고가 있습니다[[Bret Fisher YouTube](https://www.youtube.com/watch?v=3p2uWjFyI1U)].

---

## 7. 보안·격리 강화
| 보안 요소 | 적용 방법 | 참고 |
|-----------|----------|------|
| **Docker Hardened Images** | `docker pull docker/hardened:<tag>`(예시) 후 베이스 이미지로 사용. Docker Blog에서 무료 제공[[Docker Hardened Images](https://www.docker.com/blog/docker-hardened-images/)] | |
| **마이크로VM 샌드박스** | Docker Desktop → **Sandbox** 옵션 활성화. 마이크로VM 기반 격리로 코드 실행 시 파일 시스템·네트워크를 제한합니다[[Docker Blog – Sandbox](https://www.docker.com/blog/docker-sandbox/)] | |
| **시크릿 관리** | `docker secret create <name> <file>` 로 API 키·토큰 저장 후 컨테이너 `--secret` 옵션으로 주입. `.env` 파일은 `.gitignore`에 포함. | |
| **네트워크 격리** | 사용자 정의 bridge 네트워크(`docker network create isolated_net`) 사용, 필요 포트만 공개(`-p`). | |
| **이미지 서명** | Docker Content Trust(`DOCKER_CONTENT_TRUST=1`)를 활성화해 이미지 무결성 검증. | |

---

## 8. 고급 설정
### 8.1 GPU 가속 상세
1. NVIDIA 드라이버(버전 ≥ 450)와 **NVIDIA Container Toolkit** 설치 (`distribution=$(. /etc/os-release;echo $ID$VERSION_ID)` 등).  
2. Docker Desktop → **Resources → GPU**에서 “Enable GPU support” 체크.  
3. 서빙 시 `--gpus all` 옵션 사용.  

### 8.2 사용자 정의 모델 빌드
- `docker model build` 명령을 이용해 로컬 `ggml` 파일을 변환하고 레지스트리에 푸시 가능.  
- 로컬 레지스트리(`localhost:5000`)에 푸시 후 `docker model pull localhost:5000/my-model:latest` 로 사용.

### 8.3 멀티 모델 운영
- 여러 모델을 각각 다른 포트에서 서빙하고, Open WebUI에서 **Custom Endpoint**를 각각 지정.  
- 라우팅을 위해 Nginx 혹은 Traefik 같은 리버스 프록시를 앞단에 두어 `/model1`, `/model2` 경로로 분기 가능.

### 8.4 로그·모니터링
- 컨테이너 로그: `docker logs -f open-webui` / `docker logs -f model-runner`.  
- Prometheus exporter는 `docker run -p 9090:9090 prom/prometheus`와 같은 방식으로 연동 가능.  
- Grafana 대시보드 예시: `docker run -d -p 3000:3000 grafana/grafana`.

---

## 9. 문제 해결 가이드
| 문제 | 원인 | 해결 방법 |
|------|------|----------|
| **포트 충돌** (`Error: bind: address already in use`) | 이미 다른 서비스가 3000/8081 사용 | `docker compose.yml`에서 포트 매핑을 다른 포트로 변경 (`-p 3001:8080` 등) |
| **`docker model` 명령 인식 안 됨** | Model Runner Extension 미설치 | Docker Desktop → Extensions → Install **Model Runner** |
| **GPU 인식 실패** (`no GPUs found`) | NVIDIA Container Toolkit 미설치 또는 Docker Desktop GPU 옵션 비활성화 | 위 8.1 절차대로 재설치·설정 |
| **Open WebUI UI 로드 실패** (blank page) | 볼륨 권한 문제 또는 환경 변수 오타 | 볼륨 디렉터리 권한 확인(`chmod -R 777 ./open-webui`) 및 `docker compose config`로 env 검증 |
| **Model Runner 서빙 오류** (`model not found`) | 모델 ID 오타 또는 이미지 캐시 손상 | `docker model pull <model-id>` 재실행 후 `docker model serve` 재시도 |
| **컨테이너 재시작 루프** | `restart: unless-stopped`와 의존성 순환 | `depends_on` 설정 검토 및 `docker compose up --detach` 후 로그 확인 |

---

## 10. 유지보수 및 업데이트 전략
1. **이미지 최신화**  
   ```bash
   docker pull ghcr.io/open-webui/open-webui:latest
   docker pull docker/model-runner:latest   # Docker Desktop에 내장된 경우 자동 업데이트
   docker compose up -d --force-recreate
   ```
2. **데이터 볼륨 백업**  
   ```bash
   docker run --rm -v open-webui:/data -v $(pwd):/backup alpine \
     tar czf /backup/open-webui-backup-$(date +%F).tar.gz /data
   ```
3. **모델 업데이트**  
   - 새 버전 모델이 출시되면 `docker model pull <model-id>:newtag` 후 기존 컨테이너 재시작.  
   - 버전 관리 정책을 문서화하고, 필요 시 롤백용 이전 이미지 보관.

4. **자동화**  
   - `docker-compose.yml`에 `restart: unless-stopped`와 `healthcheck`를 정의해 장애 복구 자동화.  
   - CI/CD 파이프라인(GitHub Actions)에서 `docker compose pull && docker compose up -d` 를 정기 실행하도록 스케줄링.

---

## 11. FAQ
**Q1. 클라우드 없이 완전 오프라인 운영이 가능한가?**  
A. 네. 모델 파일을 로컬에 다운로드하고 Docker Model Runner와 Open WebUI만 실행하면 인터넷 연결 없이도 완전 오프라인 환경이 가능합니다[[Open WebUI + Docker Model Runner: 셀프 호스티드 모델, 제로 설정](https://euno.news/posts/ko/open-webui-docker-model-runner-self-hosted-models-a92a5a)].

**Q2. 다른 LLM 프레임워크(예: llama.cpp, vLLM)와 호환되는가?**  
A. Docker Model Runner는 내부적으로 `llama.cpp` 기반 엔진을 사용합니다[[Run Local AI with Open WebUI + Docker Model Runner](https://www.docker.com/blog/open-webui-docker-desktop-model-runner/)]。vLLM 등 별도 엔진을 사용하려면 직접 컨테이너를 빌드하고 Open WebUI의 `BACKEND_URL`을 해당 엔드포인트로 지정해야 합니다.

**Q3. 모델 라이선스·상업적 사용 제한은?**  
A. 모델마다 별도 라이선스가 적용됩니다. Docker Model Runner는 Docker Hub에 공개된 모델을 그대로 사용하므로, 해당 모델의 라이선스 조항을 반드시 확인해야 합니다. Open WebUI 자체는 Apache‑2.0 라이선스입니다[[Open WebUI GitHub](https://github.com/open-webui/open-webui)].

**Q4. Docker Desktop 없이 서버 환경에 배포하는 방법은?**  
A. Docker Engine만 설치된 Linux 서버에서도 동일한 명령(`docker model pull/serve` 및 `docker run`/`docker compose`)을 사용할 수 있습니다. 다만 GPU 가속을 위해서는 NVIDIA Docker Runtime을 별도 설정해야 합니다.

---

## 12. 참고 자료 및 링크
- **Docker Model Runner 공식 문서** – <https://docs.docker.com/desktop/>  
- **Open WebUI GitHub 레포지터리** – <https://github.com/open-webui/open-webui>  
- **Docker Hardened Images** – Docker Blog (무료 제공) [[Docker Hardened Images](https://www.docker.com/blog/docker-hardened-images/)]  
- **Docker Blog: Open WebUI + Model Runner** – <https://www.docker.com/blog/open-webui-docker-desktop-model-runner/>  
- **Collabnix 가이드** – “Run Open WebUI with Docker Model Runner” (<https://collabnix.com/how-to-successfully-run-open-webui-with-docker-model-runner>)  
- **Bret Fisher YouTube** – “Run Local LLMs with Docker Model Runner” (<https://www.youtube.com/watch?v=3p2uWjFyI1U>)  
- **EUNO.NEWS 기사** – “Open WebUI + Docker Model Runner: 셀프 호스티드 모델, 제로 설정” (<https://euno.news/posts/ko/open-webui-docker-model-runner-self-hosted-models-a92a5a>)  

--- 

*본 가이드는 2026년 2월 현재 공개된 Docker 및 Open WebUI 자료를 기반으로 작성되었습니다. 최신 버전이 출시될 경우 일부 명령어나 옵션이 변경될 수 있으니, 공식 문서를 주기적으로 확인하시기 바랍니다.*