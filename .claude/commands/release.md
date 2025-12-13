# 릴리스 생성

직전 태그 이후의 변경 사항을 분석하여 자동으로 버전을 판단하고 릴리스를 생성합니다.

## 작업 순서

### 1. 현재 상태 확인
```bash
# 최신 태그 확인
git fetch --tags
git describe --tags --abbrev=0

# 현재 package.json 버전 확인
cat package.json | grep '"version"'

# 직전 태그 이후 커밋 히스토리 확인
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

### 2. 변경 사항 분석 및 버전 결정

커밋 메시지 prefix를 분석하여 SemVer 버전을 결정:

- **MAJOR (x.0.0)**: `BREAKING CHANGE`, `!:` 포함 시
- **MINOR (0.x.0)**: `feat:` 커밋이 있는 경우
- **PATCH (0.0.x)**: `fix:`, `style:`, `refactor:`, `perf:`, `docs:`, `chore:` 등

### 3. 릴리스 노트 작성

변경 사항을 카테고리별로 정리:
- ✨ 새로운 기능 (feat)
- 🐛 버그 수정 (fix)
- 💄 스타일 변경 (style)
- ♻️ 리팩토링 (refactor)
- ⚡ 성능 개선 (perf)
- 📝 문서 (docs)
- 🔧 기타 (chore, build, ci)

### 4. 릴리스 절차

1. **lint 검사 실행**
```bash
bun run lint
```

2. **package.json 버전 업데이트**
```bash
# 새 버전으로 package.json 수정
```

3. **변경사항 커밋**
```bash
git add package.json
git commit -m "chore: bump version to vX.Y.Z"
```

4. **태그 생성 (릴리스 노트 포함)**
```bash
git tag -a vX.Y.Z -m "릴리스 노트 내용"
```

5. **원격 저장소에 푸시**
```bash
git push origin main
git push origin vX.Y.Z
```

6. **GitHub Release 생성 (선택)**
```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "릴리스 노트 내용"
```

## 주의사항
- 릴리스 전 반드시 lint 검사를 통과해야 함
- 버전 태그는 반드시 `v` prefix 사용 (예: v1.0.0)
- 릴리스 노트는 한국어로 작성
- Breaking change가 있는 경우 사용자에게 확인 요청

## 릴리스 노트 템플릿

```markdown
# vX.Y.Z (YYYY-MM-DD)

## ✨ 새로운 기능
- 기능 설명 (#PR번호)

## 🐛 버그 수정
- 수정 내용 (#PR번호)

## 💄 스타일 변경
- 변경 내용

## ♻️ 리팩토링
- 리팩토링 내용

## 📝 전체 변경 목록
- 커밋 해시: 커밋 메시지
```
