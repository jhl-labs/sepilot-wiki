#!/usr/bin/env node

/**
 * 코드 변경 → 문서 업데이트 감지 스크립트
 * push 이벤트에서 변경된 소스 파일을 분석하여 관련 wiki 문서를 찾고 업데이트 필요 Issue 생성
 *
 * 트리거: push (src/**, lib/**, app/**, scripts/**)
 * 출력: 관련 문서에 대한 Issue 자동 생성
 */

import { resolve } from 'path';
import { execFileSync } from 'child_process';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { setGitHubOutput } from '../lib/utils.js';
import { createGitHubIssues, getExistingIssues } from '../lib/report-generator.js';
import { parseArgs } from '../lib/utils.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');

/**
 * 변경된 파일 목록 추출 (환경변수 또는 Git diff에서)
 */
function getChangedFiles() {
  const args = parseArgs();

  // GitHub Actions에서 전달된 변경 파일 목록
  if (args['changed-files']) {
    return args['changed-files'].split(',').filter(Boolean);
  }

  // 마지막 커밋의 변경 파일
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], { encoding: 'utf-8', cwd: process.cwd() });
    return output
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 소스 파일만 필터링 (wiki/ 제외)
 */
function filterSourceFiles(files) {
  const sourcePatterns = [
    /^src\//,
    /^lib\//,
    /^app\//,
    /^scripts\//,
    /^components\//,
    /^hooks\//,
    /^services\//,
    /^utils\//,
  ];

  return files.filter((file) => {
    // wiki 파일 제외
    if (file.startsWith('wiki/')) return false;
    if (file.startsWith('guide/')) return false;
    if (file.startsWith('.github/')) return false;
    if (file.startsWith('public/')) return false;

    return sourcePatterns.some((pattern) => pattern.test(file));
  });
}

/**
 * 문서에서 소스 파일/모듈 참조 검색
 */
function findRelatedDocuments(changedFiles, documents) {
  const related = [];

  for (const doc of documents) {
    if (!doc.content) continue;

    const matchedFiles = [];

    for (const changedFile of changedFiles) {
      // 파일명 (확장자 포함/제외)
      const filename = changedFile.split('/').pop();
      const filenameNoExt = filename.replace(/\.[^.]+$/, '');

      // 디렉토리/모듈명
      const pathParts = changedFile.split('/');
      const moduleName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

      // 문서 내용에서 참조 검색
      const content = doc.content.toLowerCase();
      const rawContent = doc.rawContent || '';

      const isReferenced =
        content.includes(filename.toLowerCase()) ||
        content.includes(filenameNoExt.toLowerCase()) ||
        content.includes(changedFile.toLowerCase()) ||
        rawContent.includes(changedFile) ||
        // source_files frontmatter 확인
        (doc.frontmatter.source_files &&
          doc.frontmatter.source_files.includes(changedFile));

      if (isReferenced) {
        matchedFiles.push(changedFile);
      }
    }

    if (matchedFiles.length > 0) {
      related.push({
        document: doc,
        matchedFiles,
      });
    }
  }

  return related;
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🔍 코드 변경 → 문서 업데이트 감지 시작...');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('---');

  try {
    // 1. 변경 파일 목록 추출
    const allChangedFiles = getChangedFiles();
    console.log(`📝 전체 변경 파일: ${allChangedFiles.length}개`);

    // 2. 소스 파일만 필터링
    const sourceFiles = filterSourceFiles(allChangedFiles);
    console.log(`📦 소스 파일 변경: ${sourceFiles.length}개`);

    if (sourceFiles.length === 0) {
      console.log('ℹ️ 소스 파일 변경 없음 - 건너뜀');
      await setGitHubOutput({ has_updates: 'false', affected_docs: '0' });
      return;
    }

    console.log('변경된 소스 파일:');
    sourceFiles.forEach((f) => console.log(`   - ${f}`));

    // 3. 전체 wiki 문서 로드
    const documents = await loadAllDocuments({
      wikiDir: WIKI_DIR,
      includeContent: true,
    });
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    // 4. 관련 문서 검색
    const relatedDocs = findRelatedDocuments(sourceFiles, documents);
    console.log(`🔗 관련 문서 발견: ${relatedDocs.length}개`);

    if (relatedDocs.length === 0) {
      console.log('ℹ️ 관련 문서 없음 - 건너뜀');
      await setGitHubOutput({ has_updates: 'false', affected_docs: '0' });
      return;
    }

    // 5. Issue 생성
    const issues = relatedDocs.map((rel) => ({
      title: `문서 업데이트 필요: ${rel.document.title}`,
      body: [
        '## 코드 변경에 따른 문서 업데이트 필요',
        '',
        `**관련 문서**: \`${rel.document.path}\``,
        '',
        '### 변경된 소스 파일',
        ...rel.matchedFiles.map((f) => `- \`${f}\``),
        '',
        '### 조치 사항',
        '위 소스 파일의 변경사항이 문서에 반영되어야 할 수 있습니다.',
        '문서 내용을 검토하고 필요시 업데이트해주세요.',
        '',
        `> 문서 위치: \`wiki/${rel.document.path}\``,
      ].join('\n'),
      labels: ['wiki-maintenance', 'update-request'],
    }));

    const createdIssues = await createGitHubIssues(issues, {
      titlePrefix: '[코드 변경 감지]',
      defaultLabels: ['wiki-maintenance', 'update-request'],
      footer: '\n\n---\n*🤖 이 Issue는 코드 변경 감지기에 의해 자동 생성되었습니다.*',
    });

    // 6. GitHub Actions 출력
    await setGitHubOutput({
      has_updates: 'true',
      affected_docs: String(relatedDocs.length),
      issues_created: String(createdIssues.length),
    });

    console.log('---');
    console.log(`🎉 완료: ${relatedDocs.length}개 문서 감지, ${createdIssues.length}개 Issue 생성`);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
