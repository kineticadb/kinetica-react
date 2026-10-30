import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against both the Vite dev server (React StrictMode on) and the production
// build (what ships; Rolldown bundles the CommonJS dependencies differently). Kinetica itself is
// replaced by a mock in every test (see e2e/kinetica-mock.js), so no server or credentials are needed.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 1000 },
        trace: 'on-first-retry',
    },
    retries: process.env.CI ? 1 : 0,
    projects: [
        { name: 'dev', use: { baseURL: 'http://localhost:4173' } },
        { name: 'build', use: { baseURL: 'http://localhost:4174' } },
    ],
    webServer: [
        {
            command: 'npx vite --port 4173 --strictPort',
            url: 'http://localhost:4173',
            reuseExistingServer: !process.env.CI,
        },
        {
            command: 'npx vite build && npx vite preview --port 4174 --strictPort',
            url: 'http://localhost:4174',
            reuseExistingServer: !process.env.CI,
            timeout: 180000,
        },
    ],
});
