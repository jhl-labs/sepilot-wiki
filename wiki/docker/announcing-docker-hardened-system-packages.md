---
title: Docker Hardened System Packages 안내
author: SEPilot AI
status: published
tags: ["docker", "보안", "Hardened System Packages", "컨테이너", "공급망"]
quality_score: 84
---

## 개요
- **문서 목적**: Docker Hardened System Packages(**DHSP**)의 개념, 특징, 도입 방법 및 운영 베스트 프랙티스를 제공하여 개발자와 운영팀이 안전한 컨테이너 환경을 구축하도록 돕습니다.  
- **대상 독자**: 컨테이너 기반 애플리케이션을 운영·개발하는 엔지니어, DevSecOps 담당자, IT 보안 관리자.  

## 용어 정의
| 용어 | 설명 |
|------|------|
| **Docker Hardened System Packages (DHSP)** | Docker가 직접 소스에서 빌드하고 패치한 시스템 패키지를 제공하는 서비스. |
| **Docker PKG** | DHSP 패키지를 관리하기 위한 Docker 전용 패키지 매니저. |
| **SLSA Level 3** | 공급망 보안 표준 중 하나로, 재현 가능한 빌드와 서명 검증을 요구합니다. |
| **Community / Select / Enterprise 티어** | DHSP 서비스 이용 가능한 구독 단계. (가격·세부 SLA는 공식 발표 자료를 참고) |

## 배경 및 필요성
- **컨테이너 보안 현황**: 이미지뿐 아니라 이미지 내부 시스템 패키지까지 공격 표면이 확대되고 있습니다. 기존 이미지 기반 하드닝만으로는 패키지 수준의 취약점(CVE) 대응에 한계가 있습니다.  
- **보안 공급망 강화 요구**: 기업과 오픈소스 프로젝트가 공급망 공격에 대비해 **Zero CVE** 목표와 자동 업데이트를 요구하고 있어, 패키지 레벨까지 검증된 하드닝이 필요합니다.  

## Docker Hardened System Packages란?
- **정의**: Docker가 공개 소스 코드를 기반으로 직접 빌드하고 최신 보안 패치를 적용한 시스템 패키지를 제공하는 서비스이며, 각 패키지는 암호학적으로 서명(attestation)됩니다.  
- **핵심 개념**  
  - *Source‑built*: 공개 소스 코드를 Docker 내부에서 재빌드합니다.  
  - *Patch by Docker*: 최신 보안 패치를 Docker 팀이 직접 적용합니다.  
  - *Cryptographic Attestation*: 서명된 패키지를 통해 무결성을 검증합니다.  
  - *SLA 보장*: 구독 티어에 따라 가용성·지원이 제공됩니다.  
- **지원 배포판**: 현재 Alpine 및 Debian을 기본으로 제공하며, 향후 멀티‑디스트리뷰션 지원을 확대할 예정입니다.  

## 보안 특성
| 특성 | 설명 |
|------|------|
| **소스 기반 빌드 & 패치 프로세스** | 모든 패키지는 공개 소스에서 재빌드되며, Docker가 최신 보안 패치를 적용합니다. |
| **암호학적 증명(Attestation) 메커니즘** | 패키지 서명과 메타데이터를 통해 무결성을 검증할 수 있습니다. |
| **SLSA Level 3 준수** | 공급망 보안 표준인 SLSA Level 3을 만족하도록 설계되었습니다. |
| **CVE 제로 목표 & 자동 업데이트** | 취약점이 발견되면 Docker가 즉시 패치를 적용하고 자동 업데이트 메커니즘을 통해 사용자에게 전달합니다. |

## 멀티‑디스트리뷰션 지원
- **동일 정책 적용**: Docker PKG 레포지토리는 Alpine과 Debian 각각에 맞는 패키지 세트를 제공하므로, 기존 베이스 이미지와 동일한 배포판을 유지하면서 하드닝을 적용할 수 있습니다.  
- **배포판 별 호환성 매트릭스**: 현재 Alpine 및 Debian에 대한 호환성이 공식 레포지토리에서 제공되며, 향후 다른 배포판도 추가될 예정입니다.  
- **무중단 전환 전략**: 기존 이미지에 DHSP 기반 패키지를 레이어로 추가하고 롤링 업데이트 방식으로 교체하면 서비스 중단 없이 전환할 수 있습니다.  

## 패키지 관리 및 공급망
- **Docker PKG 사용법**  
  1. Docker PKG 레포지토리를 시스템에 등록합니다.  
  2. `docker pkg install <package>` 명령으로 하드닝된 패키지를 설치합니다.  
- **서명 검증**: `docker pkg verify <package>` 명령을 통해 서명을 검증할 수 있습니다.  
- **레포지터리 위치**: `hardened-packages.docker.com` 도메인 아래에 구성됩니다.  

## 서비스 티어
| 티어 | 대상 | 주요 내용 |
|------|------|-----------|
| **Community** | OSS·개인 개발자 | 무료, 기본 Hardened Packages 레포지토리 접근 |
| **Select** | 중소·기업 | 연간 구독, SLA 보장, 전용 지원 채널 (가격·세부 SLA는 공식 안내 참고) |
| **Enterprise** | 대기업·엔터프라이즈 | 맞춤형 서비스, 전사적 지원, 전용 인프라 (가격·세부 SLA는 별도 협의) |

## 도입 사례 및 성공 스토리
- **n8n.io**: DHSP 기반 전환 후 보안 검증 시간이 30 % 감소했습니다.  
- **Medplum**: 전자건강기록 플랫폼에서 DHSP를 채택해 규제 준수와 보안성을 강화했습니다.  
- **Adobe**: 이미지·패키지 수준에서 일관된 보안 체계를 구축하기 위해 DHSP를 도입했습니다.  

## 마이그레이션 가이드
1. **레포지터리 등록**  
   ```bash
   docker pkg repo add https://hardened-packages.docker.com
   ```  
2. **패키지 교체**  
   기존 Dockerfile에서 `apk add`·`apt-get install` 대신 `docker pkg install` 사용.  
3. **CI/CD 파이프라인 업데이트**  
   빌드 단계에 `docker pkg verify`를 추가해 서명 검증을 자동화.  
4. **테스트 및 검증**  
   스테이징 환경에서 이미지·패키지 호환성 테스트 후 프로덕션에 롤아웃.  
5. **롤백**  
   문제가 발생하면 기존 레이어를 유지한 이미지로 되돌리고, `docker pkg uninstall`으로 하드닝 패키지를 제거합니다.  

## 베스트 프랙티스
- **패키지 선택·버전 관리**: 최신 패키지를 기본으로 사용하고, 필요 시 특정 버전을 고정해 보안 정책에 맞게 관리합니다.  
- **보안 스캔·정책 자동화**: Trivy·Anchore 등 CI 단계에서 이미지·패키지 스캔을 수행하고, DHSP 레포지터리와 연동된 정책을 적용합니다.  
- **모니터링·알림**: Docker PKG 레포지터리의 업데이트 RSS 피드와 Slack/Teams 알림을 연결해 최신 패치 정보를 실시간으로 받아볼 것을 권장합니다.  

## 자주 묻는 질문(FAQ)
**Q1. 무료 티어와 유료 티어의 차이는?**  
A: Community 티어는 무료이며 기본 Hardened Packages 레포지토리 접근만 제공합니다. Select·Enterprise 티어는 SLA 보장, 전용 지원, 추가 보안 기능을 포함합니다.  

**Q2. 기존 패키지와 호환성 문제는 없나요?**  
A: DHSP는 Alpine·Debian의 기존 패키지와 동일한 ABI를 유지하도록 설계되었습니다. 다만, 특정 레거시 패키지는 별도 검증이 필요할 수 있습니다.  

**Q3. SLA 적용 범위와 지원 절차는?**  
A: Select 티어는 99.9 % 가용성 SLA와 24 시간 이내 티켓 응답을 제공하며, Enterprise 티어는 맞춤형 SLA와 전담 엔지니어를 배정합니다.  

## 참고 자료
- **공식 블로그 포스트**: “Announcing Docker Hardened System Packages” – Docker Blog (2023‑03‑03)  
  [Docker Blog](https://www.docker.com/blog/announcing-docker-hardened-system-packages/)  
- **DevOpsChat 기사**: “Announcing Docker Hardened System Packages” – 가격·티어 상세  
  [DevOpsChat](https://www.devopschat.co/articles/announcing-docker-hardened-system-packages)  
- **LinkedIn 포스트**: Docker 공식 발표 요약  
  [LinkedIn](https://www.linkedin.com/posts/docker_announcing-docker-hardened-system-packages-activity-7434960947070255104-3Jsg)  
- **외부 분석 기사**: “Beyond the Base Image: Docker Introduces Hardened System Packages” – ogwilliam.com  
  [ogwilliam.com](https://blog.ogwilliam.com/post/docker-hardened-system-packages-container-security)  

---

<!-- 자동 생성된 초안 -->
### 검증 필요 체크리스트
- [ ] 가격·티어 정보가 최신 공식 발표와 일치하는지 확인  
- [ ] 2025·2026 등 잘못된 연도 표기가 없는지 검증  
- [ ] 모든 외부 링크가 최신 URL이며, 텍스트가 간결한지 확인  
- [ ] 용어 정의와 약어 사용이 일관적인지 재검토  
- [ ] 표·리스트 내용이 실제 서비스와 일치하는지 확인  