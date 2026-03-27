---
title: 자동 일기 AI 에이전트 – OpenClaw 크론 기반 워크플로
author: SEPilot AI
status: draft
tags: [AI, 자동화, OpenClaw, cron, GitHub, dev.to, Telegram]
---

## 1. 개요
자동 일기 AI 에이전트는 매일 정해진 시간에 **cron** 작업을 통해 다음 흐름을 자동으로 수행합니다.

1. 최신 메모리 파일(`SOUL.md`, `USER.md`, `memory/` 디렉터리) 읽기  
2. 빌드‑log 항목을 마크다운 형식으로 작성  
3. GitHub 레포지토리에 커밋·푸시  
4. dev.to에 초안 생성 후 바로 게시  
5. Telegram Bot을 통해 제목·URL·요약을 알림  

이 전체 파이프라인은 인간의 개입 없이 진행되며, 운영자는 **Telegram 알림**을 통해 결과를 검증하고 필요 시 삭제·수정을 수행합니다.  
> “머신의 크론 작업이 매일 아침 깨워서 … 모두 인간의 개입 없이 이루어집니다.” – [euno.news](https://euno.news/posts/ko/the-agent-that-writes-its-own-diary-automatically-910f8a)

### 기대 효과
- **일관성**: 매일/주기적으로 동일 포맷의 일기가 생성돼 독자와 팀에게 일정한 정보를 제공  
- **효율성**: 운영자(Julio)의 검토 시간 최소화(≈주 10 시간) → 핵심 업무에 집중  
- **투명성**: GitHub 커밋·dev.to 타임스탬프가 공개 기록으로 남아 신뢰성 확보  

## 2. 배경 및 필요성
### 기존 프로세스 문제점
- 수동으로 일기·보고서를 작성하면 포맷·시점이 불규칙하고, 인간 실수(오탈자·누락)가 발생  
- 빌드 로그와 같은 저위험 콘텐츠는 자동화가 가능함에도 불구하고 여전히 수작업에 의존  

### 자동화 가치
- **Consistency**: 정기적인 공개 빌드 로그는 주 1회 정도가 적당하며, 긴 공백은 독자 흐름을 끊음 ([euno.news](https://euno.news/posts/ko/the-agent-that-writes-its-own-diary-automatically-910f8a))  
- **Efficiency**: 운영자는 문서화보다 빌드에 집중할 수 있음  

### OpenClaw 소개
OpenClaw은 **cron 기반 스케줄러**와 **REST API**를 제공하는 경량 에이전트 프레임워크로, 다양한 외부 서비스(GitHub, dev.to, Telegram 등)와 손쉽게 연동할 수 있습니다. 공식 문서는 <https://openclaw.dev/docs> 에서 확인할 수 있습니다.

## 3. 아키텍처 개요
```
┌─────────────┐      ┌─────────────┐
│   Cron (08:00│─────►│ OpenClaw    │
│   UTC, 평일)│      │ agentTurn   │
└─────┬───────┘      └─────┬───────┘
      │                    │
      ▼                    ▼
┌─────────────┐   ┌─────────────────┐
│  파일 시스템│   │ GitHub API      │
│  (SOUL.md,  │   │ (clone, commit)│
│   USER.md)  │   └─────┬───────────┘
└─────┬───────┘         │
      │                 ▼
      ▼           ┌─────────────────┐
┌─────────────┐   │ dev.to API      │
│  LLM (주제·   │   │ (draft, publish)│
│   콘텐츠)   │   └─────┬───────────┘
└─────┬───────┘         │
      │                 ▼
      ▼           ┌─────────────────┐
                │ Telegram Bot API │
                │ (알림 전송)      │
                └─────────────────┘
```
- **데이터 흐름**: Cron → OpenClaw → 파일 → LLM → GitHub → dev.to → Telegram  
- **의존 관계**: OpenClaw은 GitHub PAT, dev.to 토큰, Telegram Bot 토큰을 필요로 함.

## 4. 설정 및 크론 스케줄링
### OpenClaw 설치
1. Docker Hub에서 최신 이미지 pull  
   `docker pull openclaw/openclaw:latest`  
2. 환경 변수 파일(`.env`)에 API 토큰을 정의 (GitHub_PAT, DEVTO_TOKEN, TELEGRAM_TOKEN)  
3. Docker Compose 예시 (인덱스 4‑space 들여쓰기 사용)  

    version: "3.8"
    services:
        openclaw:
            image: openclaw/openclaw:latest
            env_file: .env
            restart: unless-stopped

### Cron 표현식
- **평일 08:00 UTC** → `0 8 * * 1-5`  
- OpenClaw 내부 설정 파일(`cron.yaml`)에 아래와 같이 정의  

    schedule: "0 8 * * 1-5"
    task: "agentTurn"
    payload: |
        {
            "repo": "github.com/yourorg/build-log",
            "context_files": ["SOUL.md", "USER.md", "memory/"],
            "devto_tags": ["ai", "automation"],
            "telegram_chat_id": "-123456789"
        }

### 로컬 테스트
- Docker 컨테이너 내부에서 `cron` 명령을 직접 실행하거나 `docker exec` 로 `openclaw` 쉘에 진입 후 `openclaw trigger agentTurn` 명령을 사용합니다.

## 5. OpenClaw API 연동
### 인증 방식
- **Personal Access Token (PAT)** 방식이 기본이며, `Authorization: Bearer <PAT>` 헤더에 포함합니다.  
- 필요 시 OAuth2 흐름을 적용할 수 있으나, 현재 예시는 PAT 사용을 권장합니다.

### 주요 엔드포인트
| 메서드 | 경로                | 설명                     |
|-------|--------------------|--------------------------|
| POST  | `/api/agentTurn`   | 작업 페이로드 전송 및 트리거 |
| GET   | `/api/status`      | 현재 에이전트 상태 조회   |

### 호출 예시 (curl)
```bash
curl -X POST https://openclaw.example.com/api/agentTurn \
     -H "Authorization: Bearer $OPENCLAW_PAT" \
     -H "Content-Type: application/json" \
     -d '{"repo":"github.com/yourorg/build-log","context_files":["SOUL.md","USER.md"],"devto_tags":["ai","automation"]}'
```

### 오류 코드 및 재시도
- `429 Too Many Requests` → 30초 후 재시도  
- `500 Internal Server Error` → 5회까지 지수 백오프 적용  

## 6. 메모리·컨텍스트 읽기
### 파일 구조
```
/repo-root/
│
├─ SOUL.md          # 에이전트의 목표·비전
├─ USER.md          # 사용자 프로필·관심사
└─ memory/
   ├─ 2023-09-01.md
   ├─ 2023-09-02.md
   └─ …
```
- 최신 파일은 파일명(ISO‑8601) 기준으로 정렬하여 가장 최근 항목을 추출합니다.

### 파싱 로직 (Python 예시, 4‑space 들여쓰기)
import os, pathlib, yaml, json
def load_latest_memory(mem_dir):
    files = sorted(pathlib.Path(mem_dir).glob("*.md"), reverse=True)
    if not files:
        return ""
    with open(files[0], "r", encoding="utf-8") as f:
        return f.read()

### 보안 고려사항
- `USER.md`에 민감 정보가 포함될 경우 **마스킹**(예: 정규식으로 이메일/키 제거) 후 LLM에 전달합니다.

## 7. 주제 선정 로직 (Step 3)
### 자동 추출 알고리즘
1. 최신 메모리 파일에서 **키워드 빈도**를 계산 (TF‑IDF 간단 구현)  
2. `SOUL.md`와 `USER.md`에 정의된 **관심도 태그**와 교차 검증  
3. 빈도 상위 3개 중 **가장 최근**에 해당하는 항목을 주제로 선택  

### 가치 판단 기준
- **변경점**: 파일 내용에 새로운 섹션이 추가된 경우 우선  
- **사용자 관심도**: `USER.md`에 명시된 키워드와 일치 여부  

### Fallback 전략
- 주제 후보가 없으면 **작업 스킵**하고 로그에 `No suitable topic found` 기록. 운영자는 다음 주에 자동 재시도합니다.

## 8. 콘텐츠 생성 로직 (Step 5)
### 마크다운 일기 템플릿
```
# {date} 일기
## 오늘의 주제: {topic}
{generated_content}
---
*Generated by OpenClaw AI Agent*
```
### LLM 프롬프트 예시
```
You are an AI writing a concise technical diary entry.
Use the context provided and focus on the selected topic.
Output only markdown without explanations.
```
### 품질 검증 체크리스트
- 문법 오류 없음 (Spellcheck)  
- 사실성 검증: 파일에서 직접 추출한 내용만 사용  
- 길이: 300~500 단어 권장  

## 9. GitHub 커밋·푸시 프로세스
### 흐름
1. `gh repo clone <repo>` 또는 `git pull` 로 최신 레포지토리 확보  
2. 새 파일(`YYYY-MM-DD.md`) 및 `README.md` 업데이트  
3. 커밋 메시지 규칙  

    `docs(diary): {date} 자동 일기 추가`  

4. `git push origin main`  

### PR 자동 생성 옵션
- `gh pr create --title "Automated diary {date}" --body "Generated by OpenClaw"`  
- 필요 시 CI 파이프라인에서 자동 병합을 허용하도록 설정  

### CI/CD 연동 시 고려사항
- 커밋이 푸시될 때 **GitHub Actions**가 실행되어 Lint 검증을 수행하도록 워크플로를 구성 (예: `actions/checkout`, `actions/setup-node` 등).

## 10. dev.to 자동 포스팅
### 초안 생성 API
POST `https://dev.to/api/articles`  
Headers: `api-key: <DEVTO_TOKEN>`  
Body (JSON) 예시  

{
  "article": {
    "title": "자동 일기 {date}",
    "published": false,
    "body_markdown": "{markdown_content}",
    "tags": ["ai","automation"]
  }
}

### 게시 절차
1. 초안 생성 → 응답에 `id`와 `url` 반환  
2. `PUT /api/articles/{id}` 로 `published: true` 설정  

### 검증 단계
- API 응답에 `published_at`이 존재하는지 확인  
- 로그에 최종 URL 저장  

## 11. Telegram 알림 전송
### Bot 생성 및 토큰 관리
- BotFather에서 Bot 생성 → 토큰 발급  
- 토큰은 **Vault** 혹은 환경 변수(`TELEGRAM_TOKEN`)에 저장  

### 알림 메시지 포맷
```
📖 새로운 자동 일기 게시됨
제목: {title}
URL: {url}
요약: {one_line_summary}
```

### 재시도 정책
- 전송 실패 시 3회까지 1분 간격 재시도  
- 최종 실패 시 `openclaw.log`에 `Telegram delivery failed` 기록 및 운영자에게 이메일 알림 (SMTP 설정 필요).

## 12. 인간 감독 및 검토 루프
### 운영자 역할 (Julio)
- Telegram 알림을 수신 → 제목·내용 검토  
- 이상 발견 시 **dev.to 게시물 삭제** (`DELETE /api/articles/{id}`) 및 GitHub 커밋 롤백 (`git revert`)  

### 최소 마찰 검토 프로세스
1. 알림 수신 → 5분 내 검토  
2. 문제 없으면 그대로 유지, 문제 있으면 삭제·수정 후 로그 남김  

## 13. 실패 모드 및 복구 전략
| 실패 유형 | 증상 | 완화·복구 방안 |
|----------|------|----------------|
| 환각된 컨텍스트 | 허위 내용이 로그에 포함 | 실제 메모리 파일 검증, LLM 프롬프트에 “Only use provided files” 명시 |
| 주제 부재 | 내용이 빈약하거나 비어 있음 | 작업 스킵·다음 주로 연기, 로그에 `No topic` 기록 |
| API 오류 (dev.to, GitHub, Telegram) | 전송 실패, 상태 코드 5xx | 재시도 큐(3회), 실패 시 운영자 알림 |
| 톤 드리프트 | 글 스타일이 일관되지 않음 | 주기적(주 1회) 인간 리뷰 후 프롬프트 조정 |
| 스케줄링 오류 | cron 미실행 | 시스템 모니터링(Prometheus)·알림 설정, cron 로그 확인 |

## 14. 보안·인증 고려사항
- **토큰 저장**: HashiCorp Vault 또는 Kubernetes Secret 사용 → 환경 변수 주입  
- **최소 권한 원칙**: GitHub PAT은 `repo`(read/write)만 부여, dev.to 토큰은 `write_article` 권한만 허용  
- **데이터 무결성**: 커밋 전 파일 SHA256 해시 계산 후 로그에 기록  
- **통신 암호화**: 모든 API 호출은 HTTPS 사용, 내부 네트워크에서도 TLS 적용  

## 15. 배포·운영 가이드
### Docker 이미지 빌드
Dockerfile (4‑space 들여쓰기)

FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "agent.py"]

### CI 파이프라인 (GitHub Actions) 예시
name: Deploy OpenClaw
on:
  push:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -t openclaw:latest .
      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push openclaw:latest

### 모니터링 지표
- **작업 성공률** (`openclaw_success_total / openclaw_attempt_total`)  
- **API 평균 응답 시간** (dev.to, GitHub, Telegram)  
- **Telegram 알림 도착률**  

### 롤백 정책
- 새 이미지 배포 후 5분 내 오류 감지 시 `docker rollback` 또는 이전 이미지 태그로 재배포  

## 16. FAQ
**Q1. 주제가 없을 때 어떻게 처리하나요?**  
A) 작업을 스킵하고 `No suitable topic found` 로그를 남깁니다. 다음 주에 자동 재시도합니다.

**Q2. Telegram 알림이 오지 않을 때 확인 사항은?**  
A) Bot 토큰 유효성, `chat_id` 정확성, 네트워크 방화벽 규칙, 그리고 재시도 로그를 확인합니다.

**Q3. dev.to 게시물을 수정할 수 있나요?**  
A) `PUT /api/articles/{id}` 로 `body_markdown`을 업데이트하면 수정이 가능합니다. 단, 이미 공개된 경우 `published_at`은 유지됩니다.

**Q4. 크론 시간대를 변경하려면?**  
A) `cron.yaml`의 `schedule` 문자열을 원하는 **cron 표현식**으로 교체하고 OpenClaw 서비스를 재시작합니다.

## 17. 참고 자료·링크
- **OpenClaw 공식 문서** – <https://openclaw.dev/docs>  
- **dev.to API 레퍼런스** – <https://developers.forem.com/api>  
- **GitHub CLI 사용 가이드** – <https://cli.github.com/manual/>  
- **Telegram Bot API** – <https://core.telegram.org/bots/api>  
- **원본 뉴스 기사** – <https://euno.news/posts/ko/the-agent-that-writes-its-own-diary-automatically-910f8a>  

---  
*이 문서는 euno.news 기사와 OpenClaw 공식 자료를 기반으로 작성되었습니다.*