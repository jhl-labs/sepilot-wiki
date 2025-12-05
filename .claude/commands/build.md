# 프로젝트 빌드

프로젝트를 빌드하고 검증합니다.

## 작업 내용
1. 의존성 설치 확인
2. TypeScript 컴파일 검사
3. ESLint 검사
4. 프로덕션 빌드 실행
5. 빌드 결과 보고

## 명령어 실행 순서
```bash
bun install
bun run lint
bun run build
```

## 빌드 실패 시
- 오류 메시지 분석
- 수정 방안 제시
- 자동 수정 가능한 경우 수정 진행
