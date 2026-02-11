#!/usr/bin/env node

/**
 * Issue가 다시 열리면 문서를 published에서 draft 상태로 전환하는 스크립트
 * GitHub Issue가 reopened되면 issue-handler.yml에서 호출됨
 *
 * Issue의 전체 컨텍스트를 수집하여 관련 문서를 정확히 찾음
 *
 * 환경 변수:
 * - GITHUB_REPOSITORY: owner/repo 형식
 * - GITHUB_TOKEN: GitHub API 토큰
 *
 * 사용법:
 * node scripts/unpublish-document.js --issue-number 123 --issue-title "문서 제목"
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import {
  collectIssueContext,
  getGitHubInfoFromEnv,
} from '../lib/issue-context.js';
import {
  parseArgs,
  findDocument,
  updateFrontmatterStatus,
  setGitHubOutput,
} from '../lib/utils.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { setIssueState, removeLabel, addLabels } from '../lib/issues-store.js';

// 출력 경로
const WIKI_DIR = join(process.cwd(), 'wiki');

// 문서 발행 취소 (draft로 전환)
async function unpublishDocument(context) {
  console.log('📥 문서 발행 취소 시작...');
  console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);

  // 문서 찾기
  const doc = await findDocument(context, WIKI_DIR);

  if (!doc.found) {
    console.log('⚠️ 해당 Issue에 연결된 문서를 찾을 수 없습니다.');
    console.log(`   경로: ${doc.filepath}`);
    return { hasChanges: false, reason: 'document_not_found' };
  }

  console.log(`   문서 발견: ${doc.filename}`);

  // status를 draft로 변경
  const newContent = updateFrontmatterStatus(doc.content, 'draft');

  // 변경 사항이 있는지 확인
  if (newContent === doc.content) {
    console.log('ℹ️ 이미 draft 상태이거나 변경 사항이 없습니다.');
    return { hasChanges: false, reason: 'already_draft' };
  }

  // 파일 저장
  await writeFile(doc.filepath, newContent);

  console.log('✅ 문서 발행 취소 완료 (status: draft)');
  console.log(`   파일: ${doc.filepath}`);

  return {
    hasChanges: true,
    filepath: doc.filepath,
    filename: doc.filename,
  };
}

// 메인 함수
async function main() {
  const args = parseArgs();

  // 필수 인자 확인
  if (!args['issue-number']) {
    console.error('❌ 오류: --issue-number 인자가 필요합니다.');
    console.error('사용법: node scripts/unpublish-document.js --issue-number 123 --issue-title "제목"');
    process.exit(1);
  }

  const issueNumber = parseInt(args['issue-number'], 10);
  const issueTitle = args['issue-title'] || '';

  // GitHub 정보 가져오기
  const githubInfo = getGitHubInfoFromEnv();

  try {
    // Issue 전체 컨텍스트 수집
    const context = await collectIssueContext({
      owner: githubInfo.owner,
      repo: githubInfo.repo,
      issueNumber,
      issueTitle,
      token: githubInfo.token,
    });

    // wiki-maintenance 이슈는 발행 취소 처리 건너뛰기
    if (context.labels?.includes('wiki-maintenance')) {
      console.log('⏭️ wiki-maintenance 이슈는 문서 발행 취소를 건너뜁니다.');
      return;
    }

    const result = await unpublishDocument(context);

    // AI History 기록 (변경이 있을 때만)
    if (result.hasChanges) {
      const slug = result.filename ? result.filename.replace('.md', '') : '';
      await addAIHistoryEntry({
        actionType: 'recover',
        issueNumber,
        issueTitle,
        documentSlug: slug,
        documentTitle: issueTitle,
        summary: `문서 발행 취소: published → draft 상태 전환 (Issue reopen)`,
        trigger: 'issue_reopen',
      });
    }

    // Issue 상태 업데이트 (JSON 파일)
    await setIssueState(issueNumber, 'open');
    await removeLabel(issueNumber, 'published');
    await addLabels(issueNumber, ['draft']);

    console.log('\n📄 처리 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    await setGitHubOutput({ has_changes: result.hasChanges });
  } catch (error) {
    console.error('❌ 문서 발행 취소 실패:', error.message);
    process.exit(1);
  }
}

main();
