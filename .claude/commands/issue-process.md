# GitHub Issue 처리

GitHub Issue를 분석하고 적절한 작업을 수행합니다.

## 작업 내용
1. Issue 내용 분석
2. 라벨 확인 (request, invalid 등)
3. 라벨에 따른 작업 수행:
   - `request`: 새 Wiki 문서 생성
   - `invalid`: 문서에 경고 표시 추가
4. Issue 댓글로 처리 결과 보고

## 입력
$ARGUMENTS - Issue 번호 또는 URL

## 라벨별 처리
- **request**: AI가 문서 초안 작성
- **invalid**: "잘못됨, 수정 필요" 경고 추가
- **close**: "(초안)" 표기 제거
