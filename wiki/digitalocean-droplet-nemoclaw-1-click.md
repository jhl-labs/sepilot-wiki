---
title: DigitalOcean Droplet에서 NemoClaw 1‑Click 배포 가이드
author: SEPilot AI
status: published
tags: [DigitalOcean, NemoClaw, 1‑Click, 배포, 자동화]
---

## 1. 개요
이 가이드는 **DigitalOcean Droplet**에 **NemoClaw**을 1‑Click 방식으로 배포하고, 초기 온보딩부터 기본 사용법까지 단계별로 설명합니다.  
- **목적**: 복잡한 환경 설정 없이 몇 분 안에 NVIDIA NemoClaw 에이전트 스택을 실행할 수 있도록 함  
- **기대 효과**: Docker·OpenShell·NVIDIA Cloud API 기반의 샌드박스가 자동으로 구성되어 보안·격리된 AI 에이전트를 바로 체험 가능  

## 2. 사전 준비
| 항목 | 내용 | 참고 |
|------|------|------|
| DigitalOcean 계정 | 계정이 없을 경우 [DigitalOcean 가입 페이지](https://cloud.digitalocean.com/registrations/new)에서 생성 |  |
| 결제 설정 | Droplet 비용 청구를 위해 결제 수단을 등록 |  |
| NVIDIA API 키 | `build.nvidia.com/settings/api-keys` 에서 **nvapi-** 로 시작하는 키 생성 | euno.news [출처](https://euno.news/posts/ko/how-to-set-up-nemoclaw-on-a-digitalocean-droplet-w-ba4815) |
| SSH 키 | 로컬에서 `ssh-keygen` 으로 키를 만든 뒤 DigitalOcean 콘솔 → **Security → SSH Keys** 에 등록 |  |

## 3. NemoClaw 1‑Click Droplet 생성
1. **DigitalOcean Marketplace**에서 “NemoClaw 1‑Click Droplet” 페이지를 엽니다.  
2. **Create NemoClaw Droplet** 버튼을 클릭합니다.  
3. **플랜 선택**  
   - **CPU‑Optimized** → **Premium Intel**  
   - **RAM**: 32 GB, **CPU**: 16 vCPU  
4. **데이터센터 지역**: 지연 시간이 가장 짧은 지역(예: NYC 1, SFO 2 등) 선택.  
5. **SSH 키 연결**: 사전 등록한 SSH 키를 선택합니다.  
6. **Create Droplet** 클릭 → 배포가 시작됩니다.  

> **비용 안내**: 선택한 플랜은 **$336 /월**이며, 실험이 끝난 뒤 반드시 Droplet을 삭제해야 비용이 발생하지 않습니다 [출처](https://euno.news/posts/ko/how-to-set-up-nemoclaw-on-a-digitalocean-droplet-w-ba4815).

## 4. 초기 접속 및 온보딩 마법사 실행
1. Droplet이 생성되면 **IP 주소**를 확인하고, 로컬 터미널에서 다음 명령으로 SSH 접속합니다.  

   `ssh root@<Droplet_IP>`  

2. 로그인 시 **NemoClaw 온보딩 마법사**가 자동으로 실행됩니다. 주요 흐름은 다음과 같습니다.  

   - **사전 점검**: Docker, OpenShell CLI, 게이트웨이 상태 확인  
   - **샌드박스 컨테이너 구축**  
   - **프롬프트 입력**  
     - **Sandbox name**: 기본값 `my-assistant` 를 사용하려면 **Enter**  
     - **NVIDIA API key**: 앞서 만든 `nvapi-…` 키를 붙여넣고 **Enter**  
     - **Policy presets**: `Apply suggested presets (pypi, npm)? [Y/n/list]:` 에 **n** 입력 후 **Enter** (필요 시 추후 추가)  

3. 마법사가 완료되면 아래와 같은 요약이 출력됩니다.  

   ```
   Sandbox    my-assistant (Landlock + seccomp + netns)
   Model      nvidia/nemotron-3-super-120b-a12b (NVIDIA Cloud API)
   NIM        not running
   Run:       nemoclaw my-assistant connect
   Status:    nemoclaw my-assistant status
   Logs:      nemoclaw my-assistant logs --follow
   ```

## 5. 온보딩 결과 요약 및 기본 명령어
| 명령어 | 설명 |
|--------|------|
| `nemoclaw my-assistant connect` | 샌드박스 내부 쉘에 접속 |
| `nemoclaw my-assistant status` | 현재 샌드박스·모델·NIM 상태 확인 |
| `nemoclaw my-assistant logs --follow` | 실시간 로그 스트리밍 |

위 명령어들은 온보딩이 끝난 뒤 바로 사용할 수 있습니다.

## 6. 샌드박스 내부에서 OpenClaw 사용
1. `nemoclaw my-assistant connect` 로 샌드박스에 접속합니다.  
2. 내부 쉘에서 **OpenClaw TUI** 를 실행합니다.  

   `openclaw tui`  

3. 화면에 채팅 인터페이스가 나타나면 메시지를 입력하고 **Enter** 를 눌러 AI 에이전트와 대화합니다.

## 7. 세션 지속을 위한 NVM 설정
온보딩 스크립트는 NVM을 서브쉘에만 설치하므로, 새 SSH 세션에서는 `nvm` 명령이 인식되지 않을 수 있습니다. 아래 명령을 한 번 실행해 **~/.bashrc** 에 영구적으로 추가합니다.  

`echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc && \`  
`echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc && \`  
`echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc && \`  
`source ~/.bashrc`

재접속 후 `nemoclaw my-assistant connect` → `openclaw tui` 를 실행하면 이전 세션 상태가 유지됩니다 [출처](https://euno.news/posts/ko/how-to-set-up-nemoclaw-on-a-digitalocean-droplet-w-ba4815).

## 8. 정책 프리셋 및 통합 확장
- 기본 샌드박스는 **Landlock**, **seccomp**, **netns** 로 네트워크 접근을 제한합니다.  
- Slack, GitHub, PyPI 등 외부 서비스와 연동하려면 해당 **policy preset** 을 적용해야 합니다.  
- 정책 적용 방법 및 상세 옵션은 **NemoClaw 공식 문서**(GitHub Repository) 를 참고하세요.  

## 9. 비용 관리 및 리소스 정리
1. **사용 종료 시**: DigitalOcean 콘솔 → Droplet 선택 → **Destroy** 클릭.  
2. **스냅샷/백업**: 장기 보관이 필요하면 스냅샷을 생성하고 비용을 별도로 모니터링합니다.  
3. **월별 비용 모니터링**: DigitalOcean **Billing** 페이지에서 실시간 사용량을 확인하고 알림을 설정합니다.

## 10. 문제 해결 및 FAQ
| 증상 | 원인 | 해결 방안 |
|------|------|----------|
| SSH 접속 실패 | IP 주소 오입력 / 방화벽 설정 | IP 확인 후 `ssh -i <key> root@<IP>` 재시도 |
| 온보딩 중 Docker 설치 오류 | Droplet 이미지 손상 | Droplet 재생성 후 다시 시도 |
| NVIDIA API 키 인증 오류 | 키 복사 누락 또는 형식 오류 | `nvapi-` 로 시작하는 전체 문자열을 정확히 붙여넣기 |
| `nvm` 명령 미인식 | `.bashrc` 미적용 | 위 7‑절 스크립트 실행 후 `source ~/.bashrc` |

### 자주 묻는 질문
- **Q**: 무료 체험으로도 사용 가능한가요?  
  **A**: DigitalOcean은 신규 계정에 $200 크레딧을 제공하지만, 선택한 플랜(32 GB RAM, 16 CPU)은 크레딧 소진 시 바로 과금됩니다.  
- **Q**: 모델을 다른 NVIDIA 모델로 교체할 수 있나요?  
  **A**: 온보딩 시 입력한 모델 이름을 `nemoclaw <sandbox> set-model <model-id>` 로 변경 가능하지만, 해당 모델이 NVIDIA Cloud API에 등록돼 있어야 합니다.  

## 11. 참고 자료 및 링크
- **DigitalOcean Marketplace – NemoClaw 1‑Click**: https://marketplace.digitalocean.com/apps/nemoclaw  
- **NemoClaw GitHub Repository**: https://github.com/NVIDIA/nemoclaw  
- **NemoClaw 공식 Documentation**: https://docs.nvidia.com/nemoclaw/  
- **NVIDIA Cloud API**: https://build.nvidia.com/settings/api-keys  
- **DigitalOcean Droplet 가이드**: https://www.digitalocean.com/community/tutorials/how-to-set-up-nemoclaw  

---