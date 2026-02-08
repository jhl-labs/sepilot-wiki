#!/usr/bin/env node

/**
 * 문서 품질 스코어링 스크립트
 * 룰 기반 + AI 기반으로 전체 문서의 품질을 평가
 *
 * 트리거: 매월 1일 + workflow_dispatch
 * 출력: public/data/quality-scores.json, 50점 미만 문서 Issue 생성
 */

import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { callOpenAI, getOpenAIConfig, setGitHubOutput } from '../lib/utils.js';
import { mergeFrontmatter } from '../lib/frontmatter.js';
import { addAIHistoryEntry } from '../lib/ai-history.js';
import { saveReport, createGitHubIssues } from '../lib/report-generator.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');
const IS_DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * 룰 기반 품질 평가 (최대 50점)
 */
function ruleBasedScore(doc) {
  let score = 0;
  const issues = [];

  // frontmatter 완전성 (최대 15점)
  const fm = doc.frontmatter;
  if (fm.title) score += 3;
  else issues.push('title 누락');

  if (fm.status) score += 2;
  else issues.push('status 누락');

  if (fm.tags && (Array.isArray(fm.tags) ? fm.tags.length > 0 : fm.tags.length > 2)) score += 3;
  else issues.push('tags 누락 또는 부족');

  if (fm.author) score += 2;
  else issues.push('author 누락');

  if (fm.description) score += 3;
  else issues.push('description 누락');

  if (fm.category) score += 2;
  else issues.push('category 누락');

  // 구조 품질 (최대 20점)
  if (doc.content) {
    const headings = doc.content.match(/^#{2,4}\s/gm);
    if (headings && headings.length >= 2) score += 5;
    else if (headings && headings.length >= 1) score += 2;
    else issues.push('헤딩 구조 부족');

    // 적절한 길이 (200단어 이상)
    if (doc.wordCount >= 500) score += 5;
    else if (doc.wordCount >= 200) score += 3;
    else if (doc.wordCount >= 100) score += 1;
    else issues.push('내용이 너무 짧음');

    // 코드 블록 존재
    if (doc.content.includes('```')) score += 3;

    // 링크 존재
    if (doc.content.match(/\[.+?\]\(.+?\)/)) score += 3;

    // 리스트 존재
    if (doc.content.match(/^[-*]\s/m)) score += 2;

    // 이미지 존재
    if (doc.content.match(/!\[.+?\]\(.+?\)/)) score += 2;
  }

  // 파일명 품질 (최대 5점)
  if (!doc.hasKoreanFilename) score += 3;
  else issues.push('한글 파일명');

  if (doc.filename.length <= 50) score += 2;

  // 상태 품질 (최대 10점)
  if (doc.status === 'published') score += 10;
  else if (doc.status === 'draft') score += 5;
  else if (doc.status === 'needs_review') score += 2;

  return { ruleScore: Math.min(score, 50), issues };
}

/**
 * AI 기반 품질 평가 (최대 50점)
 * 배치로 처리하여 API 호출 최소화
 */
async function aiBasedScore(documents) {
  // 10개씩 배치 처리
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    console.log(`   AI 평가 중... (${i + 1}-${Math.min(i + batchSize, documents.length)}/${documents.length})`);

    const docSummaries = batch.map((doc) => ({
      path: doc.path,
      title: doc.title,
      tags: doc.tags,
      wordCount: doc.wordCount,
      preview: doc.content ? doc.content.slice(0, 500) : '',
    }));

    const systemPrompt = `당신은 기술 문서 품질 평가 전문가입니다.
각 문서를 평가하여 AI 품질 점수(0-50)와 개선 제안을 제공합니다.

## 평가 기준 (각 10점)
1. **명확성**: 설명이 명확하고 이해하기 쉬운가?
2. **정확성**: 기술적으로 정확한 내용인가?
3. **완성도**: 주제를 충분히 다루고 있는가?
4. **가독성**: 구조화가 잘 되어 있고 읽기 쉬운가?
5. **실용성**: 실제로 도움이 되는 내용인가?

## 출력 (JSON 배열)
[
  {
    "path": "문서 경로",
    "aiScore": 0-50,
    "breakdown": { "clarity": 0-10, "accuracy": 0-10, "completeness": 0-10, "readability": 0-10, "usefulness": 0-10 },
    "suggestions": ["개선 제안 (한국어, 최대 3개)"]
  }
]`;

    const response = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `다음 문서들을 평가해주세요:\n${JSON.stringify(docSummaries, null, 2)}` },
      ],
      { temperature: 0.1, maxTokens: 4000 }
    );

    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      results.push(...parsed);
    }
  }

  return results;
}

/**
 * 메인 실행
 */
async function main() {
  console.log('📊 문서 품질 스코어링 시작...');
  if (IS_DRY_RUN) console.log('🧪 DRY RUN 모드');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('---');

  try {
    // 1. 문서 로드
    const documents = await loadAllDocuments({ wikiDir: WIKI_DIR, includeContent: true });
    console.log(`📚 ${documents.length}개 문서 로드됨`);

    if (documents.length === 0) {
      console.log('⚠️ 평가할 문서가 없습니다.');
      await setGitHubOutput({ total_scored: '0' });
      return;
    }

    // 2. 룰 기반 평가
    console.log('📏 룰 기반 평가 중...');
    const ruleResults = documents.map((doc) => ({
      doc,
      ...ruleBasedScore(doc),
    }));

    // 3. AI 기반 평가
    console.log('🤖 AI 기반 평가 중...');
    const aiResults = await aiBasedScore(documents);

    // 4. 점수 합산
    const scores = ruleResults.map((rule) => {
      const aiResult = aiResults.find((ai) => ai.path === rule.doc.path);
      const aiScore = aiResult ? aiResult.aiScore : 25; // AI 평가 실패 시 기본 25점

      return {
        path: rule.doc.path,
        title: rule.doc.title,
        ruleScore: rule.ruleScore,
        aiScore,
        totalScore: rule.ruleScore + aiScore,
        ruleIssues: rule.issues,
        aiSuggestions: aiResult ? aiResult.suggestions : [],
        aiBreakdown: aiResult ? aiResult.breakdown : null,
      };
    });

    // 점수순 정렬
    scores.sort((a, b) => a.totalScore - b.totalScore);

    // 5. frontmatter 업데이트
    let updatedCount = 0;
    for (const score of scores) {
      const doc = documents.find((d) => d.path === score.path);
      if (!doc || !doc.rawContent) continue;

      const updatedContent = mergeFrontmatter(doc.rawContent, {
        quality_score: String(score.totalScore),
      });

      if (updatedContent !== doc.rawContent && !IS_DRY_RUN) {
        await writeFile(doc.fullPath, updatedContent);
        updatedCount++;
      }
    }

    // 6. 보고서 저장
    const report = {
      timestamp: new Date().toISOString(),
      model: getOpenAIConfig().model,
      isDryRun: IS_DRY_RUN,
      summary: {
        totalDocuments: documents.length,
        averageScore: Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length),
        lowQualityCount: scores.filter((s) => s.totalScore < 50).length,
        highQualityCount: scores.filter((s) => s.totalScore >= 80).length,
      },
      scores,
    };

    await saveReport('quality-scores.json', report);

    // 7. 50점 미만 문서 Issue 생성
    const lowQualityDocs = scores.filter((s) => s.totalScore < 50);
    if (lowQualityDocs.length > 0) {
      const issues = lowQualityDocs.slice(0, 5).map((doc) => ({
        title: `문서 품질 개선 필요: ${doc.title}`,
        body: [
          '## 문서 품질 평가 결과',
          '',
          `- **문서**: \`${doc.path}\``,
          `- **총점**: ${doc.totalScore}/100`,
          `- **룰 기반**: ${doc.ruleScore}/50`,
          `- **AI 평가**: ${doc.aiScore}/50`,
          '',
          '### 룰 기반 문제점',
          ...doc.ruleIssues.map((i) => `- ${i}`),
          '',
          '### AI 개선 제안',
          ...doc.aiSuggestions.map((s) => `- ${s}`),
        ].join('\n'),
        labels: ['wiki-maintenance'],
      }));

      await createGitHubIssues(issues, {
        titlePrefix: '[품질 평가]',
        defaultLabels: ['wiki-maintenance'],
        footer: '\n\n---\n*🤖 이 Issue는 문서 품질 스코어링에 의해 자동 생성되었습니다.*',
      });
    }

    // 8. AI History 기록
    if (!IS_DRY_RUN) {
      await addAIHistoryEntry({
        actionType: 'quality_score',
        issueNumber: null,
        issueTitle: '문서 품질 평가',
        documentSlug: '_quality-score',
        documentTitle: '문서 품질 평가',
        summary: `${documents.length}개 문서 평가, 평균 ${report.summary.averageScore}점, ${lowQualityDocs.length}개 저품질`,
        trigger: 'monthly_schedule',
        model: getOpenAIConfig().model,
      });
    }

    // 9. GitHub Actions 출력
    await setGitHubOutput({
      total_scored: String(documents.length),
      average_score: String(report.summary.averageScore),
      low_quality_count: String(lowQualityDocs.length),
      updated_count: String(updatedCount),
    });

    console.log('---');
    console.log(`🎉 품질 평가 완료: 평균 ${report.summary.averageScore}점`);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
