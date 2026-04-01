---
title: Homelab AI Stack 2026 – 배포 순서와 운영 가이드
author: SEPilot AI
status: draft
tags: ["Homelab", "ai", "Ollama", "Traefik", "OpenWebUI", "n8n", "LiteLLM", "운영가이드"]
redirect_from:
  - homelab-ai-stack-2026
quality_score: 63
---

## 1. 개요
### 문서 목적 및 대상 독자
이 문서는 2026년 현재 홈랩에서 로컬 LLM(대형 언어 모델)을 자체 호스팅하고자 하는 개발자·엔지니어를 대상으로 합니다.  

- 개인·소규모 팀이 프라이버시를 보장하면서 비용 없이 AI 서비스를 운영하고자 할 때  
- 기존 클라우드 기반 AI 서비스를 대체하거나 보조하고자 할 때  

### Homelab AI Stack 2026이 해결하는 문제점
- 외부 AI 서비스에 종속되지 않음 → 데이터 유출 위험 최소화  
- API 키·사용량 비용이 발생하지 않음 → 비용 제로 운영 가능  
- 모델 선택·버전 관리가 자유로워 최신 모델을 직접 테스트 가능  

### 전체 아키텍처 한눈에 보기
```
Internet ──► Traefik (Reverse Proxy + TLS) ──► 
   ├─ Ollama (LLM Runtime) ──► Open WebUI (Chat UI)  
   ├─ n8n (Automation) ──► LiteLLM (OpenAI‑compatible endpoint)  
   └─ (옵션) Monitoring·Logging·Backup 등
```  
모든 서비스는 Docker 컨테이너로 배포되며, Traefik이 단일 진입점 역할을 합니다.  

## 2. 사전 준비
### 권장 하드웨어 사양
| 모델 규모 | 최소 RAM |
|----------|----------|
| 7 B      | 16 GB    |
| 32 B     | 32 GB+   |

> “Minimum viable hardware” 표는 euno.news 기사에 명시된 내용[[출처]](https://euno.news/posts/ko/homelab-ai-stack-2026-what-to-run-and-in-what-orde-85784b)에서 인용했습니다.  

- **CPU**: 최신 x86_64 또는 Apple Silicon M‑series (M1/M2) 권장 – 특히 M‑series는 32 B 모델 실행에 충분히 빠름.  
- **GPU**: 선택 사항이며, 모델 가속이 필요할 경우 NVIDIA RTX 30xx 이상 또는 Apple Silicon GPU 활용 가능.  
- **스토리지**: NVMe SSD 최소 200 GB (모델 파일 및 로그 저장용).  

### 운영체제 선택 및 기본 설정
- Ubuntu Server 22.04 LTS 또는 Debian 12 권장 – Docker 공식 지원 OS.  
- 기본 방화벽(UFW) 설정 후 SSH 포트(22)와 Docker‑Socket 접근을 제한.  

### 네트워크 토폴로지와 IP 설계
- 홈 라우터 뒤에 고정 사설 IP(예: `192.168.1.10`) 할당.  
- Traefik이 80/443 포트를 직접 바인딩하므로 외부 포트와 내부 서비스 포트를 명확히 구분.  

## 3. 인프라 기반 구축
### 컨테이너 런타임 선택
Docker Engine (v24 이상) 사용 – 대부분의 홈랩 가이드와 호환성이 높음.  

### Docker Compose 기본 구조
다음은 전체 스택을 한 번에 배포할 수 있는 **docker‑compose.yml** 예시입니다.  
(코드 블록은 4칸 들여쓰기 형태로 표시합니다.)

    version: "3.9"
    services:
      traefik:
        image: traefik:v3.0
        command:
          - "--api.insecure=true"
          - "--providers.docker=true"
          - "--entrypoints.web.address=:80"
          - "--entrypoints.websecure.address=:443"
          - "--certificatesresolvers.myresolver.acme.email=you@example.com"
          - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
          - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
        ports:
          - "80:80"
          - "443:443"
        volumes:
          - /var/run/docker.sock:/var/run/docker.sock:ro
          - ./traefik:/etc/traefik
        restart: unless-stopped

      ollama:
        image: ollama/ollama:latest
        ports:
          - "11434:11434"
        volumes:
          - ollama_models:/root/.ollama
        restart: unless-stopped

      open-webui:
        image: ghcr.io/open-webui/open-webui:main
        ports:
          - "3000:8080"
        environment:
          - OLLAMA_BASE_URL=http://ollama:11434
        volumes:
          - openwebui_data:/app/backend/data
        restart: unless-stopped

      n8n:
        image: n8nio/n8n
        ports:
          - "5678:5678"
        volumes:
          - n8n_data:/home/node/.n8n
        restart: unless-stopped

      litellm:
        image: ghcr.io/berriai/litellm:latest
        ports:
          - "4000:4000"
        volumes:
          - litellm_data:/app/data
        restart: unless-stopped

      prometheus:
        image: prom/prometheus:latest
        ports:
          - "9090:9090"
        volumes:
          - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
          - prometheus_data:/prometheus
        restart: unless-stopped

      grafana:
        image: grafana/grafana:latest
        ports:
          - "3001:3000"
        volumes:
          - grafana_data:/var/lib/grafana
        restart: unless-stopped

      loki:
        image: grafana/loki:latest
        ports:
          - "3100:3100"
        volumes:
          - loki_data:/loki
        restart: unless-stopped

    volumes:
      traefik:
      ollama_models:
      openwebui_data:
      n8n_data:
      litellm_data:
      prometheus_data:
      grafana_data:
      loki_data:

#### HA(고가용성) 옵션
Docker‑Compose 파일에 `deploy` 섹션을 추가하면 레플리카를 손쉽게 정의할 수 있습니다. 아래는 `traefik` 서비스에 2개의 레플리카를 지정한 예시입니다.

    traefik:
      deploy:
        mode: replicated
        replicas: 2
        restart_policy:
          condition: on-failure

> Docker‑Compose v3의 `deploy` 옵션은 Swarm 모드에서만 동작합니다. 실제 HA를 구현하려면 **Docker Swarm** 혹은 **Kubernetes** 클러스터를 활용하세요.  

### 볼륨 및 데이터 영속성 전략
- 각 컨테이너에 명시적 명명 볼륨 사용 (`traefik`, `ollama_models`, `openwebui_data`, `n8n_data`, `litellm_data` 등).  
- 백업 시점 스냅샷을 위해 `docker run --rm -v <volume>:/backup alpine tar czf /backup/backup.tar.gz -C /backup .` 방식을 활용합니다.  

## 4. 역방향 프록시 & TLS
### Traefik 설치 및 기본 구성
다음 명령으로 Traefik을 실행합니다.

    docker run -d \
      -p 80:80 -p 443:443 \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v $HOME/traefik:/etc/traefik \
      traefik:v3.0

`$HOME/traefik/traefik.yml` 예시:

    entryPoints:
      web:
        address: ":80"
      websecure:
        address: ":443"
    providers:
      docker:
        exposedByDefault: false
    certificatesResolvers:
      myresolver:
        acme:
          email: you@example.com
          storage: acme.json
          tlsChallenge: {}

### 서비스 라우팅 규칙 정의
Docker 라벨을 이용해 각 서비스가 자동으로 Traefik에 등록됩니다. 예시 (Open WebUI):

    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.openwebui.rule=Host(`ui.local`)"
      - "traefik.http.routers.openwebui.entrypoints=websecure"
      - "traefik.http.routers.openwebui.tls.certresolver=myresolver"

## 5. 로컬 LLM 런타임 – Ollama
### 설치 스크립트 실행
    curl -fsSL https://ollama.ai/install.sh | sh

### 모델 다운로드 및 테스트
    ollama run qwen2.5:32b

### 모델 별 하드웨어 요구사항 매핑
| 모델               | 권장 RAM |
|--------------------|----------|
| qwen2.5:7b         | 16 GB    |
| qwen2.5:32b        | 32 GB+   |

## 6. 사용자 인터페이스 – Open WebUI
### 컨테이너 배포 옵션
    docker run -d -p 3000:8080 \
      --add-host=host.docker.internal:host-gateway \
      -v openwebui_data:/app/backend/data \
      ghcr.io/open-webui/open-webui:main

### Ollama와의 연결 설정
- Open WebUI 설정 화면 → **LLM Provider**: `Ollama`  
- API endpoint: `http://ollama:11434`  

## 7. 워크플로 자동화 – n8n
### 컨테이너 배포 및 기본 인증 설정
    docker run -d -p 5678:5678 \
      -v n8n_data:/home/node/.n8n \
      n8nio/n8n

### LLM 호출 워크플로 예시
1. **IMAP** 노드 – 이메일 수신 트리거  
2. **HTTP Request** 노드 – `POST http://ollama:11434/api/chat` 로 질문 전송  
3. **Function** 노드 – 응답 가공  
4. **SMTP** 노드 – 사용자에게 회신  

## 8. 통합 OpenAI 호환 엔드포인트 – LiteLLM
### 설치 및 구성 파일 구조
    docker run -d -p 4000:4000 \
      -v litellm_data:/app/data \
      ghcr.io/berriai/litellm:latest

`/app/data/config.yaml` 예시:

    model_list:
      - model_name: local-fast
        litellm_params:
          model: ollama/qwen2.5:7b
          api_base: http://ollama:11434
      - model_name: local-heavy
        litellm_params:
          model: ollama/qwen2.5:32b
          api_base: http://ollama:11434

## 9. 모니터링·로깅·알림
### Prometheus 설정 (`prometheus/prometheus.yml`)
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: "docker"
        static_configs:
          - targets: ["traefik:8080", "ollama:11434", "open-webui:8080", "n8n:5678", "litellm:4000"]
      - job_name: "node_exporter"
        static_configs:
          - targets: ["host.docker.internal:9100"]

### Grafana 대시보드
- 기본 데이터소스로 `Prometheus`를 추가하고, **Docker Host**, **Traefik**, **Ollama**용 대시보드 템플릿을 임포트합니다.  

### Loki + Promtail (로그 중앙집중화)
`docker-compose.yml`에 포함된 `loki` 서비스와 함께, 각 컨테이너에 `logging` 옵션을 지정하면 로그가 Loki로 전송됩니다.

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

### Alertmanager + Telegram 알림 예시
`alertmanager.yml` (간단히 보여줍니다)

    route:
      receiver: telegram
    receivers:
      - name: telegram
        telegram_configs:
          - bot_token: "<YOUR_BOT_TOKEN>"
            chat_id: "<YOUR_CHAT_ID>"

## 10. 백업·복구·데이터 지속성
### 볼륨 스냅샷 스크립트 (`backup_volumes.sh`)
    #!/usr/bin/env bash
    set -e
    BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    for vol in traefik ollama_models openwebui_data n8n_data litellm_data; do
      docker run --rm -v "${vol}":/data -v "$BACKUP_DIR":/backup alpine \
        tar czf "/backup/${vol}.tar.gz" -C /data .
      echo "✅ ${vol} 백업 완료"
    done

- **복구**: 백업 파일을 동일한 이름의 볼륨에 `tar xzf` 로 풀어주면 됩니다.  

### Git 기반 설정 관리
- `open-webui`, `n8n`, `litellm`의 설정 파일·워크플로를 Git 저장소에 커밋하고, 변경 시 `git pull` 후 컨테이너 재시작.  

## 11. 확장·고가용성 설계
### Docker Swarm 기반 레플리카
Swarm 클러스터를 초기화하고, `docker stack deploy -c docker-compose.yml homelab` 로 배포하면 `deploy.replicas` 옵션이 적용됩니다.

### Traefik LoadBalancer 라우터 예시
    labels:
      - "traefik.http.services.ollama.loadbalancer.server.port=11434"
      - "traefik.http.services.ollama.loadbalancer.sticky=true"

### 자동 재시작 및 복제본 확보
모든 서비스에 공통으로 적용:

    restart: unless-stopped
    deploy:
      mode: replicated
      replicas: 2
      restart_policy:
        condition: on-failure

## 12. 운영·업데이트 가이드
### 이미지 업데이트와 롤링 배포 절차
1. `docker pull <image>:latest` 로 최신 이미지 확보  
2. `docker compose pull` 로 compose 파일에 정의된 모든 이미지 업데이트  
3. `docker compose up -d --remove-orphans` 로 무중단 롤링 배포 수행  

### 모델 교체·버전 업그레이드 체크리스트
- 새 모델 다운로드 (`ollama pull <model>`)  
- `litellm` config에 새로운 `model_name` 추가  
- Open WebUI에서 모델 리스트 갱신 확인  

### 정기 점검 항목
- 디스크 사용량: `df -h`  
- 메모리·CPU 부하: `htop` 혹은 Grafana 대시보드  
- 네트워크 포트 상태: `ss -tuln`  

## 13. 보안 베스트 프랙티스
### 최소 권한 원칙 적용
- Docker 데몬을 전용 사용자(`docker`) 로 실행  
- 각 컨테이너에 필요한 포트만 공개하고, 내부 네트워크에서만 접근하도록 제한  

### 비밀 관리
- API 키·비밀번호 등은 **Docker secrets** 혹은 **HashiCorp Vault**에 저장하고, 환경 변수로 직접 노출하지 않음  

### 취약점 스캔 및 패치 관리
- `trivy image <image>` 로 이미지 취약점 정기 스캔  
- GitHub Dependabot 혹은 Renovate를 활용해 Dockerfile 의존성 자동 업데이트  

## 14. 트러블슈팅 FAQ
| 증상 | 원인 | 해결 방법 |
|------|------|----------|
| Traefik이 443 포트에서 TLS 인증서 발급 실패 | DNS 레코드가 아직 전파되지 않음 | 도메인 A 레코드가 올바르게 설정됐는지 확인 후 재시도 |
| Ollama 컨테이너 시작 시 메모리 부족 오류 | 모델 크기에 비해 RAM 부족 | 7 B 모델 사용하거나 스왑을 일시적으로 활성화 |
| Open WebUI에서 모델 리스트가 비어 있음 | Ollama API endpoint 연결 오류 | `curl http://ollama:11434/api/tags` 로 직접 테스트 |
| n8n 워크플로에서 HTTP Request 타임아웃 | Ollama 응답 지연 (GPU 미사용) | 작은 모델로 교체하거나 GPU 지원 설정 확인 |

> 추가 오류는 각 프로젝트 공식 GitHub 이슈 트래커를 참고하세요.  

## 15. 부록
### 주요 명령어 요약
- `docker run -d -p 80:80 -p 443:443 -v /var/run/docker.sock:/var/run/docker.sock traefik:v3.0` – Traefik 실행  
- `curl -fsSL https://ollama.ai/install.sh | sh` – Ollama 설치  
- `ollama run qwen2.5:32b` – 모델 실행 테스트  
- `docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway -v openwebui_data:/app/backend/data ghcr.io/open-webui/open-webui:main` – Open WebUI 배포  
- `docker run -d -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n` – n8n 배포  
- `docker run -d -p 4000:4000 -v litellm_data:/app/data ghcr.io/berriai/litellm:latest` – LiteLLM 배포  

### 참고 자료·링크
- **Traefik 공식 문서** – <https://doc.traefik.io/traefik/>  
- **Ollama 설치 가이드** – <https://ollama.com/>  
- **Open WebUI GitHub** – <https://github.com/open-webui/open-webui>  
- **n8n 공식 사이트** – <https://n8n.io/>  
- **LiteLLM 공식 사이트** – <https://litellm.com/>  
- **원본 기사 (euno.news)** – <https://euno.news/posts/ko/homelab-ai-stack-2026-what-to-run-and-in-what-orde-85784b>  

### 용어 정의
- **LLM**: Large Language Model, 대규모 언어 모델.  
- **Reverse Proxy**: 클라이언트 요청을 내부 서비스로 전달하는 프록시 서버.  
- **TLS**: Transport Layer Security, HTTPS 암호화 프로토콜.  
- **Docker Compose**: 다중 컨테이너 애플리케이션 정의·실행 도구.  

---  

*본 가이드는 2026년 기준 공개된 자료를 기반으로 작성되었습니다. 일부 고가용성·백업·모니터링 설계는 추가 조사가 필요합니다.*