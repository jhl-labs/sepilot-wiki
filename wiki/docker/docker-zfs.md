---
title: Docker + ZFS 로 홈랩 스토리지 구축하기
author: SEPilot AI
status: published
tags: ["docker", "ZFS", "홈랩", "스토리지", "스냅샷", "백업"]
---

## 1. 소개 및 목표
- **Docker와 ZFS를 결합하는 이유**  
  - ZFS는 데이터 중복 제거, 압축, 스냅샷 등 고급 파일시스템 기능을 제공해 데이터 무결성을 보장합니다.  
  - Docker는 컨테이너 기반 서비스 배포에 최적화돼 있어, ZFS와 연동하면 스토리지 확장성과 복구 능력이 크게 향상됩니다.  
- **기대 효과**  
  - **데이터 무결성** – ZFS 체크섬으로 손상 감지·복구  
  - **압축·스냅샷** – LZ4 압축과 시점 복구를 자동화  
  - **확장성** – 풀(pool)·데이터셋(dataset) 구조로 디스크 추가·교체가 용이  
- **문서 구성 및 전제 조건**  
  - 2~3개의 물리 디스크, Ubuntu·FreeBSD·macOS 중 하나, Docker가 이미 설치·실행 중이어야 함.  
  - 기본 Linux CLI·Docker 개념을 알고 있어야 합니다.  

## 2. 사전 준비
| 항목 | 권장 사양 / 내용 |
|------|-------------------|
| **지원 OS** | Ubuntu 20.04 이상, Debian, FreeBSD, macOS (ZFS 지원 버전) |
| **디스크** | 최소 2~3개 (HDD 또는 SSD). RAID‑Z1·mirror 등 원하는 레벨에 따라 선택 |
| **Docker** | `docker --version` 으로 확인, 최신 안정 버전 권장 |
| **기본 지식** | `lsblk`, `zpool`, `zfs`, `docker volume` 명령어 이해 |

## 3. ZFS 설치 및 풀(Pool) 생성
### 3.1 ZFS 패키지 설치
- **Ubuntu**  
  ```bash
  sudo apt-get update && sudo apt-get install zfsutils-linux
  ```  
  (다른 OS는 공식 ZFS 문서 참고)【Docker + ZFS: 완벽한 홈랩 스토리지 설정】  

### 3.2 디스크 확인 및 정리
```bash
lsblk
```  
예시: `/dev/sdb`, `/dev/sdc`, `/dev/sdd` 가 사용 가능하다고 가정합니다.

### 3.3 풀 유형 선택
- **mirror** – 두 디스크에 동일 복제, 빠른 복구  
- **raidz1** – 단일 패리티, 3+ 디스크에 적합 (예시)  
- **raidz2** – 두 개 패리티, 고가용성 필요 시  

### 3.4 풀 생성 명령 및 옵션 설명
```bash
sudo zpool create -f -o ashift=12 -o autoreplace=on tank raidz1 /dev/sdb /dev/sdc /dev/sdd
```  
- `tank` : 풀 이름  
- `raidz1` : 단일 패리티 RAID‑Z  
- `ashift=12` : 4 KB 정렬 (현대 디스크 표준)  
- `autoreplace=on` : 디스크 장애 시 자동 교체 준비  

### 3.5 풀 상태 확인
```bash
sudo zpool status
sudo zpool list
```  

## 4. ZFS 데이터셋 설계
### 4.1 데이터셋 vs ZVOL
- **데이터셋(dataset)** : 파일시스템 레벨, Docker 볼륨에 직접 사용 권장【ZFS에서 도커 모범 사례】  
- **ZVOL** : 블록 디바이스, 특수 요구가 있을 때만 사용  

### 4.2 용도별 데이터셋 구조 예시
```bash
sudo zfs create tank/docker
sudo zfs create tank/backups
sudo zfs create tank/shared
```  

### 4.3 주요 속성 설정
| 속성 | 권장값 | 설명 |
|------|--------|------|
| `mountpoint` | `/tank/docker` 등 | 자동 마운트 경로 |
| `compression` | `lz4` | 빠른 압축, 성능 저하 최소 |
| `dedup` | `off` (필요 시 `on`) | 중복 제거, 메모리 요구량 높음 |
| `quota` / `refquota` | 필요 시 제한 설정 | 데이터셋별 용량 제한 |

예시 확인:
```bash
sudo zfs get all tank/docker
```  

## 5. Docker와 ZFS 연동
### 5.1 스토리지 드라이버 선택
- **ZFS 드라이버** : Docker가 직접 ZFS 데이터셋을 사용하도록 설정 (스냅샷 관리 용이)【How to Set Up Docker with ZFS Storage Driver】  
- **overlay2** : 기본 드라이버, ZFS와 병행 사용 가능하지만 스냅샷 기능 제한  

### 5.2 ZFS 기반 로컬 볼륨 생성
```bash
docker volume create \
  --driver local \
  --opt type=zfs \
  --opt device=tank/docker \
  --name docker-vol
```  
- `--opt type=zfs` : ZFS 데이터셋 사용 선언  
- `--opt device=tank/docker` : 대상 데이터셋 지정  

볼륨 확인:
```bash
docker volume ls
```  

### 5.3 컨테이너 실행 시 볼륨 마운트 예시
```bash
docker run -d --name myapp -v docker-vol:/app/data myimage
```  

### 5.4 기존 컨테이너 마이그레이션 절차
1. 기존 컨테이너 데이터를 `docker cp` 로 임시 디렉터리 복사  
2. 새 ZFS 볼륨 생성 후 `docker run` 시 `-v` 옵션 지정  
3. 데이터 복원 후 기존 컨테이너 정리  

### 5.5 성능 튜닝 팁
- **ARC (Adaptive Replacement Cache)** 크기 조절: `/etc/modprobe.d/zfs.conf` 에 `options zfs zfs_arc_max=...` 추가  
- **IO scheduler** : SSD 사용 시 `noop` 또는 `deadline` 권장  

## 6. 자동 스냅샷 및 스케줄링
### 6.1 스냅샷 기본 개념
- `zfs snapshot -r tank/docker@<label>` 로 데이터셋 전체(하위 포함) 스냅샷 생성  

### 6.2 일일·주간·월간 정책 예시
| 주기 | 라벨 형식 | 보존 기간 |
|------|-----------|-----------|
| 일일 | `@daily-$(date +%Y%m%d)` | 7일 |
| 주간 | `@weekly-$(date +%Y%V)` | 4주 |
| 월간 | `@monthly-$(date +%Y%m)` | 12개월 |

### 6.3 cron 기반 자동 스냅샷 스크립트 (root crontab)
```bash
0 0 * * * /sbin/zfs snapshot -r tank/docker@daily-$(date +\%Y\%m\%d)
0 3 * * 0 /sbin/zfs snapshot -r tank/docker@weekly-$(date +\%Y\%V)
0 4 1 * * /sbin/zfs snapshot -r tank/docker@monthly-$(date +\%Y\%m)
```  

### 6.4 스냅샷 관리·보존 정책
- 오래된 스냅샷 삭제: `zfs destroy -r tank/docker@daily-2023*` 등  
- `zfs list -t snapshot -r tank/docker` 로 현재 스냅샷 확인  

## 7. 백업 및 복구 전략
### 7.1 스냅샷 기반 로컬 롤백
```bash
sudo zfs rollback -r tank/docker@daily-20231101
```  

### 7.2 원격 백업 (zfs send/receive)
1. **스냅샷 전송**  
   ```bash
   sudo zfs send -R tank/docker@daily-20231101 | ssh user@remote "sudo zfs receive -F remote/pool/docker"
   ```  
2. **증분 전송** (다음 스냅샷)  
   ```bash
   sudo zfs send -I tank/docker@daily-20231101 tank/docker@daily-20231102 | ssh ... 
   ```  

### 7.3 rsync + ZFS 압축 전송 (간단한 경우)
```bash
sudo rsync -aHAX --info=progress2 /tank/docker/ user@remote:/backup/docker/
```  

### 7.4 클라우드 연동 개요
- **S3 / Backblaze B2** 등 객체 스토리지에 `zfs send` 스트림을 `aws s3 cp -` 로 업로드하거나, `rclone` 을 활용해 전송 가능 (구체적인 설정은 해당 서비스 문서 참고).  

### 7.5 재해 복구 체크리스트
1. 풀 상태 확인 (`zpool status`)  
2. 최신 스냅샷 존재 여부 확인 (`zfs list -t snapshot`)  
3. 원격 백업 최신성 검증 (`zfs receive -v`)  
4. 복구 시 `zpool import` 후 `zfs rollback` 수행  

## 8. 모니터링 및 유지보수
### 8.1 ZFS 상태 모니터링
- `zpool iostat -v 5` : I/O 통계 실시간  
- `zfs get all tank/docker` : 속성 변화 감시  
- `zpool status -v` : 오류 및 디스크 교체 알림  

### 8.2 Docker 볼륨 사용량 확인
```bash
docker system df
```  

### 8.3 알림 설정
- **email** : `mail` 명령어와 `zpool status` 결과를 cron에 연결  
- **Slack** : `curl -X POST -H 'Content-type: application/json' --data '{"text":"ZFS alert"}' https://hooks.slack.com/services/...`  

### 8.4 디스크 교체·확장 절차
- **Hot‑swap** (지원 하드웨어) → `zpool replace tank /dev/sdb /dev/sde`  
- **풀 확장** → `zpool add tank raidz1 /dev/sdf /dev/sdg /dev/sdh`  

## 9. 보안 및 권한 관리
### 9.1 데이터셋 권한
```bash
sudo zfs set aclmode=passthrough tank/docker
sudo chmod 750 /tank/docker
sudo chown 1000:1000 /tank/docker   # Docker 컨테이너 UID/GID와 일치
```  

### 9.2 Docker 컨테이너 보안 베스트 프랙티스
- **user namespace** : `--userns-remap` 옵션 사용  
- **읽기 전용 볼륨** : `docker run -v docker-vol:/data:ro`  
- **시크릿 관리** : Docker secret 기능 활용  

### 9.3 ZFS 암호화 (선택 사항)
```bash
sudo zfs create -o encryption=on -o keyformat=passphrase tank/secure
```  
- 암호화 키는 부팅 시 입력하거나 `keylocation=prompt` 로 관리.  

## 10. 트러블슈팅 FAQ
| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| `zpool import` 실패 | 디스크 UUID 변경 또는 손상 | `zpool import -f` 로 강제 가져오기, 로그 `/var/log/syslog` 확인 |
| 스냅샷 충돌 | 동일 라벨 존재 | 라벨에 날짜·시간 포함, `zfs destroy` 로 기존 스냅샷 정리 |
| Docker 볼륨 마운트 오류 | `type=zfs` 옵션 미지원 | Docker 20.10+ 버전 확인, `docker info` 에 `ZFS` 드라이버 표시 여부 검증 |
| ARC 메모리 과다 사용 | 메모리 부족 | `/etc/modprobe.d/zfs.conf` 에 `options zfs zfs_arc_max=...` 설정 |

### 로그 확인 위치
- 시스템 로그: `/var/log/syslog` 또는 `journalctl -u docker`  
- ZFS 로그: `zpool status -v` 출력에 포함  

### 커뮤니티·문서
- 공식 ZFS 문서: https://openzfs.org/wiki/Documentation  
- Docker ZFS 스토리지 드라이버 가이드: https://oneuptime.com/blog/post/2026-02-08-how-to-set-up-docker-with-zfs-storage-driver/view  
- Reddit ZFS·Docker 베스트 프랙티스: https://www.reddit.com/r/zfs/comments/10e0rkx/for_anyone_using_zfsol_with_docker/  

## 11. 결론 및 향후 확장 방향
- **구축 결과**: ZFS 풀 위에 Docker 전용 데이터셋을 두어, 압축·스냅샷·자동 백업이 가능한 견고한 홈랩 스토리지를 완성했습니다.  
- **추가 서비스 연동 아이디어**  
  - **K3s** : 경량 Kubernetes 클러스터를 ZFS 풀에 배포해 고가용성 워크로드 운영  
  - **Nextcloud / Plex** : `tank/shared` 데이터셋을 NFS/SMB 공유로 노출  
  - **Prometheus + Grafana** : `zpool iostat` 데이터를 수집해 시각화  
- **지속적인 업데이트**: ZFS와 Docker는 활발히 업데이트되므로, 공식 릴리즈 노트를 정기적으로 확인하고, 커뮤니티 포럼(FreeBSD, Ubuntu, Docker)에서 베스트 프랙티스를 공유하세요.  

---  
*본 문서는 euno.news의 Dev.to 기반 가이드와 공개된 Docker·ZFS 자료를 근거로 작성되었습니다. 추가적인 세부 설정이나 특정 환경에 대한 맞춤형 조정은 별도 조사·테스트가 필요합니다.*