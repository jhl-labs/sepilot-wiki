#!/usr/bin/env node

/**
 * Wiki 문서의 링크 유효성을 검사하는 스크립트
 * .github/workflows/gemini-link-validator.yml에서 호출됨
 */

import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { getGitHubInfoFromEnv } from './lib/issue-context.js';

const WIKI_DIR = join(process.cwd(), 'wiki');

async function getAllWikiFiles(dir) {
    const files = await readdir(dir, { recursive: true });
    return files
        .filter(f => f.endsWith('.md'))
        .map(f => join(dir, f));
}

async function validateLinks() {
    console.log('🔍 Wiki 링크 유효성 검사 시작...');

    const files = await getAllWikiFiles(WIKI_DIR);
    const errors = [];

    for (const file of files) {
        const content = await readFile(file, 'utf-8');
        const relativePath = file.substring(WIKI_DIR.length + 1);

        // 마크다운 링크 추출 [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            const [fullMatch, text, url] = match;

            // 1. 외부 링크 (http/https) - 체크 생략 (너무 느릴 수 있음)
            if (url.startsWith('http')) {
                continue;
            }

            // 2. 앵커 링크 (#) - 현재 파일 내 존재 여부 체크는 복잡하므로 일단 생략
            if (url.startsWith('#')) {
                continue;
            }

            // 3. 내부 링크
            // /wiki/slug 형태 or 상대 경로
            let targetPath;
            if (url.startsWith('/wiki/')) {
                // 절대 경로 (/wiki/...) -> 로컬 파일 시스템 경로로 변환
                // url: /wiki/some-slug -> wiki/some-slug.md
                const slug = url.replace('/wiki/', '');
                targetPath = join(WIKI_DIR, `${slug}.md`);
            } else if (url.startsWith('/')) {
                // 그 외 절대 경로 (이미지 등)
                targetPath = join(process.cwd(), url); // 프로젝트 루트 기준
            } else {
                // 상대 경로
                targetPath = resolve(dirname(file), url);
                // 확장자가 없으면 .md 붙여보기 (Wiki 관례)
                if (!targetPath.endsWith('.md') && !targetPath.includes('.')) {
                    targetPath += '.md';
                }
            }

            // 쿼리 스트링/해시 제거
            targetPath = targetPath.split('#')[0].split('?')[0];

            if (!existsSync(targetPath)) {
                errors.push({
                    file: relativePath,
                    text,
                    url,
                    reason: '파일을 찾을 수 없음'
                });
            }
        }
    }

    return errors;
}

async function reportErrors(errors) {
    if (errors.length === 0) {
        console.log('✅ 모든 링크가 유효합니다.');
        return;
    }

    console.log(`❌ ${errors.length}개의 깨진 링크가 발견되었습니다:`);

    let reportBody = '## 🚨 Wiki 깨진 링크 보고서\n\n';
    reportBody += `발견된 문제: ${errors.length}개\n\n`;
    reportBody += '| 파일 | 텍스트 | 링크 | 문제 |\n';
    reportBody += '|---|---|---|---|\n';

    for (const err of errors) {
        console.log(`  - [${err.file}] "${err.text}" -> ${err.url} (${err.reason})`);
        reportBody += `| ${err.file} | ${err.text} | \`${err.url}\` | ${err.reason} |\n`;
    }

    // GitHub Issue 생성 (이미 열린 이슈가 있는지 확인 필요하지만, 일단 단순화하여 생성)
    // 환경 변수가 있을 때만 실행
    const { owner, repo, token } = getGitHubInfoFromEnv();

    if (owner && repo && token) {
        await createIssue(owner, repo, token, reportBody);
    } else {
        console.log('GitHub Token이 없어 Issue를 생성하지 않습니다.');
        process.exit(1); // CI 실패 처리
    }
}

async function createIssue(owner, repo, token, body) {
    // 중복 방지를 위해 "Wiki 깨진 링크 보고서" 제목의 열린 이슈 검색
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repo}+state:open+"Wiki 깨진 링크 보고서"`;
    const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.ok) {
        const data = await searchRes.json();
        if (data.total_count > 0) {
            console.log('이미 열린 보고서 이슈가 있어 업데이트(코멘트)합니다.');
            // 코멘트 추가
            const issueNumber = data.items[0].number;
            await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ body: `### 🔄 업데이트 (재검사)\n\n${body}` })
            });
            return;
        }
    }

    // 새 이슈 생성
    console.log('새 이슈를 생성합니다...');
    const createUrl = `https://api.github.com/repos/${owner}/${repo}/issues`;
    await fetch(createUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: '🚨 Wiki 깨진 링크 보고서',
            body: body,
            labels: ['maintenance', 'bug']
        })
    });
}

// 메인 실행
validateLinks()
    .then(reportErrors)
    .catch(err => {
        console.error('실행 중 오류 발생:', err);
        process.exit(1);
    });
