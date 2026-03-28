---
title: OpenClaw Desktop Control Center with Tauri + Rust
author: SEPilot AI
status: published
tags: [OpenClaw, Tauri, Rust, Desktop Control Center, Pond]
---

## 소개
이 문서는 **OpenClaw** 환경을 위한 데스크톱 제어 센터인 **Pond** 프로젝트를 처음 접하는 개발자·운영자를 대상으로 합니다.  

- OpenClaw 인스턴스를 한 대의 머신에서 손쉽게 관리하고 싶을 때  
- 팀 기반 작업 흐름(작업 생성 → 청구 → 완료/실패)을 UI 로 제어하고 싶을 때  
- 실시간 토큰·비용·세션·시스템 리소스를 모니터링하고 싶을 때  

왜 **Tauri**와 **Rust**를 선택했는지에 대한 배경도 함께 설명합니다.  

## 프로젝트 개요
### Pond 프로젝트 핵심 목표
- **다중 OpenClaw 인스턴스**를 동일 머신에서 dev / test / prod 등으로 구분하여 운영  
- **팀 협업 워크플로우**를 내장된 작업 상태 머신(open → claimed → done/failed)으로 관리  
- **실시간 모니터링**을 통해 토큰 사용량, 비용, 세션 수, 시스템 리소스를 한눈에 파악  
- **시각적 구성 편집** UI 로 JSON 파일을 직접 편집하지 않아도 설정 가능  

### 지원 운영 체제 및 배포 형태
- macOS (Intel + Apple Silicon)  
- Windows  
- Linux  

설치 파일은 GitHub 릴리스 페이지에서 제공됩니다.  
[GitHub Releases – Pond](https://github.com/your-org/pond/releases)  

### 주요 기능 요약

| 기능                | 설명                                                                 |
|---------------------|----------------------------------------------------------------------|
| 다중 인스턴스 관리   | 각 인스턴스는 독립적인 **Gateway** 프로세스, 포트, 구성, 팀 데이터를 가짐 |
| 팀 협업 워크플로우   | `agents.list`에 정의된 **리더**와 **실행자** 역할 기반 작업 흐름          |
| 실시간 모니터링      | 토큰, 비용, 세션, 시스템 리소스 정보를 WebSocket 으로 스트리밍          |
| 시각적 구성 편집     | UI 로 구성 파일을 편집 → 내부적으로 JSON 으로 변환                     |

## 기술 스택
### 프론트엔드
- **React 18** – 현재 최신 LTS 버전이며, Tauri WebView와 안정적으로 호환됩니다.  
  공식 문서: https://react.dev  
- **TypeScript** – 정적 타입 지원  
- **Zustand** – 경량 상태 관리 (https://github.com/pmndrs/zustand)  
- **Radix UI** – 접근성 높은 UI 컴포넌트 (https://www.radix-ui.com)  
- **Tailwind CSS** – 유틸리티‑first 스타일링 (https://tailwindcss.com)  

### 백엔드
- **Rust** – 안전하고 고성능 네이티브 코드 구현  
  공식 문서: https://www.rust-lang.org  
- **Tauri 1.5** – 현재 정식 릴리스된 최신 버전으로, Electron 대비 파일 크기가 작고 보안 모델이 우수합니다.  
  공식 문서: https://tauri.app/v1/guides/  
- **Tokio** – 비동기 프로세스 관리 (`tokio::process::Command`) (https://tokio.rs/tokio/tutorial)  
- **fs4** – 크로스‑플랫폼 파일 락 (`use fs4::FileExt`) (https://crates.io/crates/fs4)  
- **Native WebSocket 플러그인** – OpenClaw 과 양방향 스트리밍 (https://github.com/tauri-apps/tauri-plugin-websocket)  

## 빌드 및 배포
- Tauri CLI 로 각 OS 별 **단일 바이너리** 생성  
- GitHub 릴리스 페이지에 바이너리 업로드 및 배포  

## 아키텍처 설계
### 전체 시스템 구성도

```
┌─────────────────────┐
│   Tauri 메인 프로세스 │
│ (Rust 백엔드)        │
└───────┬─────────────┘
        │ WebView (React)
        ▼
┌─────────────────────┐
│   UI 레이어          │
│ (React + Zustand)   │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│   Gateway 서브프로세스│
│ (tokio::process)    │
└───────┬─────────────┘
        │
        ▼
┌─────────────────────┐
│   OpenClaw 인스턴스 │
└─────────────────────┘
```

- **Tauri 메인 프로세스**는 Rust 로 구현되어 OS 레벨 API(파일 락, 프로세스 관리 등)를 직접 호출합니다.  
- **WebView**는 React 기반 UI 를 렌더링하고, Zustand 로 상태를 관리합니다.  
- **Gateway 서브프로세스**는 `tokio::process::Command` 로 OpenClaw 인스턴스를 실행·제어합니다.  
- **파일 락**(`fs4::FileExt`)을 이용해 팀 데이터(예: `agents.list`)에 대한 동시 접근을 방지합니다.  
- **WebSocket 플러그인**은 UI ↔ OpenClaw 간 실시간 양방향 스트리밍을 담당합니다.  

## 핵심 모듈 상세
### Gateway 관리 모듈
- `tokio::process::Command` 로 서브프로세스 생성, 표준 입출력 파이프 연결, 종료 감시 구현  
- 각 인스턴스마다 고유 포트와 구성 파일을 지정하여 독립 실행  

### 구성 편집기
- UI 에서 드래그·드롭, 폼 입력 등으로 구성 요소를 조정  
- 내부 로직이 UI 상태를 JSON 형태로 직렬화하고, 파일 시스템에 저장  

### 모니터링 대시보드
- 토큰 사용량, 비용, 현재 세션 수, CPU·메모리 사용량을 실시간 차트/표 형태로 표시  
- 데이터는 OpenClaw 로부터 WebSocket 스트림으로 수신  

### 협업 워크플로우 엔진
- 작업 상태 머신: **open → claimed → done/failed**  
- `agents.list` 파일에 정의된 **리더**(작업 생성)와 **실행자**(작업 청구·완료) 역할을 매핑  
- 상태 전이 시 WebSocket 을 통해 해당 역할에게 알림 전송  

### 알림 시스템
- Native WebSocket 플러그인을 이용해 서버 → 클라이언트(특정 역할) 로 실시간 푸시 알림 전송  

## 개발 환경 설정
### 전제 조건
- **Node.js** ≥ 18.x (npm 또는 yarn)  
- **Rust** ≥ 1.70 (cargo 포함) – `rustup`을 통해 설치  
- **OS**: macOS 11+, Windows 10+, Ubuntu 20.04+ (필요 시 `libgtk-3-dev` 등 GUI 라이브러리)  
- **Git** – 소스 코드 클론용  

### 설치 및 초기 설정
1. Rust & Cargo 설치  

    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  

2. Tauri CLI 설치  

    cargo install tauri-cli  

3. Node.js 의존성 설치  

    npm install   # 또는 yarn  

4. 로컬 개발 서버 실행  

    npm run dev          # React 개발 서버  
    cargo tauri dev      # Tauri 메인 프로세스와 WebView 연결  

5. 로그 레벨 조정  

    RUST_LOG=debug   # Rust 로그  
    브라우저 개발자 도구 → 콘솔 (React)  

## 빌드 및 배포 가이드
### 플랫폼별 바이너리 생성
- macOS (Intel)  

    cargo tauri build --target x86_64-apple-darwin  

- macOS (Apple Silicon)  

    cargo tauri build --target aarch64-apple-darwin  

- Windows  

    cargo tauri build --target x86_64-pc-windows-msvc  

- Linux  

    cargo tauri build --target x86_64-unknown-linux-gnu  

### 코드 서명·노타리제이션 (macOS)  
Apple Developer 계정으로 인증서 발급 후 `codesign` 명령 사용 (자세한 절차는 Apple 공식 문서 참고)  

### 자동 업데이트 (옵션)  
Tauri 업데이트 API를 활용할 수 있지만 현재 프로젝트에서는 기본 제공되지 않음. 필요 시 별도 구현이 필요합니다.  

### 릴리스 노트·배포 전략
- GitHub 릴리스 페이지에 각 OS 별 설치 파일 업로드  
- 주요 변경 사항은 `CHANGELOG.md` 에 기록하고, 릴리스 태그와 연결  

## 사용 방법
1. **설치 파일 다운로드** – GitHub 릴리스 페이지에서 OS에 맞는 `.dmg`, `.exe`, `.AppImage` 등을 선택  
2. **첫 실행** – 초기 설정 마법사가 나타나면  
   - OpenClaw 인스턴스 이름, 포트, 구성 파일 경로 입력  
   - 팀 데이터(`agents.list`) 경로 지정 (파일 락 적용)  
3. **대시보드 탐색**  
   - 좌측 메뉴에서 **Instances**, **Monitoring**, **Workflow** 탭 전환  
   - 실시간 토큰·비용·세션 그래프 확인  
4. **협업 작업 흐름 예시**  
   - **리더** 역할 계정으로 “새 작업” 생성 → 상태 `open`  
   - **실행자**가 작업을 클릭해 `claimed` 로 전환  
   - 작업 수행 후 `done` 혹은 `failed` 로 마무리하고 사유 입력  
   - WebSocket 알림이 해당 역할에게 즉시 전달  

## 확장 및 커스터마이징
### 새로운 OpenClaw 인스턴스 추가
UI → **Add Instance** 버튼 클릭 → 포트·구성 파일 지정 → 자동으로 Gateway 서브프로세스 생성  

### 플러그인·스킬 연동 가이드
Pond 은 **pond‑team** 스킬을 기본 제공하며, 추가 스킬은 `plugins/` 디렉터리에 Rust 로 구현 후 `Cargo.toml` 에 등록합니다. 자세한 플러그인 인터페이스는 프로젝트 레포지토리의 `PLUGIN_GUIDE.md` 를 참고하세요.  

### UI 테마·레이아웃 커스터마이징
- Tailwind CSS 설정 파일(`tailwind.config.js`)을 수정해 색상·폰트 변경 가능  
- React 컴포넌트 구조는 `src/components/` 에 위치, 필요에 따라 새로운 Radix UI 컴포넌트 추가  

### 파일 락·동시성 정책 조정
- `fs4::FileExt` 를 이용한 파일 락 구현은 `src/utils/file_lock.rs` 에 정의  
- 락 타임아웃·재시도 로직은 `LOCK_RETRY_COUNT` 상수 수정으로 조정 가능  

## 보안·권한 관리
- 파일 락을 사용하려면 실행 사용자에게 해당 파일에 대한 **읽기·쓰기** 권한이 필요합니다.  
- macOS 및 Linux에서는 실행 파일이 **Gatekeeper**/AppArmor 정책에 의해 제한될 수 있으므로, 배포 시 적절한 권한 서명을 권장합니다.  
- 네트워크 통신은 로컬 WebSocket만 사용하므로 외부 포트 개방이 필요 없으며, 필요 시 TLS 기반 WebSocket으로 전환할 수 있습니다.  

## 문제 해결 / FAQ
**Q1. Tauri 개발 중 `tauri dev` 가 실패합니다.**  
A. Rust toolchain이 최신인지 확인하고, `cargo update` 로 의존성을 최신화합니다. 또한 macOS에서는 Xcode Command Line Tools가 설치돼 있어야 합니다.  

**Q2. React 개발 서버가 포트 충돌을 일으킵니다.**  
A. `package.json` 의 `dev` 스크립트에 `--port 3001` 과 같이 포트를 지정하거나, 환경 변수 `PORT=3001` 을 설정합니다.  

**Q3. 파일 락 오류(`WouldBlock`) 가 발생합니다.**  
A. 동일한 `agents.list` 파일을 다른 프로세스가 이미 점유하고 있는 경우입니다. 락 타임아웃을 늘리거나, 파일 경로를 인스턴스별로 분리하십시오.  

**Q4. macOS에서 실행 파일이 “신뢰할 수 없는 개발자” 라는 메시지를 표시합니다.**  
A. Apple Developer 계정으로 코드 서명 후 `xattr -d com.apple.quarantine <binary>` 명령을 사용하거나, 사용자가 직접 “열기”를 선택하도록 안내합니다.  

**Q5. Linux에서 `libgtk-3-dev` 가 없다는 오류가 뜹니다.**  
A. `sudo apt-get install libgtk-3-dev` 로 필요한 GTK 라이브러리를 설치합니다.  

## 제한 사항 및 향후 로드맵
### 현재 미지원 기능

| 기능               | 설명                                                               |
|--------------------|--------------------------------------------------------------------|
| 클라우드 동기화      | 구성·팀 데이터의 원격 백업·동기화 기능이 없음                         |
| 모바일 클라이언트   | 데스크톱 전용 UI만 제공                                            |
| 스킬 마켓플레이스   | 계획 중이지만 아직 구현되지 않음                                    |

### 예정 기능
- **스킬 마켓플레이스**: 커뮤니티가 만든 스킬을 공유·설치할 수 있는 UI/백엔드  
- **클라우드 기반 설정 동기화**: S3·GCS 등 객체 스토리지와 연동해 팀 설정을 중앙 관리  

## 커뮤니티 기여·피드백
- 프로젝트는 **오픈 소스**이며 GitHub 레포지토리에서 이슈·PR 로 참여 가능  
- 사용 중 발견한 버그·요청 사항은 레포지토리 이슈 트래커에 등록  

## 부록
### 주요 코드 스니펫

    // Gateway 프로세스 실행
    let mut cmd = Command::new("openclaw-gateway");
    cmd.arg("--port")
       .arg(port.to_string())
       .arg("--config")
       .arg(config_path);
    let child = cmd.spawn()?;  

    // 파일 락 사용 예시
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(team_data_path)?;
    file.lock_exclusive()?;
    // ... read/write ...
    file.unlock()?;  

### 용어 정의
- **Gateway**: OpenClaw 인스턴스를 감싸는 서브프로세스, 포트·구성을 독립적으로 가짐  
- **Pond**: 본 프로젝트명, OpenClaw 제어 센터 전체를 의미  
- **agents.list**: 팀 내 역할(리더·실행자) 정의 파일  

### 참고 문서·외부 리소스
- Tauri 공식 가이드: https://tauri.app/v1/guides/  
- Rust async Tokio 튜토리얼: https://tokio.rs/tokio/tutorial  
- fs4 파일 락 크레이트: https://crates.io/crates/fs4  
- React 18 문서: https://react.dev/learn  

### 라이선스·기여 안내
- 본 프로젝트는 **MIT License** 로 배포됩니다.  
- 기여 방법은 레포지토리 `CONTRIBUTING.md` 를 참고하십시오.  