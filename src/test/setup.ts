import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock fetch for tests
vi.stubGlobal('fetch', vi.fn());

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    BASE_URL: '/',
    MODE: 'test',
  },
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
