#!/usr/bin/env node

/**
 * Issue가 닫히면 문서를 draft에서 published 상태로 전환하는 스크립트
 * GitHub Issue가 닫히면 issue-handler.yml에서 호출됨
 *
 * 사용법:
 * node scripts/publish-document.js --issue-number 123 --issue-title "문서 제목"
 */

import { writeFile, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 출력 경로
const WIKI_DIR = join(process.cwd(), 'wiki');

// 명령줄 인자 파싱
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsed[key] = value;
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }

  return parsed;
}

// 슬러그로 문서 찾기
async function findDocumentByTitle(issueTitle) {
  if (!existsSync(WIKI_DIR)) {
    return null;
  }

  // 제목에서 슬러그 생성
  const expectedSlug = issueTitle
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);

  const expectedFilename = `${expectedSlug}.md`;
  const filepath = join(WIKI_DIR, expectedFilename);

  if (existsSync(filepath)) {
    const content = await readFile(filepath, 'utf-8');
    return { filepath, filename: expectedFilename, content };
  }

  // 슬러그가 맞지 않으면 모든 문서에서 제목으로 검색
  const files = await readdir(WIKI_DIR);
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const content = await readFile(join(WIKI_DIR, file), 'utf-8');
    const titleMatch = content.match(/title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch && titleMatch[1].trim() === issueTitle) {
      return { filepath: join(WIKI_DIR, file), filename: file, content };
    }
  }

  return null;
}

// frontmatter에서 status 변경
function updateFrontmatterStatus(content, newStatus) {
  // frontmatter 추출
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    // frontmatter가 없으면 추가
    return `---\nstatus: ${newStatus}\n---\n${content}`;
  }

  const frontmatter = frontmatterMatch[1];
  const rest = content.slice(frontmatterMatch[0].length);

  // status 필드가 있으면 변경, 없으면 추가
  if (/^status:/m.test(frontmatter)) {
    const newFrontmatter = frontmatter.replace(/^status:.*$/m, `status: ${newStatus}`);
    return `---\n${newFrontmatter}\n---${rest}`;
  } else {
    const newFrontmatter = `${frontmatter}\nstatus: ${newStatus}`;
    return `---\n${newFrontmatter}\n---${rest}`;
  }
}

// 문서 발행
async function publishDocument(issueNumber, issueTitle) {
  console.log('📤 문서 발행 시작...');
  console.log(`   Issue #${issueNumber}: ${issueTitle}`);

  // 문서 찾기
  const doc = await findDocumentByTitle(issueTitle);
  if (!doc) {
    console.log('⚠️ 해당 Issue에 연결된 문서를 찾을 수 없습니다.');
    console.log(`   찾으려는 제목: ${issueTitle}`);
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

  const issueNumber = args['issue-number'];
  const issueTitle = args['issue-title'] || '';

  try {
    const result = await publishDocument(issueNumber, issueTitle);

    console.log('\n📄 처리 결과:');
    console.log(JSON.stringify(result, null, 2));

    // GitHub Actions 출력 설정
    if (process.env.GITHUB_OUTPUT) {
      const output = [`has_changes=${result.hasChanges}`].join('\n');
      await writeFile(process.env.GITHUB_OUTPUT, output, { flag: 'a' });
    }
  } catch (error) {
    console.error('❌ 문서 발행 실패:', error.message);
    process.exit(1);
  }
}

main();
