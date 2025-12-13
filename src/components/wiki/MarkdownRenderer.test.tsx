import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MarkdownRenderer } from './MarkdownRenderer';

// Mock ThemeContext
vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ actualTheme: 'light', theme: 'light', setTheme: vi.fn() }),
}));

// Mock Mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    parse: vi.fn().mockResolvedValue(true),
    render: vi.fn().mockResolvedValue({ svg: '<svg>mocked</svg>' }),
  },
}));

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string) => html,
  },
}));

// 테스트용 wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 텍스트를 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="안녕하세요, 테스트입니다." />
      </TestWrapper>
    );

    expect(screen.getByText('안녕하세요, 테스트입니다.')).toBeInTheDocument();
  });

  it('H2 제목을 렌더링하고 id를 생성한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="## 시작하기" />
      </TestWrapper>
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('시작하기');
    expect(heading).toHaveAttribute('id', '시작하기');
  });

  it('H1 제목은 렌더링하지 않는다 (frontmatter title 사용)', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="# 메인 제목" />
      </TestWrapper>
    );

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('코드 블록을 렌더링한다', () => {
    const markdown = '```javascript\nconst x = 1;\n```';
    render(
      <TestWrapper>
        <MarkdownRenderer content={markdown} />
      </TestWrapper>
    );

    expect(screen.getByText('javascript')).toBeInTheDocument();
    // 코드가 syntax highlighting으로 분리되어 렌더링되므로 개별 토큰 확인
    expect(screen.getByText('const')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('인라인 코드를 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="변수 `foo`를 사용합니다." />
      </TestWrapper>
    );

    const inlineCode = screen.getByText('foo');
    expect(inlineCode).toHaveClass('inline-code');
  });

  it('외부 링크를 새 탭으로 열리게 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="[구글](https://google.com)" />
      </TestWrapper>
    );

    const link = screen.getByRole('link', { name: /구글/ });
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('내부 위키 링크를 올바르게 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="[가이드](/wiki/guide)" />
      </TestWrapper>
    );

    const link = screen.getByRole('link', { name: '가이드' });
    expect(link).toHaveAttribute('href', '/wiki/guide');
    expect(link).not.toHaveAttribute('target');
  });

  it('상대 경로 링크를 위키 링크로 변환한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="[문서](./other-doc.md)" />
      </TestWrapper>
    );

    const link = screen.getByRole('link', { name: '문서' });
    expect(link).toHaveAttribute('href', '/wiki/other-doc');
  });

  it('테이블을 wrapper와 함께 렌더링한다', () => {
    const markdown = `
| 헤더1 | 헤더2 |
|-------|-------|
| 셀1   | 셀2   |
`;
    render(
      <TestWrapper>
        <MarkdownRenderer content={markdown} />
      </TestWrapper>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('헤더1')).toBeInTheDocument();
    expect(screen.getByText('셀1')).toBeInTheDocument();
  });

  it('이미지를 figure와 함께 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="![설명 텍스트](image.png)" />
      </TestWrapper>
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'image.png');
    expect(image).toHaveAttribute('alt', '설명 텍스트');
    expect(screen.getByText('설명 텍스트')).toBeInTheDocument();
  });

  it('순서 없는 목록을 렌더링한다', () => {
    const markdown = `
- 항목 1
- 항목 2
- 항목 3
`;
    render(
      <TestWrapper>
        <MarkdownRenderer content={markdown} />
      </TestWrapper>
    );

    const list = screen.getByRole('list');
    expect(list).toHaveClass('list-unordered');
    expect(screen.getByText('항목 1')).toBeInTheDocument();
  });

  it('순서 있는 목록을 렌더링한다', () => {
    const markdown = `
1. 첫 번째
2. 두 번째
3. 세 번째
`;
    render(
      <TestWrapper>
        <MarkdownRenderer content={markdown} />
      </TestWrapper>
    );

    const list = screen.getByRole('list');
    expect(list).toHaveClass('list-ordered');
  });

  it('인용문을 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="> 인용문입니다." />
      </TestWrapper>
    );

    const blockquote = screen.getByRole('blockquote');
    expect(blockquote).toHaveClass('blockquote');
    expect(blockquote).toHaveTextContent('인용문입니다.');
  });

  it('수평선을 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="---" />
      </TestWrapper>
    );

    const hr = screen.getByRole('separator');
    expect(hr).toHaveClass('divider');
  });

  it('className prop을 적용한다', () => {
    const { container } = render(
      <TestWrapper>
        <MarkdownRenderer content="테스트" className="custom-class" />
      </TestWrapper>
    );

    expect(container.firstChild).toHaveClass('markdown-content');
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('GFM 체크박스를 렌더링한다', () => {
    const markdown = `
- [ ] 할 일 1
- [x] 완료된 일
`;
    render(
      <TestWrapper>
        <MarkdownRenderer content={markdown} />
      </TestWrapper>
    );

    expect(screen.getByText('할 일 1')).toBeInTheDocument();
    expect(screen.getByText('완료된 일')).toBeInTheDocument();
  });

  it('취소선을 렌더링한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="~~취소된 텍스트~~" />
      </TestWrapper>
    );

    const del = screen.getByText('취소된 텍스트');
    expect(del.tagName).toBe('DEL');
  });

  it('빈 content를 안전하게 처리한다', () => {
    render(
      <TestWrapper>
        <MarkdownRenderer content="" />
      </TestWrapper>
    );

    const container = screen.getByText('', { selector: '.markdown-content' });
    expect(container).toBeInTheDocument();
  });
});
