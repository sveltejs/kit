import { devices } from '@playwright/test';

const major = process.version.slice(1).split('.')[0];
if (major !== '16' && major !== '18') {
	process.exit(0);
}

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	// generous timeouts on CI
	timeout: process.env.CI ? 45000 : 15000,
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173
	},
	retries: process.env.CI ? 2 : 0,
	projects: [
		{
			name: 'chromium'
		}
	],
	use: {
		...devices['Desktop Chrome'],
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	workers: process.env.CI ? 2 : undefined,
	reporter: 'list',
	testDir: 'test',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};
