#!/usr/bin/env node

/**
 * Issue가 닫히면 문서를 draft에서 published 상태로 전환하는 스크립트
 * GitHub Issue가 닫히면 issue-handler.yml에서 호출됨
 *
 * Issue의 전체 컨텍스트를 수집하여 관련 문서를 정확히 찾음
 *
 * 환경 변수:
 * - GITHUB_REPOSITORY: owner/repo 형식
 * - GITHUB_TOKEN: GitHub API 토큰
 *
 * 사용법:
 * node scripts/publish-document.js --issue-number 123 --issue-title "문서 제목"
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import {
  collectIssueContext,
  getGitHubInfoFromEnv,
} from './lib/issue-context.js';
import {
  parseArgs,
  findDocument,
  updateFrontmatterStatus,
  setGitHubOutput,
} from './lib/utils.js';
import { addAIHistoryEntry } from './lib/ai-history.js';

// 출력 경로
const WIKI_DIR = join(process.cwd(), 'wiki');

// 문서 발행
async function publishDocument(context) {
  console.log('📤 문서 발행 시작...');
  console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);

  // 문서 찾기
  const doc = await findDocument(context, WIKI_DIR);

  if (!doc.found) {
    console.log('⚠️ 해당 Issue에 연결된 문서를 찾을 수 없습니다.');
    console.log(`   경로: ${doc.filepath}`);
    return { hasChanges: false, reason: 'document_not_found' };
  }

  console.log(`   문서 발견: ${doc.filename}`);

  // status를 published로 변경
  const newContent = updateFrontmatterStatus(doc.content, 'published');

  // 변경 사항이 있는지 확인
  if (newContent === doc.content) {
    console.log('ℹ️ 이미 published 상태이거나 변경 사항이 없습니다.');
    return { hasChanges: false, reason: 'already_published' };
  }

  // 파일 저장
  await writeFile(doc.filepath, newContent);

  console.log('✅ 문서 발행 완료 (status: published)');
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
    console.error('사용법: node scripts/publish-document.js --issue-number 123 --issue-title "제목"');
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

    const result = await publishDocument(context);

    // AI History 기록 (변경이 있을 때만)
    if (result.hasChanges) {
      const slug = result.filename ? result.filename.replace('.md', '') : '';
      await addAIHistoryEntry({
        actionType: 'publish',
        issueNumber,
        issueTitle,
        documentSlug: slug,
        documentTitle: issueTitle,
        summary: `문서 발행: draft → published 상태 전환`,
        trigger: 'issue_close',
      });
    }

    console.log('\n📄 처리 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    await setGitHubOutput({ has_changes: result.hasChanges });
  } catch (error) {
    console.error('❌ 문서 발행 실패:', error.message);
    process.exit(1);
  }
}

main();
