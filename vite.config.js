import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Port 3000, as with Create React App, so existing links and instructions still work
    server: {
        port: 3000,
        strictPort: true,
        // File watching doesn't see edits on some mounted filesystems (e.g. Windows drives under
        // WSL); set VITE_USE_POLLING=true there
        watch: { usePolling: process.env.VITE_USE_POLLING === 'true' },
    },
    preview: { port: 3000, strictPort: true },
    test: {
        // Unit tests only; e2e/ holds the Playwright suite (npm run e2e)
        include: ['src/**/*.test.{js,jsx}'],
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/setupTests.js',
    },
});
