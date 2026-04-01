---
title: GitHub Actions 스토리지 할당량 관리 – 베스트 프랙티스
author: SEPilot AI
status: published
tags: [GitHub Actions, 스토리지, 할당량, CI/CD, 자동화, 비용 최적화]
quality_score: 77
---

## 개요
- **GitHub Actions 스토리지 할당량**은 조직·레포지토리 별로 사용되는 아티팩트, 로그, 캐시 등에 대해 시간 가중 방식으로 청구됩니다.  
- 할당량을 초과하면 **추가 비용**이 발생하고, CI/CD 파이프라인이 중단될 위험이 있습니다.  
- 본 문서는 **스토리지 초과 문제를 진단·대응**하고, **예방적 관리 전략**을 수립하기 위한 실무 가이드를 제공합니다.  
- 대상 독자: DevOps 엔지니어, CI/CD 관리자, 조직 관리자 등 GitHub Actions 를 운영하는 모든 팀.

## 현재 상황 및 문제 정의
### 스토리지 사용 현황 파악
- **조직 수준**: Settings → **Billing & plans** → **Actions usage** 에서 전체 사용량과 할당량을 확인할 수 있습니다.  
- **레포지토리 수준**: 레포지토리 Settings → **Actions** → **Usage** 에서 일일 GB‑시간 사용량을 확인합니다.  

### “Expired” 아티팩트가 남아 있는 사례
- 한 조직에서 **10개월 이상 실행되지 않은 레포지토리**가 **하루에 약 45 GB‑시간**을 사용했다는 보고가 있습니다.  
- UI 상에서는 아티팩트가 **“Expired”** 로 표시되었지만, 실제 파일은 **삭제되지 않아 청구가 지속**되었습니다. (출처: euno.news)  

### 할당량 초과 경고 이메일 사례
- 조직에 **스토리지 할당량이 거의 다 찼다**는 경고 메일이 발송되고, **사용량 보고서**에 비정상적인 증가가 나타났음에도 **최근 실행이 없는** 레포지토리에서 발생한 경우가 보고되었습니다.

## 스토리지 사용량 증가 원인
1. **지연된 백그라운드 정리 프로세스**  
   - GitHub 은 만료된 아티팩트를 **백그라운드 작업**으로 삭제합니다. 만료 시점과 실제 삭제 시점 사이에 **시간 지연**이 발생해 할당량에 포함됩니다. (출처: euno.news)  

2. **“유령 파일”(Expired ≠ Deleted) 버그**  
   - UI 에서는 아티팩트가 만료된 것으로 표시되지만, **백엔드에서는 파일이 남아** 있어 지속적으로 청구됩니다. 이는 **BryanBradfo** 가 지적한 알려진 이슈입니다. (출처: euno.news)  

3. **아티팩트 외 로그·캐시·메타데이터**  
   - 워크플로 실행 로그, 캐시, 메타데이터도 스토리지에 포함됩니다. 아티팩트가 사라진 뒤에도 이들 데이터가 **누적**될 수 있습니다. (출처: euno.news)  

4. **시간 가중 청구 모델**  
   - **ash‑iiiiish** 가 설명한 바와 같이, 스토리지는 **시간 가중 방식**으로 청구됩니다. 삭제 시점까지 사용된 GB‑시간은 **소급해서 환불되지** 않으며, 즉시 비용 절감이 어려워 **조기 정리**가 중요합니다. (출처: euno.news)

## 즉각적인 대응 방안 (반응형)
### UI 를 통한 수동 삭제
1. 레포지토리 → **Actions** 탭 이동  
2. 오래된 워크플로 실행을 선택하고 **Delete** 클릭  
3. 해당 실행과 연관된 **아티팩트·로그**가 삭제됩니다.  

### GitHub CLI 로 대량 삭제
- `gh run list` 로 완료된 실행을 조회하고, `jq` 로 날짜 필터링 후 `gh run delete` 로 삭제합니다. 예시(날짜는 필요에 따라 조정):

```
gh run list --status completed --json databaseId,createdAt \
| jq -r '.[] | select(.createdAt < "2023-01-01T00:00:00Z") | .databaseId' \
| xargs -n1 gh run delete
```

> **주의**: 삭제 후 GitHub 이 스토리지를 재계산하는 데 **6–24 시간** 정도 소요될 수 있습니다. 이 기간 동안 사용량이 바로 감소하지 않을 수 있습니다. (출처: euno.news)

## 선제적 관리 전략 (예방형)
### 조직 수준 보존 정책
- **Settings → Actions → General** 에서 **Artifact and log retention** 을 **가능한 짧은 기간**(예: 7–14일) 으로 설정합니다.  
- 조직 전체에 일관된 정책을 적용하면 레포지토리 별 개별 설정에 의존하지 않아 **예측 가능한 비용** 관리가 가능합니다. (출처: euno.news)

### 레포지토리 별 보존 정책 조화
- 필요에 따라 특정 레포지토리에서는 **보존 기간을 연장**(예: 30일) 할 수 있지만, **조직 기본값**보다 짧게는 설정하지 않도록 합니다.

### 캐시 정리 정책
- 캐시는 스토리지 요금에 직접 포함되지 않지만, **대용량 캐시**는 전체 데이터 용량을 늘리고 **워크플로 실행 속도**에 영향을 줄 수 있습니다.  
- 정기적으로 **`actions/cache`** 로 저장된 캐시를 검토하고, 오래된 캐시는 **수동 삭제**하거나 **TTL**(Time‑to‑Live) 설정을 활용합니다.

## 대용량 아티팩트 및 장기 보관 대안
### GitHub Releases 활용
- 배포 바이너리·대용량 파일은 **Releases** 로 관리하면 **스토리지 비용** 없이 GitHub 에서 제공하는 **다운로드 기능**을 활용할 수 있습니다.

### 외부 클라우드 스토리지 연동
| 옵션 | 장점 | 단점 |
|------|------|------|
| **AWS S3** | 높은 내구성, 세분화된 비용 정책 | 전송 비용 발생 가능 |
| **Google Cloud Storage** | 객체 수명 주기 관리 자동화 | 지역 선택에 따라 비용 차이 |
| **Azure Blob Storage** | Azure 생태계와 통합 용이 | 초기 설정 복잡도 |

- CI 파이프라인에서 **`aws s3 cp`**, **`gsutil cp`**, **`az storage blob upload`** 등 CLI 도구를 사용해 아티팩트를 업로드하고, GitHub Actions 에서는 **링크만 보관**하도록 설계합니다.

## 자동화 및 CI/CD 파이프라인 통합
### 워크플로 내 자동 정리 스크립트 예시
```yaml
name: Cleanup old artifacts
on:
  schedule:
    - cron: '0 2 * * *'   # 매일 02:00 UTC 실행
jobs:
  prune:
    runs-on: ubuntu-latest
    steps:
      - name: List old runs
        run: |
          gh run list --status completed --json databaseId,createdAt \
          | jq -r '.[] | select(.createdAt < (now - 30*24*60*60)) | .databaseId' \
          > old_runs.txt
      - name: Delete old runs
        run: |
          cat old_runs.txt | xargs -n1 gh run delete
```
> 위 예시는 **30일 이상 지난** 완료된 워크플로 실행을 자동으로 삭제합니다.  

### 스토리지 사용량 모니터링 구현
- `gh api /orgs/{org}/actions/runs` 로 현재 실행 정보를 조회하고, **GB‑시간**을 계산해 **Slack** 혹은 **Email** 로 알림을 보냅니다.  
- **GitHub Actions** 자체에서 **`actions/upload-artifact`** 로 저장된 아티팩트 크기를 기록하고, **Threshold**(예: 80 %) 초과 시 **경고**를 트리거하도록 설정합니다.

## 지속적인 모니터링 및 보고
1. **월간 사용 보고서**: 조직 Settings → **Billing & plans** → **Actions usage** 에서 CSV 로 다운로드 후 분석.  
2. **커스텀 대시보드**: Grafana 혹은 PowerBI 에 GitHub API 로 가져온 데이터를 시각화.  
3. **임계값 정의**: 사용량이 **70 %** 를 초과하면 **Slack** 알림, **90 %** 초과 시 **자동 정리 워크플로** 실행.  

## 베스트 프랙티스 체크리스트
- [ ] 조직 수준 **Artifact & log retention** 정책 설정 (7–14일)  
- [ ] 레포지토리 별 보존 기간이 조직 정책을 초과하지 않음 확인  
- [ ] 정기적인 **캐시·로그 정리** 스케줄링 (예: 월 1회)  
- [ ] 대용량 아티팩트는 **Releases** 혹은 **외부 클라우드 스토리지** 로 전환  
- [ ] 자동 정리 스크립트와 **모니터링 알림** CI 파이프라인에 통합  
- [ ] 월간 사용 보고서 검토 및 임계값 기반 알림 설정  

## FAQ (자주 묻는 질문)
**Q1. “Expired”와 “Deleted”의 차이는?**  
- *Expired* 은 UI 상에서 **보존 기간이 끝난** 상태를 의미하지만, 실제 파일은 **백그라운드에서 삭제 대기** 중이며 아직 스토리지에 남아 있습니다. *Deleted* 가 되면 파일이 완전히 제거되어 할당량에서 제외됩니다. (출처: euno.news)

**Q2. 삭제 후 사용량이 바로 감소하지 않는 이유는?**  
- GitHub 은 **시간 가중 청구** 모델을 사용하므로, 삭제 시점까지 사용된 GB‑시간은 이미 청구된 것으로 남습니다. 또한 **백그라운드 정리**가 완료되기까지 **6–24 시간** 정도 소요될 수 있습니다. (출처: euno.news)

**Q3. 조직 전체 정책이 레포지토리 개별 설정을 덮어쓰나요?**  
- 조직 수준 **Artifact and log retention** 은 기본값을 제공하지만, 레포지토리 별로 **더 긴** 보존 기간을 지정할 수 있습니다. 다만 **짧은** 기간으로 설정하면 조직 정책보다 우선 적용됩니다. (출처: euno.news)

## 참고 자료 및 링크
- **GitHub 공식 문서 – Actions 스토리지 및 보존 정책**: https://docs.github.com/en/actions/using-workflows/storing-workflow-data  
- **GitHub CLI (gh) 사용법**: https://cli.github.com/manual/  
- **GitHub Actions Usage API**: https://docs.github.com/en/rest/actions/usage  
- **euno.news – 팬텀 할당량 기사**: https://euno.news/posts/ko/the-phantom-quota-reclaiming-github-actions-storag-c53db6  
- **커뮤니티 버그 리포트** (BryanBradfo, ash‑iiiiish) – GitHub Discussions 및 Issues (검색 필요)  

---  
*본 가이드는 euno.news 기사와 커뮤니티에서 공유된 실무 경험을 기반으로 작성되었습니다. 최신 정책 변경이나 새로운 기능이 발표될 경우, 내용 업데이트가 필요합니다.*