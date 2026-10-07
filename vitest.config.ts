import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// vite.config.ts 의 '@' 별칭을 테스트에서도 쓰기 위해 같은 설정을 둔다.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
