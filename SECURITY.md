# 보안 정책

## 지원되는 버전

| 버전 | 지원 여부 |
| --- | --- |
| 0.1.x | :white_check_mark: |

## 취약점 보고

보안 취약점을 발견하셨다면, 공개 Issue 대신 비공개로 보고해주세요.

### 보고 방법

1. **GitHub Security Advisory** 사용 (권장)
   - [Security Advisory 생성](https://github.com/jhl-labs/sepilot-wiki/security/advisories/new)

2. **이메일로 보고**
   - 저장소 관리자에게 직접 연락

### 보고 내용

- 취약점 설명
- 재현 단계
- 영향 범위
- 가능한 해결 방법 (선택)

### 응답 시간

- 초기 응답: 48시간 이내
- 상태 업데이트: 주 1회
- 수정 완료: 심각도에 따라 다름

## 보안 모범 사례

이 프로젝트에서 준수하는 보안 사항:

1. **의존성 관리**
   - Dependabot으로 자동 업데이트
   - 정기적인 보안 감사

2. **코드 검토**
   - 모든 PR은 리뷰 필수
   - 민감 정보 커밋 방지

3. **환경 변수**
   - 시크릿은 GitHub Secrets 사용
   - `.env` 파일 `.gitignore` 포함

감사합니다.
