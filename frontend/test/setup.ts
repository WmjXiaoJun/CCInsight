import { beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Reset storage between tests
beforeEach(() => {
  sessionStorage.removeItem('ccinsight-llm-settings');
  localStorage.removeItem('ccinsight-llm-settings'); // legacy key (migration)
});
