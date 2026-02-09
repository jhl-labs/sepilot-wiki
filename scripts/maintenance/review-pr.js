#!/usr/bin/env node

/**
 * AI를 사용하여 PR을 리뷰하는 스크립트
 * .github/workflows/gemini-pr-review.yml에서 호출됨
 */

import { fetchPullRequestFiles, getGitHubInfoFromEnv } from '../lib/issue-context.js';
import { callOpenAI, parseArgs, getOpenAIConfig } from '../lib/utils.js';

async function main() {
    const args = parseArgs();
    const pullNumber = args['pull-number'];

    if (!pullNumber) {
        console.error('❌ 오류: --pull-number 인자가 필요합니다.');
        process.exit(1);
    }

    const { owner, repo, token } = getGitHubInfoFromEnv();
    const config = getOpenAIConfig();

    console.log(`🤖 AI PR 리뷰 시작 (PR #${pullNumber})...`);
    console.log(`   모델: ${config.model}`);

    // 1. 변경된 파일 가져오기
    const files = await fetchPullRequestFiles(owner, repo, pullNumber, token);

    if (files.length === 0) {
        console.log('변경 사항이 없거나 파일을 가져올 수 없습니다.');
        return;
    }

    // 2. 리뷰할 파일 필터링 (너무 큰 파일, lockfile 등 제외)
    const filesToReview = files.filter(f =>
        f.status !== 'removed' &&
        !f.filename.includes('lock') &&
        f.patch &&
        f.patch.length < 10000 // 너무 큰 패치 제외
    );

    console.log(`   검토 대상 파일: ${filesToReview.length}개`);

    if (filesToReview.length === 0) {
        console.log('검토할 파일이 없습니다.');
        return;
    }

    // 3. AI 리뷰 요청
    const patches = filesToReview.map(f =>
        `File: ${f.filename}\nStatus: ${f.status}\nDiff:\n${f.patch}`
    ).join('\n\n---\n\n');

    const systemPrompt = `당신은 숙련된 시니어 개발자입니다. Pull Request의 코드를 리뷰해야 합니다.
다음 기준에 따라 한국어로 리뷰를 작성해주세요:
1. 버그 가능성: 잠재적인 런타임 오류나 논리적 결함
2. 성능 이슈: 비효율적인 코드
3. 보안 취약점: 보안 상 위험한 코드
4. 코드 스타일: 가독성 및 유지보수성 (TypeScript/React 모범 사례 준수)
5. 긍정적인 점: 잘 작성된 부분에 대한 칭찬

형식:
## 🤖 AI 코드 리뷰

### 🔍 요약
(전반적인 변경 사항에 대한 짧은 요약)

### ⚠️ 주요 발견 사항
- **[파일경로]**: (발견 사항 설명)

### ✅ 잘된 점
- (잘된 점 설명)

### 💡 제안 사항
- (개선 가능한 부분)

참고: 심각한 문제가 없다면 "전반적으로 잘 작성된 코드입니다"라고 평가해주세요.
`;

    const userPrompt = `다음 변경 사항을 리뷰해주세요:\n\n${patches}`;

    try {
        const review = await callOpenAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], { temperature: 0.2 });

        // 4. 리뷰 코멘트 작성
        await createReviewComment(owner, repo, pullNumber, review, token);
        console.log('✅ 리뷰 작성 완료');

    } catch (error) {
        console.error('❌ 리뷰 생성 실패:', error);
        process.exit(1);
    }
}

async function createReviewComment(owner, repo, pullNumber, body, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({ body })
    });

    if (!response.ok) {
        throw new Error(`코멘트 작성 실패: ${response.status}`);
    }
}

main();
