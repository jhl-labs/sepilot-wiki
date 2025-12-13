import { describe, it, expect } from 'vitest';
import {
  formatTitle,
  slugify,
  formatRelativeTime,
  extractPlainText,
  truncate,
} from './index';

describe('formatTitle', () => {
  it('하이픈을 공백으로 변환하고 첫 글자를 대문자로', () => {
    expect(formatTitle('hello-world')).toBe('Hello World');
  });

  it('언더스코어를 공백으로 변환', () => {
    expect(formatTitle('api_docs')).toBe('Api Docs');
  });

  it('혼합된 구분자 처리', () => {
    expect(formatTitle('my-api_documentation')).toBe('My Api Documentation');
  });

  it('단일 단어 처리', () => {
    expect(formatTitle('hello')).toBe('Hello');
  });

  it('빈 문자열 처리', () => {
    expect(formatTitle('')).toBe('');
  });
});

describe('slugify', () => {
  it('공백을 하이픈으로 변환', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('특수문자 제거', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('한글 유지', () => {
    expect(slugify('API 문서')).toBe('api-문서');
  });

  it('연속된 하이픈 정리', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('소문자로 변환', () => {
    expect(slugify('HELLO WORLD')).toBe('hello-world');
  });
});

describe('formatRelativeTime', () => {
  it('방금 전 표시', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('방금 전');
  });

  it('분 단위 표시', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5분 전');
  });

  it('시간 단위 표시', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2시간 전');
  });

  it('일 단위 표시', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3일 전');
  });

  it('문자열 날짜 파싱', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('방금 전');
  });
});

describe('extractPlainText', () => {
  it('코드 블록 제거', () => {
    const markdown = '텍스트\n```js\ncode\n```\n더 많은 텍스트';
    expect(extractPlainText(markdown)).toContain('텍스트');
    expect(extractPlainText(markdown)).not.toContain('```');
  });

  it('인라인 코드 제거', () => {
    const markdown = '`코드`를 사용하세요';
    expect(extractPlainText(markdown)).toBe('를 사용하세요');
  });

  it('링크에서 텍스트만 추출', () => {
    const markdown = '[링크 텍스트](https://example.com)';
    expect(extractPlainText(markdown)).toBe('링크 텍스트');
  });

  it('헤더 기호 제거', () => {
    const markdown = '# 제목\n## 부제목';
    const result = extractPlainText(markdown);
    expect(result).toContain('제목');
    expect(result).not.toContain('#');
  });

  it('이미지 제거', () => {
    const markdown = '![alt](image.png) 텍스트';
    expect(extractPlainText(markdown)).toBe('텍스트');
  });
});

describe('truncate', () => {
  it('짧은 문자열은 그대로 반환', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('긴 문자열은 잘라서 말줄임표 추가', () => {
    // maxLength까지 자르고 말줄임표 추가
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('정확히 maxLength일 때', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('빈 문자열 처리', () => {
    expect(truncate('', 10)).toBe('');
  });
});
