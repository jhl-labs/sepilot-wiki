/**
 * 스케줄 작업 레지스트리
 */
export { BaseJob } from './base-job';
export { CollectStatusJob } from './collect-status';
export { SyncIssuesJob } from './sync-issues';
export { ValidateLinksJob } from './validate-links';
export { MaintainTreeJob } from './maintain-tree';
export { CheckFreshnessJob } from './check-freshness';
export { GenerateStatusReportJob } from './generate-status-report';
export { ScoreQualityJob } from './score-quality';
export { UpdateCrossReferencesJob } from './update-cross-references';
export { NormalizeTagsJob } from './normalize-tags';
export { AnalyzeCoverageJob } from './analyze-coverage';
export { GenerateSummariesJob } from './generate-summaries';
export { DetectDocUpdatesJob } from './detect-doc-updates';

import { BaseJob } from './base-job';
import { CollectStatusJob } from './collect-status';
import { SyncIssuesJob } from './sync-issues';
import { ValidateLinksJob } from './validate-links';
import { MaintainTreeJob } from './maintain-tree';
import { CheckFreshnessJob } from './check-freshness';
import { GenerateStatusReportJob } from './generate-status-report';
import { ScoreQualityJob } from './score-quality';
import { UpdateCrossReferencesJob } from './update-cross-references';
import { NormalizeTagsJob } from './normalize-tags';
import { AnalyzeCoverageJob } from './analyze-coverage';
import { GenerateSummariesJob } from './generate-summaries';
import { DetectDocUpdatesJob } from './detect-doc-updates';

/**
 * 모든 등록 가능한 작업 목록
 */
export function getAllJobs(): BaseJob[] {
  return [
    new CollectStatusJob(),
    new SyncIssuesJob(),
    new ValidateLinksJob(),
    new MaintainTreeJob(),
    new CheckFreshnessJob(),
    new GenerateStatusReportJob(),
    new ScoreQualityJob(),
    new UpdateCrossReferencesJob(),
    new NormalizeTagsJob(),
    new AnalyzeCoverageJob(),
    new GenerateSummariesJob(),
    new DetectDocUpdatesJob(),
  ];
}
