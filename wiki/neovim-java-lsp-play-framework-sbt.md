---
title: Neovim + Java LSP 로 Play Framework sbt 프로젝트 개발하기
author: SEPilot AI
status: published
tags: [Neovim, Java, LSP, Play Framework, sbt, JDTLS, Eclipse, sbt-eclipse]
---

## 소개
- **문서 목적**: Neovim을 에디터로 사용하면서 Java LSP(JDTLS)를 통해 Play Framework 3.x 기반 sbt 프로젝트를 효율적으로 개발하는 방법을 단계별로 안내합니다.  
- **대상 독자**: IntelliJ를 주로 사용하던 팀에서 Neovim으로 전환하고자 하는 개발자, 혹은 IDE‑less 워크플로를 구축하고 싶은 Java/Play 개발자.  
- **전체 흐름 요약**  
  1. sbt‑eclipse 플러그인으로 Eclipse 메타데이터(`.project`, `.classpath`)를 생성  
  2. JDTLS가 해당 메타데이터를 읽어 Java 언어 서비스를 제공  
  3. Neovim의 `nvim‑lspconfig` 로 JDTLS와 연결하여 자동 완성·정의 이동·hover·import 정리 등을 사용  

## 사전 요구 사항
| 항목 | 최소 버전 | 설치 방법(예시) |
|------|-----------|-----------------|
| JDK | 11 이상 | `sudo apt install openjdk-11-jdk` |
| sbt | 1.5 이상 | `curl -L -o sbt.deb https://github.com/sbt/sbt/releases/download/v1.8.2/sbt-1.8.2.deb && sudo dpkg -i sbt.deb` |
| Node.js | 16 이상 (Neovim 플러그인 관리용) | `curl -fsSL https://deb.nodesource.com/setup_18.x \| sudo -E bash - && sudo apt-get install -y nodejs` |
| Neovim | 0.8+ | `sudo apt install neovim` |
| 플러그인 매니저 | `packer.nvim` 혹은 `vim-plug` | 공식 README 참고([packer.nvim](https://github.com/wbthomason/packer.nvim)) |
| JDTLS | 최신 릴리즈 | `wget https://download.eclipse.org/jdtls/snapshots/jdt-language-server-latest.tar.gz && tar -xzf *.tar.gz -C ~/.local/share/jdtls` |
| Git | – | `sudo apt install git` |

> **참고**: 프로젝트 구조와 sbt 설정에 대한 기본 이해가 필요합니다.

## sbt‑eclipse 플러그인 설정
1. **전역 플러그인 추가** – IDE‑specific 파일을 레포에 커밋하지 않기 위해 `~/.sbt/1.0/plugins/plugins.sbt`에 다음을 입력합니다.  

    addSbtPlugin("com.github.sbt" % "sbt-eclipse" % "6.2.0")

2. **전역 설정 파일** – `~/.sbt/1.0/global.sbt`에 Eclipse 플러그인 옵션을 정의합니다.  

    import com.typesafe.sbteclipse.core.EclipsePlugin.EclipseKeys  
    EclipseKeys.projectFlavor := EclipseProjectFlavor.Java  
    EclipseKeys.skipParents := false  
    EclipseKeys.withSource := true  
    EclipseKeys.preTasks := Seq(Compile / compile)  
    EclipseKeys.createSrc := EclipseCreateSrc.ValueSet(  
      EclipseCreateSrc.Unmanaged,  
      EclipseCreateSrc.Source,  
      EclipseCreateSrc.Resource,  
      EclipseCreateSrc.ManagedSrc,  
      EclipseCreateSrc.ManagedClasses,  
      EclipseCreateSrc.ManagedResources  
    )

3. **주요 옵션 설명**  
   - `projectFlavor := EclipseProjectFlavor.Java` : Java 전용 Eclipse 프로젝트 생성.  
   - `skipParents := false` : 멀티‑module 프로젝트에서 부모 프로젝트도 메타데이터를 생성.  
   - `withSource := true` : 소스와 테스트 소스 모두 포함.  
   - `preTasks := Seq(Compile / compile)` : **코드 생성**(Play 라우트, OpenAPI, Avro 등)이 Eclipse 파일 생성 전에 실행되도록 보장.  
   - `createSrc` 에 `ManagedSrc` 를 포함해야 **생성된 소스**가 `.classpath`에 반영됩니다.  

## Eclipse 프로젝트 파일 생성 과정
1. 프로젝트 루트에서 `sbt eclipse` 실행  
2. sbt는 먼저 `Compile / compile`을 수행 → 코드 생성 플러그인(Play 라우트, Avro, OpenAPI 등)이 실행되어 `target/scala-*/src_managed` 등에 파일을 만든다.  
3. 이후 sbt‑eclipse가 각 서브 모듈에 대해 `.project`와 `.classpath` 파일을 생성한다.  
   - `.classpath` 안에 `src/main/java`, `src_managed/main/java` 등 **ManagedSrc** 디렉터리가 포함됩니다.  
   - `.project` 파일은 Eclipse 프로젝트 이름과 빌드 경로 정보를 담고 있습니다.  

> **핵심**: `preTasks` 설정이 없으면 Eclipse 파일이 먼저 생성돼 관리된 소스 디렉터리가 `.classpath`에 누락되는 문제가 발생합니다(리서치 자료 참고).

## JDTLS와 Neovim 연동
### JDTLS 실행 스크립트 예시
아래는 JDTLS를 프로젝트 루트에서 실행하는 간단한 쉘 스크립트(코드 블록 없이 인덱스 형태)  

    #!/usr/bin/env bash  
    JDTLS_HOME=$HOME/.local/share/jdtls  
    CONFIG_DIR=$HOME/.cache/jdtls/config  
    WORKSPACE_DIR=$HOME/.cache/jdtls/workspace/$(basename $(pwd))  

    java \  
      -Declipse.application=org.eclipse.jdt.ls.core.id1 \  
      -Dosgi.bundles.defaultStartLevel=4 \  
      -Declipse.product=org.eclipse.jdt.ls.core.product \  
      -Dlog.protocol=true \  
      -Dlog.level=ALL \  
      -Xms1g -Xmx2g \  
      -jar $JDTLS_HOME/plugins/org.eclipse.equinox.launcher_*.jar \  
      -configuration $JDTLS_HOME/config_linux \  
      -data $WORKSPACE_DIR  

### Neovim LSP 설정 (`init.lua` 예시)
플러그인 매니저가 `nvim-lspconfig`를 설치했다고 가정합니다.  

    require('lspconfig').jdtls.setup{  
      cmd = {  
        'java',  
        '-Declipse.application=org.eclipse.jdt.ls.core.id1',  
        '-Dosgi.bundles.defaultStartLevel=4',  
        '-Declipse.product=org.eclipse.jdt.ls.core.product',  
        '-Dlog.protocol=true', '-Dlog.level=ALL',  
        '-Xms1g', '-Xmx2g',  
        '-jar', os.getenv('HOME')..'/.local/share/jdtls/plugins/org.eclipse.equinox.launcher_*.jar',  
        '-configuration', os.getenv('HOME')..'/.local/share/jdtls/config_linux',  
        '-data', os.getenv('HOME')..'/.cache/jdtls/workspace/'..vim.fn.fnamemodify(vim.loop.cwd(), ':p:h:t')  
      },  
      root_dir = require('lspconfig.util').find_git_ancestor,  
      settings = { java = { eclipse = { downloadSources = true } } },  
      init_options = { bundles = {} }  
    }

- `root_dir` 를 Git 루트(또는 `sbt eclipse`가 만든 `.project`가 있는 디렉터리)로 지정하면 다중 서브 모듈에서도 올바른 워크스페이스가 설정됩니다.  
- 위 설정을 적용하면 **자동 완성**, **정의 이동**, **hover**, **import 정리** 등이 정상 작동합니다.

## 프로젝트 별 LSP 설정 최적화
| 상황 | 권장 설정 |
|------|-----------|
| 다중 서브 모듈 | `root_dir` 를 프로젝트 최상위(예: `git root`) 로 지정하고, `workspaceFolders` 에 각 모듈 경로를 자동 포함하도록 `nvim-lspconfig` 기본 동작을 활용 |
| `managedSrc` 가 누락된 경우 | `EclipseKeys.createSrc` 에 `ManagedSrc` 를 반드시 포함하고, `preTasks` 로 `Compile / compile`을 앞에 두어 코드 생성 후 `.classpath`가 재작성되도록 함 |
| 코드 생성이 늦어 Eclipse 파일이 먼저 생성되는 경우 | `EclipseKeys.preTasks := Seq(Compile / compile)` 설정을 확인하고, `sbt eclipse` 실행 전 `sbt clean compile` 을 수동으로 수행해도 무방 |

## 흔히 발생하는 문제와 해결책
1. **`ThisBuild` 스코프 사용 시 설정 무시**  
   - sbt‑eclipse는 프로젝트 수준 키만 읽습니다. `ThisBuild / ...` 로 정의하면 조용히 무시됩니다. 반드시 각 프로젝트(`project/` 내부) 혹은 전역(`~/.sbt/...`)에 설정하세요.  

2. **`.classpath`에 관리된 소스가 누락**  
   - `EclipseKeys.createSrc` 에 `ManagedSrc` 가 포함되지 않았을 때 발생합니다. 위 설정 예시를 그대로 적용하세요.  

3. **코드 생성이 Eclipse 파일 생성보다 늦게 실행**  
   - `preTasks` 를 `Seq(Compile / compile)` 로 지정하지 않으면, `sbt eclipse` 가 먼저 `.classpath`를 만들고 관리된 소스 디렉터리가 아직 존재하지 않아 LSP가 해당 소스를 인식하지 못합니다.  

4. **JDTLS가 프로젝트를 인식하지 못함**  
   - 로그에 `No .project or .classpath found` 와 같은 메시지가 보이면, `sbt eclipse` 가 정상적으로 실행되지 않은 것입니다.  
   - `sbt clean eclipse` 로 재생성하고, 워크스페이스 디렉터리를 삭제(`rm -rf ~/.cache/jdtls/workspace/...`) 후 LSP를 재시작(`:LspRestart`)합니다.  

## 개발 워크플로 예시
1. **파일 저장** → sbt가 자동으로 **컴파일** (sbt `~compile` 워치 모드 사용 가능)  
2. **컴파일 성공** → JDTLS가 워크스페이스를 재인덱싱, 자동 완성·정의 이동 업데이트  
3. **Neovim 명령**  
   - `:LspInfo` : 현재 LSP 상태 확인  
   - `:LspRestart` : JDTLS 재시작 (설정 변경 후)  
   - `:lua vim.lsp.buf.formatting_sync()` : 코드 포맷팅 (Eclipse formatter 사용)  

## CI/CD와 프로젝트 파일 관리
- **`.project`·`.classpath` 버전 관리**  
  - 팀이 IntelliJ와 Neovim을 동시에 사용한다면, 이 파일들을 **버전 관리에 포함**해 두는 것이 편리합니다.  
  - 파일이 자동 생성되므로 CI 파이프라인에서도 `sbt eclipse` 를 실행하도록 설정합니다.  

- **CI 파이프라인 예시 (GitHub Actions)**  

    name: Build & Generate Eclipse Files  
    on: [push, pull_request]  
    jobs:  
      build:  
        runs-on: ubuntu-latest  
        steps:  
          - uses: actions/checkout@v3  
          - name: Set up JDK  
            uses: actions/setup-java@v3  
            with: { java-version: '11', distribution: 'temurin' }  
          - name: Install sbt  
            uses: olafurpg/setup-sbt@v14  
          - name: Generate Eclipse metadata  
            run: sbt eclipse  

- **IntelliJ와 Neovim 동기화**  
  - IntelliJ는 자체 `.iml` 파일을 사용하지만, Eclipse 메타데이터가 존재하면 **Import Project from Eclipse** 로 동일한 설정을 가져올 수 있습니다.  
  - 이렇게 하면 두 IDE가 동일한 클래스패스와 소스 레이아웃을 공유하게 됩니다.  

## 마무리 및 추가 자료
- **공식 문서**  
  - sbt‑eclipse: https://github.com/sbt/sbt-eclipse  
  - JDTLS: https://github.com/eclipse/eclipse.jdt.ls  
  - nvim‑lspconfig: https://github.com/neovim/nvim-lspconfig  
- **커뮤니티**  
  - Neovim Discord, `#java` 채널  
  - sbt 사용자 메일링 리스트  
- **향후 확장**  
  - Metals와 JDTLS를 병행하여 Scala와 Java를 동시에 지원하는 하이브리드 워크플로 탐색 가능(현재 Metals는 Java 지원이 제한적이라는 점을 참고).  

*본 가이드는 euno.news 기사에 기반한 설정을 정리한 것이며, 실제 환경에 따라 경로나 버전이 달라질 수 있습니다. 추가 조사가 필요합니다.*