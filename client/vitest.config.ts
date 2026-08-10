import { defineConfig } from '.pnpm/vitest@4.1.10_@types+node@26.1.2_vite@8.2.0_@types+node@26.1.2_terser@5.49.0_yaml@2.9.0_/node_modules/vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/core/**/*.test.ts', 'src/store/**/*.test.ts'],
  },
});
