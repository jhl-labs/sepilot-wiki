/**
 * 에이전트 팀 오케스트레이터
 *
 * 복잡한 요청을 자동 분해하고 에이전트 팀이 협력하여 처리
 * - 요청 복잡도 판별 (simple/medium/complex)
 * - 하위 태스크 분해
 * - 실행 순서 결정 및 팀 조정
 */

import { callOpenAI } from './utils.js';
import { getAgent } from './agents/index.js';
import {
  createSession,
  addMessage,
  updateSharedKnowledge,
} from './agents/shared-context.js';
import { runDocumentPipeline } from './agent-pipeline.js';
import { runPrePublishGate } from './quality-gate.js';

/**
 * 단순 요청 여부 판별
 * 단순 요청: 단일 문서 작성, 명확한 주제, 특별한 요구사항 없음
 *
 * @param {Object} context - Issue 컨텍스트
 * @returns {Promise<boolean>}
 */
export async function isSimpleRequest(context) {
  const systemPrompt = `당신은 요청 분석 전문가입니다.
주어진 요청이 "단순"인지 "복잡"인지 판별합니다.

JSON으로 응답:
{ "isSimple": true/false, "reason": "판단 근거" }

단순 요청:
- 단일 주제에 대한 하나의 문서 작성
- 기존 문서의 간단한 수정
- 명확하고 구체적인 요청

복잡한 요청:
- 여러 문서를 한번에 작성 (시리즈, 연관 문서)
- 기존 여러 문서의 대규모 개편
- 비교 분석, 종합 보고서
- "~에 대해 자세히" 등 범위가 넓은 요청`;

  const userPrompt = `다음 요청을 분석하세요:
제목: ${context.issueTitle}
내용: ${context.issueBody || '(없음)'}`;

  try {
    const response = await callOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.1, maxTokens: 500, responseFormat: 'json_object' }
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleaned);
    console.log(`📊 요청 복잡도: ${result.isSimple ? '단순' : '복잡'} (${result.reason})`);
    return result.isSimple;
  } catch {
    // 파싱 실패 시 단순으로 기본값
    return true;
  }
}

/**
 * 복잡한 요청 분해
 * @param {Object} context - Issue 컨텍스트
 * @returns {Promise<Object>} 분해 결과
 */
export async function decomposeRequest(context) {
  const systemPrompt = `당신은 프로젝트 관리 전문가입니다.
복잡한 문서 작성 요청을 실행 가능한 하위 태스크로 분해합니다.

JSON으로 응답:
{
  "complexity": "medium" | "complex",
  "subtasks": [
    {
      "id": "task-1",
      "title": "태스크 제목",
      "type": "research" | "write" | "review",
      "description": "설명",
      "dependsOn": [],
      "estimatedTokens": 4000
    }
  ],
  "executionStrategy": "sequential" | "parallel" | "mixed"
}

규칙:
- 각 subtask는 독립적으로 실행 가능해야 함
- 의존 관계를 명확히 지정
- 총 실행 시간이 10분 내로 완료 가능하도록 설계
- 한국어로 작성`;

  const userPrompt = `다음 요청을 하위 태스크로 분해하세요:
제목: ${context.issueTitle}
내용: ${context.issueBody || '(없음)'}`;

  const response = await callOpenAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 3000, responseFormat: 'json_object' }
  );

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const plan = JSON.parse(cleaned);

    console.log(`📋 분해 결과: ${plan.subtasks?.length || 0}개 태스크 (${plan.executionStrategy})`);
    return plan;
  } catch {
    // 파싱 실패 시 기본 계획
    return {
      complexity: 'medium',
      subtasks: [
        {
          id: 'task-1',
          title: context.issueTitle,
          type: 'write',
          description: context.issueBody || context.issueTitle,
          dependsOn: [],
          estimatedTokens: 8000,
        },
      ],
      executionStrategy: 'sequential',
    };
  }
}

/**
 * 오케스트레이션 실행
 * 분해된 계획에 따라 에이전트 팀을 조정하여 실행
 *
 * @param {Object} plan - decomposeRequest 결과
 * @param {Object} context - Issue 컨텍스트
 * @param {Object} [config] - 설정
 * @returns {Promise<Object>} 실행 결과
 */
export async function executeOrchestration(plan, context, config = {}) {
  const session = await createSession({
    issueNumber: context.issueNumber,
    issueTitle: context.issueTitle,
    plan,
  });

  console.log(`\n🎯 오케스트레이션 시작 (세션: ${session.sessionId.slice(0, 8)})`);
  console.log(`   전략: ${plan.executionStrategy}, 태스크: ${plan.subtasks.length}개`);

  const results = [];
  const completedTasks = new Map();

  // 태스크 실행 순서 결정
  const taskOrder = resolveExecutionOrder(plan.subtasks, plan.executionStrategy);

  for (const batch of taskOrder) {
    console.log(`\n📦 배치 실행: ${batch.map((t) => t.id).join(', ')}`);

    // 배치 내 태스크 병렬 실행
    const batchResults = await Promise.all(
      batch.map((task) => executeSubtask(task, context, session, completedTasks, config))
    );

    for (const result of batchResults) {
      results.push(result);
      completedTasks.set(result.taskId, result);
    }
  }

  // 최종 문서 결합
  const finalDocument = combineResults(results, plan);

  // 품질 게이트 실행
  let qualityResult = null;
  if (config.enableQualityGate !== false) {
    try {
      qualityResult = await runPrePublishGate(finalDocument, context);
      console.log(`   📊 품질 점수: ${qualityResult.score}/100 (${qualityResult.passed ? '통과' : '미통과'})`);
    } catch (error) {
      console.warn(`⚠️ 품질 게이트 실패: ${error.message}`);
    }
  }

  return {
    sessionId: session.sessionId,
    finalDocument,
    results,
    qualityResult,
    plan,
    mode: 'orchestration',
  };
}

/**
 * 실행 순서 결정 (의존성 기반 토폴로지 정렬)
 * @param {Array} subtasks
 * @param {string} strategy
 * @returns {Array<Array>} 배치 배열
 */
function resolveExecutionOrder(subtasks, strategy) {
  if (strategy === 'sequential') {
    return subtasks.map((t) => [t]);
  }

  // parallel 또는 mixed: 의존성 기반 배치
  const batches = [];
  const completed = new Set();
  const remaining = [...subtasks];

  while (remaining.length > 0) {
    const batch = remaining.filter((t) =>
      (t.dependsOn || []).every((dep) => completed.has(dep))
    );

    if (batch.length === 0) {
      // 순환 의존성 방지: 남은 것 모두 한 배치로
      batches.push(remaining.splice(0));
      break;
    }

    for (const task of batch) {
      const idx = remaining.indexOf(task);
      remaining.splice(idx, 1);
      completed.add(task.id);
    }

    batches.push(batch);
  }

  return batches;
}

/**
 * 개별 서브태스크 실행
 */
async function executeSubtask(task, context, session, completedTasks, config) {
  const start = Date.now();
  console.log(`   🔧 [${task.id}] ${task.title}`);

  try {
    let output;

    if (task.type === 'research') {
      const researcher = getAgent('researcher');
      const result = await researcher.execute(
        {
          type: 'research',
          input: {
            topic: task.title,
            issueBody: task.description,
            referenceContents: context.referenceContents,
          },
        },
        context
      );
      output = result.output;

      // 공유 컨텍스트에 리서치 결과 저장
      await updateSharedKnowledge(session.sessionId, 'researchFindings', output?.summary || '');
    } else if (task.type === 'write') {
      const writer = getAgent('writer');
      const result = await writer.execute(
        {
          type: 'write',
          input: {
            topic: task.title,
            issueBody: task.description,
            outline: session.sharedKnowledge?.documentOutline || '',
            researchSummary: session.sharedKnowledge?.researchFindings || '',
            existingDocsContext: config.existingDocsContext || '',
          },
        },
        context
      );
      output = result.output;
    } else if (task.type === 'review') {
      const reviewer = getAgent('reviewer');
      // 이전 write 결과 찾기
      const writeResult = [...completedTasks.values()].find(
        (r) => r.task?.type === 'write'
      );

      const result = await reviewer.execute(
        {
          type: 'review',
          input: {
            document: writeResult?.output || '',
            topic: task.title,
            issueBody: task.description,
          },
        },
        context
      );
      output = result.output;

      // 공유 컨텍스트에 피드백 저장
      if (output?.feedback) {
        await updateSharedKnowledge(session.sessionId, 'reviewFeedback', output.feedback);
      }
    } else {
      // 기본: 파이프라인 실행
      const pipelineResult = await runDocumentPipeline(
        { ...context, issueTitle: task.title, issueBody: task.description },
        config
      );
      output = pipelineResult.finalDocument;
    }

    await addMessage(session.sessionId, {
      from: task.type === 'research' ? 'researcher' : task.type === 'review' ? 'reviewer' : 'writer',
      type: 'result',
      content: typeof output === 'string' ? output.slice(0, 500) : JSON.stringify(output).slice(0, 500),
    });

    const durationMs = Date.now() - start;
    return { taskId: task.id, task, success: true, output, durationMs };
  } catch (error) {
    const durationMs = Date.now() - start;
    console.error(`   ❌ [${task.id}] 실패: ${error.message}`);
    return { taskId: task.id, task, success: false, error: error.message, durationMs };
  }
}

/**
 * 결과 결합
 * 여러 서브태스크의 결과를 하나의 문서로 결합
 */
function combineResults(results, plan) {
  const writeResults = results
    .filter((r) => r.success && r.task?.type === 'write' && typeof r.output === 'string')
    .map((r) => r.output);

  if (writeResults.length === 0) {
    // write 태스크가 없으면 가장 긴 문자열 결과 반환
    const stringResults = results
      .filter((r) => r.success && typeof r.output === 'string')
      .sort((a, b) => (b.output?.length || 0) - (a.output?.length || 0));

    return stringResults[0]?.output || '';
  }

  if (writeResults.length === 1) {
    return writeResults[0];
  }

  // 여러 문서 결합
  return writeResults.join('\n\n---\n\n');
}
