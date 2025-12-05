#!/usr/bin/env node

/**
 * Maintainer 피드백을 AI로 처리하여 문서를 수정하는 스크립트
 * GitHub Issue에 maintainer가 댓글을 달면 issue-handler.yml에서 호출됨
 *
 * Issue의 전체 컨텍스트(body + 모든 comments)를 수집하여 LLM이 문맥을 이해하고
 * 적절한 문서를 찾아 수정함
 *
 * 환경 변수:
 * - OPENAI_BASE_URL: OpenAI API 호환 엔드포인트
 * - OPENAI_API_KEY: API 키 (또는 OPENAI_TOKEN)
 * - OPENAI_MODEL: 사용할 모델
 * - GITHUB_REPOSITORY: owner/repo 형식
 * - GITHUB_TOKEN: GitHub API 토큰
 *
 * 사용법:
 * node scripts/process-feedback.js --issue-number 123 --issue-title "문서 제목" --comment-body "수정 요청 내용"
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  collectIssueContext,
  getGitHubInfoFromEnv,
} from './lib/issue-context.js';
import {
  parseArgs,
  findDocument,
  callOpenAI,
  getExistingDocuments,
  setGitHubOutput,
  updateFrontmatterStatus,
} from './lib/utils.js';
import { addAIHistoryEntry } from './lib/ai-history.js';
import { updateIssue } from './lib/issues-store.js';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';

// 출력 경로
const WIKI_DIR = join(process.cwd(), 'wiki');

/**
 * 모든 wiki 문서를 재귀적으로 스캔
 */
async function getAllDocuments(dir = WIKI_DIR, prefix = '') {
  const docs = [];
  if (!existsSync(dir)) return docs;

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      docs.push(...(await getAllDocuments(fullPath, relativePath)));
    } else if (entry.name.endsWith('.md')) {
      const content = await readFile(fullPath, 'utf-8');
      const statusMatch = content.match(/status:\s*(\w+)/);
      const titleMatch = content.match(/title:\s*["']?(.+?)["']?\s*$/m);
      docs.push({
        path: relativePath,
        fullPath,
        filename: entry.name,
        status: statusMatch ? statusMatch[1] : 'unknown',
        title: titleMatch ? titleMatch[1] : entry.name.replace('.md', ''),
        content,
      });
    }
  }
  return docs;
}

// 피드백 처리
async function processFeedback(context, currentCommentBody) {
  console.log('🤖 피드백 처리 시작...');
  console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);
  console.log(`   현재 피드백: ${currentCommentBody.slice(0, 100)}...`);

  // 문서 찾기
  const doc = await findDocument(context, WIKI_DIR);
  const allDocs = await getAllDocuments();
  const existingDocs = await getExistingDocuments(WIKI_DIR, { includePreview: true });

  // 문서 상태별 분류
  const draftDocs = allDocs.filter((d) => d.status === 'draft');
  const publishedDocs = allDocs.filter((d) => d.status === 'published');

  // Wiki Maintainer Issue 여부 확인
  const isWikiMaintainerIssue = context.issueTitle.includes('[Wiki Maintainer]');

  // 시스템 프롬프트
  const systemPrompt = `당신은 SEPilot Wiki의 기술 문서 편집 AI입니다.
Maintainer의 피드백에 따라 문서를 수정, 생성, 발행, 또는 삭제합니다.

## 핵심 원칙 (반드시 준수)
- Issue의 전체 컨텍스트를 이해하고 적절한 작업을 수행하세요.
- 피드백 내용을 정확히 반영하세요.
- "진행해", "해줘", "실행", "OK", "네", "승인" 등의 긍정적 응답은 Issue에서 제안된 작업을 실행하라는 의미입니다.
- 확실하게 알고 있는 사실만 작성하세요.

## 현재 상황 분석
- Issue 유형: ${isWikiMaintainerIssue ? 'Wiki Maintainer 자동 생성 Issue' : '일반 문서 요청'}
- 문서 발견 여부: ${doc.found ? '예' : '아니오'}
${doc.found ? `- 문서 경로: ${doc.filepath}\n- 문서 상태: ${doc.content.match(/status:\s*(\w+)/)?.[1] || 'unknown'}` : ''}

## 현재 Wiki 상태
- 총 문서 수: ${allDocs.length}개
- Draft 문서 (${draftDocs.length}개): ${draftDocs.map((d) => d.path).join(', ') || '없음'}
- Published 문서 (${publishedDocs.length}개): ${publishedDocs.map((d) => d.path).join(', ') || '없음'}

## 작업 유형 결정
피드백 내용을 분석하여 다음 중 하나 또는 여러 개를 수행하세요:
1. **publish**: draft 문서를 published 상태로 변경 (status 필드만 변경)
2. **unpublish**: published 문서를 draft 상태로 변경
3. **modify**: 기존 문서의 내용 변경
4. **create**: 새 문서 생성
5. **delete**: 문서 삭제 (status를 deleted로 변경)

## 응답 형식
반드시 다음 JSON 형식으로 응답하세요. 여러 문서를 처리할 경우 actions 배열에 여러 항목을 포함하세요:
\`\`\`json
{
  "actions": [
    {
      "action": "publish" | "unpublish" | "modify" | "create" | "delete",
      "targetPath": "wiki/경로/파일명.md",
      "content": "수정된 전체 마크다운 내용 (publish/unpublish/delete 시 null)",
      "reason": "이 작업을 수행하는 이유"
    }
  ],
  "summary": "전체 작업 요약"
}
\`\`\`

## 기존 문서 목록
${existingDocs.map((d) => `- ${d.title} (${d.filename})`).join('\n')}`;

  // 사용자 프롬프트 - 전체 Issue 컨텍스트 포함
  const userPrompt = `다음 Issue의 컨텍스트를 이해하고 현재 피드백을 처리해주세요:

${context.timeline}

## 현재 처리할 피드백
${currentCommentBody}

${doc.found ? `## 현재 문서 내용\n\`\`\`markdown\n${doc.content}\n\`\`\`` : '## 문서가 존재하지 않습니다\n이전 컨텍스트를 참조하여 문서를 복구하거나 새로 생성해주세요.'}

피드백에 따라 적절한 작업을 수행하고 JSON 형식으로 응답해주세요.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // AI 호출
  const response = await callOpenAI(messages, {
    temperature: 0.1,
    maxTokens: 8000,
  });

  // JSON 파싱
  let result;
  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
    result = JSON.parse(jsonStr);
  } catch (e) {
    // JSON 파싱 실패 시 안전하게 처리 - 자동 수정하지 않음
    console.error('❌ JSON 파싱 실패:', e.message);
    console.error('   AI 응답을 파싱할 수 없습니다. 수동 처리가 필요합니다.');
    console.log('   AI 응답 (처음 500자):', response.slice(0, 500));
    return { hasChanges: false, reason: 'json_parse_failed', rawResponse: response.slice(0, 1000) };
  }

  // 이전 형식 호환성 처리 (단일 action → actions 배열)
  if (result.action && !result.actions) {
    result.actions = [
      {
        action: result.action,
        targetPath: result.targetPath,
        content: result.content,
        reason: result.summary || result.reason,
      },
    ];
  }

  // actions가 없거나 빈 배열이면 종료
  if (!result.actions || result.actions.length === 0) {
    console.log('ℹ️ 수행할 작업이 없습니다.');
    return { hasChanges: false, reason: 'no_action_needed' };
  }

  // 각 액션 수행
  const processedActions = [];
  for (const actionItem of result.actions) {
    const { action, targetPath, content, reason } = actionItem;
    const fullPath = targetPath
      ? targetPath.startsWith('/')
        ? targetPath
        : join(process.cwd(), targetPath)
      : doc.filepath;

    console.log(`\n🔧 작업: ${action} - ${targetPath || doc.filepath}`);
    console.log(`   이유: ${reason}`);

    try {
      if (action === 'publish' || action === 'unpublish') {
        // status 변경만 수행
        const targetDoc = allDocs.find((d) => `wiki/${d.path}` === targetPath || d.fullPath === fullPath);
        if (targetDoc) {
          const newStatus = action === 'publish' ? 'published' : 'draft';
          const newContent = updateFrontmatterStatus(targetDoc.content, newStatus);
          await writeFile(targetDoc.fullPath, newContent);
          console.log(`   ✅ ${action === 'publish' ? '발행' : '발행 취소'} 완료: ${targetDoc.path}`);
          processedActions.push({ action, path: targetDoc.path, success: true });
        } else {
          console.log(`   ⚠️ 문서를 찾을 수 없음: ${targetPath}`);
          processedActions.push({ action, path: targetPath, success: false, error: 'not_found' });
        }
      } else if (action === 'delete') {
        // status를 deleted로 변경
        const targetDoc = allDocs.find((d) => `wiki/${d.path}` === targetPath || d.fullPath === fullPath);
        if (targetDoc) {
          const newContent = updateFrontmatterStatus(targetDoc.content, 'deleted');
          await writeFile(targetDoc.fullPath, newContent);
          console.log(`   ✅ 삭제 완료: ${targetDoc.path}`);
          processedActions.push({ action, path: targetDoc.path, success: true });
        }
      } else if (action === 'create' || action === 'modify') {
        if (!content) {
          console.log(`   ⚠️ 내용이 없어서 건너뜀`);
          processedActions.push({ action, path: targetPath, success: false, error: 'no_content' });
          continue;
        }

        // 안전장치 1: frontmatter 필수 확인
        if (!content.trim().startsWith('---')) {
          console.log(`   ⚠️ frontmatter가 없는 content는 저장하지 않습니다.`);
          console.log(`   content 시작: ${content.slice(0, 100)}...`);
          processedActions.push({ action, path: targetPath, success: false, error: 'missing_frontmatter' });
          continue;
        }

        // 안전장치 2: modify 시 기존 문서와 비교
        if (action === 'modify') {
          const targetDoc = allDocs.find((d) => `wiki/${d.path}` === targetPath || d.fullPath === fullPath);
          if (targetDoc) {
            const oldLength = targetDoc.content.length;
            const newLength = content.length;
            // 새 내용이 기존의 30% 미만이면 거부 (내용 손실 방지)
            if (newLength < oldLength * 0.3) {
              console.log(`   ⚠️ 내용이 너무 짧습니다. 기존: ${oldLength}자, 새: ${newLength}자 (${Math.round(newLength/oldLength*100)}%)`);
              console.log(`   ⚠️ 내용 손실 방지를 위해 수정을 건너뜁니다.`);
              processedActions.push({ action, path: targetPath, success: false, error: 'content_too_short' });
              continue;
            }
          }
        }

        // 안전장치 3: JSON 형태의 content는 거부
        const trimmedContent = content.trim();
        if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
          console.log(`   ⚠️ JSON 형태의 content는 저장하지 않습니다.`);
          processedActions.push({ action, path: targetPath, success: false, error: 'json_content_rejected' });
          continue;
        }

        // 디렉토리 생성
        const { dirname } = await import('path');
        await mkdir(dirname(fullPath), { recursive: true });
        // 파일 저장
        await writeFile(fullPath, content);
        console.log(`   ✅ ${action === 'create' ? '생성' : '수정'} 완료`);
        processedActions.push({ action, path: targetPath, success: true });
      }
    } catch (err) {
      console.error(`   ❌ 오류: ${err.message}`);
      processedActions.push({ action, path: targetPath, success: false, error: err.message });
    }
  }

  const successCount = processedActions.filter((a) => a.success).length;
  const hasChanges = successCount > 0;

  return {
    hasChanges,
    actions: processedActions,
    summary: result.summary || `${successCount}개 작업 완료`,
  };
}

// 메인 함수
async function main() {
  const args = parseArgs();

  // 필수 인자 확인
  if (!args['issue-number']) {
    console.error('❌ 오류: --issue-number 인자가 필요합니다.');
    console.error(
      '사용법: node scripts/process-feedback.js --issue-number 123 --issue-title "제목" --comment-body "피드백"'
    );
    process.exit(1);
  }

  const issueNumber = parseInt(args['issue-number'], 10);
  const issueTitle = args['issue-title'] || '';
  const commentBody = args['comment-body'] || '';

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

    const result = await processFeedback(context, commentBody);

    // AI History 기록 (변경이 있을 때만)
    if (result.hasChanges) {
      const actionTypeMap = {
        create: 'recover',
        modify: 'modify',
        delete: 'delete',
        publish: 'publish',
        unpublish: 'unpublish',
      };

      // 성공한 액션들에 대해 AI History 기록
      const successfulActions = result.actions?.filter((a) => a.success) || [];
      for (const actionItem of successfulActions) {
        const slug = actionItem.path
          ? actionItem.path.replace(/.*wiki\//, '').replace('.md', '')
          : issueTitle.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, '').replace(/\s+/g, '-');

        const actionDescMap = {
          create: '생성',
          modify: '수정',
          delete: '삭제',
          publish: '발행',
          unpublish: '발행 취소',
        };

        await addAIHistoryEntry({
          actionType: actionTypeMap[actionItem.action] || 'modify',
          issueNumber,
          issueTitle,
          documentSlug: slug,
          documentTitle: issueTitle,
          summary: `피드백에 따라 문서 ${actionDescMap[actionItem.action] || '처리'}`,
          trigger: 'maintainer_comment',
        });
      }

      // Issue 업데이트 (JSON 파일) - comments 수 증가
      await updateIssue(issueNumber, { comments: (context.comments?.length || 0) + 1 });
    }

    console.log('\n📄 처리 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    await setGitHubOutput({ has_changes: result.hasChanges });
  } catch (error) {
    console.error('❌ 피드백 처리 실패:', error.message);
    process.exit(1);
  }
}

main();
