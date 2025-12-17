/**
 * 스케줄 작업 레지스트리
 */
export { BaseJob } from './base-job';
export { CollectStatusJob } from './collect-status';
export { SyncIssuesJob } from './sync-issues';
export { ValidateLinksJob } from './validate-links';
export { MaintainTreeJob } from './maintain-tree';

import { BaseJob } from './base-job';
import { CollectStatusJob } from './collect-status';
import { SyncIssuesJob } from './sync-issues';
import { ValidateLinksJob } from './validate-links';
import { MaintainTreeJob } from './maintain-tree';

/**
 * 모든 등록 가능한 작업 목록
 */
export function getAllJobs(): BaseJob[] {
  return [
    new CollectStatusJob(),
    new SyncIssuesJob(),
    new ValidateLinksJob(),
    new MaintainTreeJob(),
  ];
}
