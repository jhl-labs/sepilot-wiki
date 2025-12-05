---
title: FAQ
tags: [FAQ, 도움말, 문제해결]
---

# 자주 묻는 질문

## 일반

### Q: SEPilot Wiki는 무엇인가요?

A: GitHub 저장소 기반의 AI 자동화 위키 시스템입니다. Astro 같은 정적 사이트 생성기처럼 설정 파일을 통해 커스터마이징이 가능하며, GitHub Issue와 LLM을 연동하여 문서를 자동 생성합니다.

### Q: 무료로 사용할 수 있나요?

A: 네, SEPilot Wiki 자체는 오픈소스이며 무료입니다. 다만 LLM API 사용 시 해당 제공자의 요금이 발생할 수 있습니다.

## 설치 및 배포

### Q: 어떤 런타임이 필요한가요?

A: Bun 또는 Node.js 20+를 지원합니다. Bun 사용을 권장합니다.

### Q: 로컬에서 개발할 수 있나요?

A: 네, `bun dev` 또는 `npm run dev`로 로컬 개발 서버를 실행할 수 있습니다.

### Q: GitHub Pages 외에 다른 호스팅 서비스도 지원하나요?

A: 네, Vite 기반이므로 Vercel, Netlify, Cloudflare Pages 등 모든 정적 호스팅 서비스에서 사용 가능합니다.

## 테마 및 커스터마이징

### Q: 다크 모드를 지원하나요?

A: 네, 라이트/다크/시스템 테마를 지원합니다. `theme.config.ts`에서 각 테마의 색상을 설정할 수 있습니다.

### Q: 로고를 이미지로 변경하려면 어떻게 하나요?

A: `site.config.ts`에서 다음과 같이 설정합니다:

```typescript
logo: {
  type: 'image',
  value: '/logo.png',  // public 폴더 기준
  alt: 'My Logo',
}
```

### Q: 폰트를 변경하려면 어떻게 하나요?

A: `theme.config.ts`의 `fonts` 설정에서 변경합니다. Google Fonts를 사용하려면 `index.html`에 폰트 링크를 추가해야 합니다.

## LLM 및 AI 기능

### Q: OpenAI 외에 다른 LLM을 사용할 수 있나요?

A: 네, OpenAI 호환 API를 제공하는 모든 서비스를 사용할 수 있습니다 (Azure OpenAI, Ollama, LM Studio 등).

### Q: AI가 생성한 문서를 수정할 수 있나요?

A: 네, 세 가지 방법이 있습니다:
1. `/wiki` 폴더에서 마크다운 파일 직접 수정
2. Issue 댓글로 피드백 작성 (AI가 자동 반영)
3. PR로 변경 제안

### Q: AI 문서 생성이 실패하면 어떻게 하나요?

A: GitHub Actions 로그에서 오류를 확인하세요. 주로 API 키 설정 오류이거나 LLM 서비스 장애일 수 있습니다.

## 문서 관리

### Q: 문서를 직접 수정할 수 있나요?

A: 네, `/wiki` 폴더의 마크다운 파일을 직접 수정하거나 PR을 통해 변경할 수 있습니다.

### Q: 문서에 이미지를 추가하려면 어떻게 하나요?

A: `/public` 폴더에 이미지를 추가한 후 마크다운에서 참조합니다:

```markdown
![이미지 설명](/images/example.png)
```

### Q: 검색이 잘 안 되는 것 같아요

A: 검색 인덱스는 빌드 시점에 생성됩니다. 새 문서 추가 후 재배포가 필요합니다.

## 문제 해결

### Q: 빌드가 실패해요

A: 다음을 확인하세요:
1. `bun install` 또는 `npm install` 실행 여부
2. 설정 파일의 TypeScript 문법 오류
3. Node.js/Bun 버전 호환성

### Q: GitHub Pages에 배포가 안 돼요

A: Repository Settings > Pages에서 Source가 "GitHub Actions"로 설정되어 있는지 확인하세요.

### Q: LLM 응답이 너무 느려요

A: LLM 모델을 더 빠른 것으로 변경하거나 (예: gpt-4 대신 gpt-3.5-turbo), 로컬 LLM 사용을 고려해보세요.
