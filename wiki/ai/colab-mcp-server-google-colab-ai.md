---
title: Colab MCP Server – Google Colab에서 AI 에이전트 실행하기
author: SEPilot AI
status: published
tags: ["Google Colab", "mcp", "AI Agent", "프로토타이핑", "자동화"]
---

## 1. 소개
이 문서는 **Google Colab**을 백엔드 샌드박스로 활용해 **MCP‑호환 AI 에이전트**(예: Gemini CLI, Claude Code, 사용자 정의 에이전트)를 실행하고 프로토타이핑하는 방법을 안내합니다.  
대상 독자는  

* 로컬 머신에서 AI 에이전트를 개발·테스트하는 개발자  
* 빠른 컴퓨팅과 격리된 실행 환경이 필요한 데이터 과학자  
* AI‑driven 워크플로우를 클라우드에서 자동화하고자 하는 엔지니어  

### 로컬 프로토타이핑의 한계
* 로컬 CPU/GPU/TPU 자원 제한 → 의존성 설치·코드 실행 시 지연 발생  
* 하드웨어 기반 실행은 보안·격리 측면에서 위험  

### Colab MCP 서버가 해결하는 문제
* **고성능 클라우드 컴퓨팅**(GPU/TPU) 제공  
* **안전한 샌드박스**에서 코드 실행 → 로컬 환경 오염 방지  
* **프로그래밍적 접근**을 통해 에이전트가 노트북 전체 라이프사이클을 자동화 가능[[출처](https://euno.news/posts/ko/announcing-the-colab-mcp-server-connect-any-ai-age-0182c2)]  

---

## 2. Model Context Protocol (MCP) 개요
### MCP 정의 및 핵심 개념
MCP는 **Model Context Protocol**의 약자로, AI 모델·에이전트와 외부 실행 환경(예: IDE, 노트북) 사이의 **표준화된 JSON 기반 명령/응답 인터페이스**를 정의합니다.  

### MCP‑호환 에이전트 ↔ Colab 통신 흐름
1. 로컬 에이전트가 **MCP JSON**에 정의된 서버 주소와 명령을 전송  
2. **Colab MCP 서버**(uvx 실행) 가 해당 명령을 받아 Colab 노트북 API에 매핑  
3. 노트북이 셀 추가·코드 실행·결과 반환 등 작업 수행  
4. 결과가 MCP 응답으로 에이전트에 전달  

### 기존 MCP 활용 사례와 차별점
* 기존에는 로컬 IDE와 모델 서버 간 통신에 MCP가 사용됐으나, **Colab MCP**는 클라우드 노트북을 직접 제어함으로써 **전체 개발 파이프라인을 클라우드‑네이티브**로 전환합니다.  

---

## 3. Colab MCP 서버 아키텍처
### 서버 구성 요소
| 구성 요소 | 역할 |
|---|---|
| **프록시** | 로컬 에이전트와 Colab 사이의 HTTP/WS 통신 중계 |
| **JSON 설정 파일** | `mcpServers` 섹션에 서버 명령·인수·타임아웃 정의 |
| **uvx 실행기** | `uvx` 로 `git+https://github.com/googlecolab/colab-mcp` 패키지를 실행, 의존성 자동 해결 |

### 연결 모델
* **클라우드 Colab 노트북** ↔ **프록시** ↔ **로컬 에이전트**  
  - 프록시는 Colab 노트북 API를 호출하고, 결과를 JSON 형태로 에이전트에 전달합니다.  

### 보안·샌드박스 설계 원칙
* **토큰 기반 인증**: Google 계정 OAuth 토큰을 사용해 Colab 세션에 접근  
* **격리된 실행 환경**: Colab 노트북 자체가 제공하는 샌드박스(런타임) 안에서 코드가 실행되므로 로컬 파일 시스템에 직접 접근 불가  
* **최소 권한 원칙**: MCP 서버는 노트북 조작에 필요한 최소 API만 사용하도록 설계  

---

## 4. 사전 요구 사항
| 항목 | 확인 방법 | 비고 |
|---|---|---|
| **Git** | `git version` 실행 | macOS·Linux 기본 제공, Windows는 별도 설치 |
| **Python** | `python --version` 실행 | 3.8 이상 권장 |
| **uv** (빠른 Python 패키지 관리자) | `pip install uv` 후 `uv --version` | 공식 uv 문서: <https://github.com/astral-sh/uv> |
| **Google 계정** | Colab 접속 가능 여부 확인 | 개인·조직 계정 모두 사용 가능 |
| **Colab 접근 권한** | <https://colab.research.google.com> 접속 | GPU/TPU 사용 시 별도 할당 필요 |

---

## 5. 설치 및 초기 설정
### 1) 레포지토리 클론 및 의존성 설치
```bash
git clone https://github.com/googlecolab/colab-mcp
cd colab-mcp
uv pip install -r requirements.txt
```
*위 명령은 `uv` 를 이용해 의존성을 빠르게 설치합니다.*

### 2) MCP JSON 구성 파일 작성
프로젝트 루트에 `mcp-config.json` 파일을 만들고 아래와 같이 입력합니다(인덴트는 그대로 유지).  

```json
{
  "mcpServers": {
    "colab-proxy-mcp": {
      "command": "uvx",
      "args": ["git+https://github.com/googlecolab/colab-mcp"],
      "timeout": 30000
    }
  }
}
```
*`command`는 실행 도구, `args`는 실제 패키지 URL, `timeout`은 밀리초 단위 최대 대기 시간*[[출처](https://euno.news/posts/ko/announcing-the-colab-mcp-server-connect-any-ai-age-0182c2)]  

### 3) 서버 실행
```bash
uvx git+https://github.com/googlecolab/colab-mcp
```
실행 시 콘솔에 `MCP server listening on http://127.0.0.1:...` 와 같은 메시지가 표시되면 정상 가동된 것입니다.

---

## 6. 에이전트 연동 방법
### 1) 에이전트 설정
* **Gemini CLI** 혹은 **Claude Code** 등 MCP‑호환 에이전트는 `--mcp-config` 옵션으로 위 JSON 파일 경로를 지정합니다.  

예시 (Gemini CLI):
```bash
gemini --mcp-config ./mcp-config.json
```

### 2) 서버 주소 지정
에이전트 내부 설정 파일(`agent.yaml` 등)에서 `mcpServerUrl: http://127.0.0.1:...` 로 지정합니다.  

### 3) 연결 테스트
에이전트 콘솔에서 간단한 명령을 실행합니다.  

```bash
agent> ping
```
응답으로 `pong` 이 반환되면 연결이 정상입니다.

---

## 7. Colab 노트북 자동화 시나리오
### 셀 추가·구조화
1. 에이전트가 `create_notebook` 명령으로 새 `.ipynb` 파일 생성  
2. `add_markdown` 명령으로 “데이터 분석 개요” 셀 삽입  

### 코드 작성·실행 및 라이브러리 설치
* `add_code` 로 `import pandas as pd` 등 코드 삽입  
* `run_cell` 로 즉시 실행 → 결과가 JSON 으로 반환  
* 필요 시 `!pip install seaborn` 같은 셀을 자동 추가  

### 결과 시각화·보고서 정리
* `add_code` 로 `matplotlib.pyplot` 그래프 코드를 삽입하고 실행  
* `move_cell` 로 시각화 셀을 보고서 섹션으로 이동  

전체 흐름 예시(텍스트 형태):
```
agent> create_notebook "sales_analysis.ipynb"
agent> add_markdown "## Sales Data Overview"
agent> add_code "import pandas as pd\ndf = pd.read_csv('sales.csv')\nprint(df.head())"
agent> run_cell 2
agent> add_code "import matplotlib.pyplot as plt\nplt.plot(df['month'], df['revenue'])\nplt.show()"
agent> run_cell 3
```
에이전트는 위 명령을 순차적으로 Colab에 전달하고, 실시간 결과를 받아 로컬 로그에 출력합니다.

---

## 8. 고급 기능 및 확장
### 사용자 정의 명령·플러그인
* `plugins/` 디렉터리에 Python 스크립트를 추가하고 `mcp-config.json` 의 `plugins` 섹션에 경로를 명시하면 에이전트가 새로운 명령을 호출 가능  

### 다중 에이전트 동시 운영
* 각 에이전트마다 고유 `serverId` 를 부여하고, 프록시가 **멀티테넌시**를 지원하도록 `timeout` 과 `maxConcurrent` 를 조정  

### 작업 큐·타임아웃 관리 팁
* `timeout` 값을 상황에 맞게 늘리면 장시간 실행 셀(예: 모델 학습)도 안전하게 처리  
* 큐가 포화될 경우 `queueSize` 를 모니터링하고, 필요 시 서버 재시작 권장  

---

## 9. 보안·프라이버시 고려 사항
### 인증 토큰 관리
* OAuth 토큰은 **환경 변수**(`COLAB_MCP_TOKEN`)에 저장하고, `git-crypt` 등으로 암호화해 버전 관리에 포함하지 않음  
* 토큰은 최소 권한(노트북 읽기·쓰기)만 부여  

### 실행 환경 격리
* Colab 런타임은 기본적으로 **Docker 기반 샌드박스**이며, 파일 시스템 접근은 `/content` 디렉터리로 제한됩니다.  

### 데이터 유출 방지
* 민감 데이터는 **Google Cloud Storage**에 암호화 저장 후, Colab에서 `gcsfs` 로 읽도록 설계  
* MCP 서버 로그에 데이터 내용이 기록되지 않도록 `logLevel: error` 로 설정  

---

## 10. 문제 해결 및 트러블슈팅
| 증상 | 가능한 원인 | 해결 방법 |
|---|---|---|
| **연결 실패 (`ConnectionRefused`)** | MCP 서버 미가동 또는 포트 충돌 | `uvx` 명령 재실행, 포트 확인 (`lsof -i :<port>`) |
| **`timeout` 오류** | 긴 실행 셀(예: 모델 학습) | `timeout` 값을 `mcp-config.json` 에서 60000 이상으로 증가 |
| **인증 오류** | 토큰 누락·만료 | 환경 변수 `COLAB_MCP_TOKEN` 재설정, 토큰 재발급 |
| **셀 실행 결과 없음** | Colab 런타임 비활성 | 노트북 상단 `Runtime → Restart runtime` 후 재시도 |

### 로그 확인
* 서버 로그는 콘솔에 출력되며, `--log-file ./mcp.log` 옵션으로 파일 저장 가능.  

### 커뮤니티·GitHub 이슈 활용
* 공식 레포지토리 이슈 트래커에 동일 문제를 검색하고, 없을 경우 새 이슈를 작성해 개발자와 협업합니다.  

---

## 11. 베스트 프랙티스
* **프로토타이핑 워크플로우**: 에이전트 명령을 작은 단위(셀 하나씩)로 나누어 단계별 검증  
* **리소스 비용 최적화**: GPU/TPU 사용이 필요 없는 작업은 **Standard** 런타임으로 전환, 사용 후 `Runtime → Manage sessions` 에서 세션 종료  
* **버전 관리·재현성**: `requirements.txt` 와 `environment.yml` 을 레포에 포함하고, `uv lock` 으로 정확한 패키지 버전 고정  

---

## 12. FAQ
**Q1. Colab MCP 서버는 무료인가요?**  
A: 서버 자체는 오픈‑소스이며 무료입니다. 다만 Colab 런타임(특히 GPU/TPU) 사용량은 Google Colab 정책에 따라 과금될 수 있습니다.

**Q2. GPU/TPU 자원을 어떻게 할당하나요?**  
A: 노트북 상단 `Runtime → Change runtime type` 에서 원하는 하드웨어 가속기를 선택합니다. 에이전트는 해당 런타임을 그대로 사용합니다.

**Q3. 에이전트가 비정상 종료될 때 복구 방법은?**  
A: `uvx` 프로세스를 재시작하고, `mcp-config.json` 의 `restartOnFailure: true` 옵션을 활성화하면 자동 재시작이 가능합니다.

---

## 13. 참고 자료 및 링크
* **공식 GitHub 레포지토리** – <https://github.com/googlecolab/colab-mcp>  
* **Google Developers Blog** – Colab MCP 서버 발표 원문 (위 뉴스 요약에 인용)  
* **uv 공식 문서** – <https://github.com/astral-sh/uv>  
* **Google Colab 문서** – <https://colab.research.google.com/notebooks/intro.ipynb>  

---

## 14. 부록
### 전체 설정 스크립트 예시
```bash
# 1. 필수 도구 설치
pip install uv
# 2. 레포 클론 및 의존성 설치
git clone https://github.com/googlecolab/colab-mcp
cd colab-mcp
uv pip install -r requirements.txt
# 3. MCP 설정 파일 생성
cat > mcp-config.json <<EOF
{
  "mcpServers": {
    "colab-proxy-mcp": {
      "command": "uvx",
      "args": ["git+https://github.com/googlecolab/colab-mcp"],
      "timeout": 30000
    }
  }
}
EOF
# 4. 서버 실행
uvx git+https://github.com/googlecolab/colab-mcp
```

### JSON 구성 파일 전체 템플릿
```json
{
  "mcpServers": {
    "colab-proxy-mcp": {
      "command": "uvx",
      "args": ["git+https://github.com/googlecolab/colab-mcp"],
      "timeout": 30000,
      "restartOnFailure": true,
      "logLevel": "error"
    }
  },
  "plugins": [
    "plugins/custom_analysis.py"
  ]
}
```

### 용어 정의 Glossary
| 용어 | 정의 |
|---|---|
| **MCP** | Model Context Protocol – AI 모델·에이전트와 외부 환경 간 표준 JSON 인터페이스 |
| **uvx** | `uv` 로 제공되는 실행기, 파이썬 패키지를 격리된 환경에서 바로 실행 |
| **프록시** | Colab API 호출을 중계하는 HTTP/WS 서버 |
| **샌드박스** | 격리된 실행 환경으로, 외부 파일·네트워크 접근을 제한 |

---