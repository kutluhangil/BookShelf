import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Pure-logic tests stay on the fast node environment; anything that touches
    // the DOM opts in with a `// @vitest-environment jsdom` pragma.
    environment: 'node',
  },
});
