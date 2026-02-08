/**
 * 실행 가능한 스크립트 정의 (단일 소스)
 * API 목록 조회와 실행 API에서 공통 사용
 */

export interface ScriptDefinition {
  name: string;
  path: string;
  description: string;
  requiredEnv: string[];
}

export const SCRIPT_DEFINITIONS: ScriptDefinition[] = [
  {
    name: 'answer-question',
    path: 'scripts/document/answer-question.js',
    description: 'AI 질문 응답',
    requiredEnv: ['ISSUE_NUMBER'],
  },
  {
    name: 'update-document',
    path: 'scripts/document/update-document.js',
    description: '문서 수정 요청 처리',
    requiredEnv: ['ISSUE_NUMBER'],
  },
  {
    name: 'recommend-documents',
    path: 'scripts/document/recommend-documents.js',
    description: '관련 문서 추천',
    requiredEnv: ['ISSUE_NUMBER'],
  },
  {
    name: 'generate-document',
    path: 'scripts/document/generate-document.js',
    description: '문서 생성',
    requiredEnv: ['ISSUE_NUMBER'],
  },
  {
    name: 'generate-release-doc',
    path: 'scripts/document/generate-release-doc.js',
    description: '릴리스 문서 생성',
    requiredEnv: ['RELEASE_TAG'],
  },
];
