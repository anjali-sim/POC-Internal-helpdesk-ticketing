import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/test/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Each file gets a fresh module registry so module-level caches (e.g. the
    // system-user id in ticket.auto-assign) never leak between suites.
    isolate: true,
    // mockClear, not mockReset: it forgets calls between tests but keeps the
    // implementations the Prisma mock is built from.
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/server.ts', 'src/types/**'],
    },
  },
});
