# 기여 가이드

SEPilot Wiki에 기여해주셔서 감사합니다!

## 시작하기

### 개발 환경 설정

1. 저장소 포크 및 클론

```bash
git clone https://github.com/YOUR_USERNAME/sepilot-wiki.git
cd sepilot-wiki
```

2. 의존성 설치

```bash
bun install
# 또는
npm install
```

3. 개발 서버 실행

```bash
bun dev
# 또는
npm run dev
```

### 사용 가능한 스크립트

```bash
# 개발 서버
bun dev

# 빌드
bun run build

# 테스트
bun test
bun test:watch     # 감시 모드
bun test:coverage  # 커버리지 포함

# 린트
bun lint
bun lint:fix

# 타입 체크
bun typecheck
```

## 기여 방법

### 1. Issue 확인

- 작업 전에 관련 Issue가 있는지 확인하세요
- 없다면 새 Issue를 생성하여 논의하세요

### 2. 브랜치 생성

```bash
git checkout -b feature/기능-이름
# 또는
git checkout -b fix/버그-이름
```

### 3. 코드 작성

- TypeScript strict 모드를 사용합니다
- ESLint와 Prettier 규칙을 따라주세요
- 테스트를 작성해주세요

### 4. 커밋

커밋 메시지 규칙:

```
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅 (기능 변경 없음)
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 변경
```

### 5. Pull Request

- 변경 사항을 명확히 설명해주세요
- 관련 Issue를 링크해주세요
- 체크리스트를 확인해주세요

## 코드 스타일

### TypeScript

- 함수형 컴포넌트 사용
- Props에 interface 정의
- `any` 타입 사용 지양

### React

- React hooks 규칙 준수
- 컴포넌트는 `PascalCase`
- 훅은 `use` 접두사

### 파일 구조

```
src/
├── components/     # React 컴포넌트
│   ├── layout/     # 레이아웃 컴포넌트
│   ├── ui/         # UI 컴포넌트
│   └── wiki/       # Wiki 관련 컴포넌트
├── pages/          # 페이지 컴포넌트
├── hooks/          # 커스텀 훅
├── services/       # API 서비스
├── utils/          # 유틸리티 함수
├── context/        # React Context
├── types/          # TypeScript 타입
└── test/           # 테스트 설정
```

## 테스트

- 유틸리티 함수는 반드시 테스트 작성
- 컴포넌트는 주요 동작에 대해 테스트
- 커버리지 목표: 80% 이상

```bash
# 테스트 실행
bun test

# 커버리지 확인
bun test:coverage
```

## 문서

- 공개 API는 JSDoc 주석 추가
- 복잡한 로직은 인라인 주석
- 한국어 주석 권장

## 질문이 있으신가요?

- [GitHub Discussions](https://github.com/jhl-labs/sepilot-wiki/discussions)를 이용해주세요
- Issue를 생성해주세요

감사합니다!
