#!/usr/bin/env node

/**
 * 관련 문서 자동 추천 스크립트
 * request 라벨 추가 시 기존 문서 중 유사 문서를 검색하여 중복 방지 댓글 추가
 *
 * 트리거: request 라벨 추가 시 (문서 생성 전에 실행)
 * 동작: 기존 문서 검색 → 유사 문서 발견 시 댓글 추가
 */

import { resolve } from 'path';
import { runIssueWorkflow } from '../lib/workflow.js';
import { callOpenAI } from '../lib/utils.js';
import { loadAllDocuments } from '../lib/document-scanner.js';
import { addIssueComment } from '../lib/report-generator.js';

const WIKI_DIR = resolve(process.cwd(), 'wiki');

runIssueWorkflow(
  {
    scriptName: 'recommend-documents',
    requiredArgs: ['issue-number'],
  },
  async (context, args, githubInfo) => {
    console.log('🔍 관련 문서 추천 시작...');
    console.log(`   Issue #${context.issueNumber}: ${context.issueTitle}`);

    // 1. 전체 wiki 문서 로드
    const documents = await loadAllDocuments({
      wikiDir: WIKI_DIR,
      includeContent: true,
    });

    if (documents.length === 0) {
      console.log('ℹ️ 기존 문서 없음 - 추천 건너뜀');
      return { has_recommendations: 'false' };
    }

    // 2. AI에게 유사 문서 검색 요청
    const docSummaries = documents.map((doc) => ({
      title: doc.title,
      path: doc.path,
      tags: doc.tags,
      preview: doc.content ? doc.content.slice(0, 300) : '',
    }));

    const systemPrompt = `당신은 Wiki 문서 유사도 분석 전문가입니다.
새로운 문서 작성 요청과 기존 문서들을 비교하여 유사한 문서를 찾습니다.

## 출력 형식 (JSON)
{
  "hasRelated": true/false,
  "relatedDocuments": [
    {
      "path": "문서 경로",
      "title": "문서 제목",
      "relevance": "high | medium | low",
      "reason": "관련 이유 (한국어, 1줄)"
    }
  ],
  "isDuplicate": true/false,
  "duplicateNote": "중복인 경우 설명 (한국어)"
}

## 판단 기준
- high: 주제가 거의 동일하여 중복 가능성 높음
- medium: 관련 주제로 참고할 만함
- low: 간접적으로 관련됨

최대 5개까지만 반환하세요. 관련 문서가 없으면 빈 배열을 반환하세요.`;

    const userPrompt = `새 문서 작성 요청:
제목: ${context.issueTitle}
내용: ${context.issueBody || '(내용 없음)'}

기존 문서 목록:
${JSON.stringify(docSummaries, null, 2)}

유사 문서를 찾아주세요. JSON으로만 응답하세요.`;

    const response = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.1, maxTokens: 2000 }
    );

    // JSON 파싱
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('⚠️ AI 응답 파싱 실패 - 추천 건너뜀');
      return { has_recommendations: 'false' };
    }

    const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    if (!result.hasRelated || result.relatedDocuments.length === 0) {
      console.log('ℹ️ 관련 문서 없음');
      return { has_recommendations: 'false' };
    }

    // 3. 관련 문서 댓글 작성
    const relatedDocs = result.relatedDocuments;
    const lines = [
      '## 📚 관련 문서 발견',
      '',
    ];

    if (result.isDuplicate) {
      lines.push(
        '> ⚠️ **주의**: 유사한 내용의 문서가 이미 존재할 수 있습니다.',
        `> ${result.duplicateNote}`,
        ''
      );
    }

    lines.push('| 문서 | 관련도 | 사유 |');
    lines.push('|------|--------|------|');

    for (const doc of relatedDocs) {
      const relevanceEmoji = doc.relevance === 'high' ? '🔴' : doc.relevance === 'medium' ? '🟡' : '🟢';
      lines.push(`| \`${doc.path}\` - ${doc.title} | ${relevanceEmoji} ${doc.relevance} | ${doc.reason} |`);
    }

    lines.push('');
    lines.push('---');
    lines.push('*기존 문서와 중복되지 않는지 확인 후 문서 생성을 진행합니다.*');

    await addIssueComment(context.issueNumber, lines.join('\n'));

    console.log(`✅ ${relatedDocs.length}개 관련 문서 추천 완료`);

    return {
      has_recommendations: 'true',
      related_count: String(relatedDocs.length),
      is_duplicate: String(result.isDuplicate || false),
    };
  }
);
