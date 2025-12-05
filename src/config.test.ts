import { describe, it, expect } from 'vitest';
import { config, LABELS, urls } from './config';

describe('config', () => {
  it('필수 설정값이 존재', () => {
    expect(config.owner).toBeDefined();
    expect(config.repo).toBeDefined();
    expect(config.title).toBeDefined();
  });

  it('owner와 repo가 문자열', () => {
    expect(typeof config.owner).toBe('string');
    expect(typeof config.repo).toBe('string');
  });
});

describe('LABELS', () => {
  it('필수 라벨이 정의됨', () => {
    expect(LABELS.REQUEST).toBe('request');
    expect(LABELS.INVALID).toBe('invalid');
    expect(LABELS.DRAFT).toBe('draft');
    expect(LABELS.AI_GENERATED).toBe('ai-generated');
  });
});

describe('urls', () => {
  describe('repo', () => {
    it('올바른 GitHub 저장소 URL 생성', () => {
      const url = urls.repo();
      expect(url).toMatch(/^https:\/\/github\.com\/.+\/.+$/);
      expect(url).toContain(config.owner);
      expect(url).toContain(config.repo);
    });
  });

  describe('issues', () => {
    it('Issues URL 생성', () => {
      const url = urls.issues();
      expect(url).toContain('/issues');
    });
  });

  describe('newIssue', () => {
    it('기본 새 Issue URL 생성', () => {
      const url = urls.newIssue();
      expect(url).toContain('/issues/new');
    });

    it('title 파라미터 포함', () => {
      const url = urls.newIssue({ title: '테스트 제목' });
      expect(url).toContain('title=');
      // URLSearchParams는 공백을 +로 인코딩
      expect(url).toMatch(/title=.+/);
    });

    it('labels 파라미터 포함', () => {
      const url = urls.newIssue({ labels: 'request' });
      expect(url).toContain('labels=request');
    });

    it('여러 파라미터 조합', () => {
      const url = urls.newIssue({
        title: '문서 요청',
        labels: 'request',
        body: '내용',
      });
      expect(url).toContain('title=');
      expect(url).toContain('labels=');
      expect(url).toContain('body=');
    });
  });

  describe('commit', () => {
    it('커밋 URL 생성', () => {
      const sha = 'abc1234';
      const url = urls.commit(sha);
      expect(url).toContain('/commit/abc1234');
    });
  });

  describe('fileHistory', () => {
    it('파일 히스토리 URL 생성', () => {
      const url = urls.fileHistory('wiki/home.md');
      expect(url).toContain('/commits/main/wiki/home.md');
    });

    it('커스텀 브랜치 지정', () => {
      const url = urls.fileHistory('wiki/home.md', 'develop');
      expect(url).toContain('/commits/develop/wiki/home.md');
    });
  });

  describe('pages', () => {
    it('GitHub Pages URL 생성', () => {
      const url = urls.pages();
      expect(url).toMatch(/^https:\/\/.+\.github\.io\/.+$/);
    });
  });
});
