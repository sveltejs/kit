import { devices } from '@playwright/test';
import process from 'node:process';
const is_node18 = process.versions.node.startsWith('18.');
/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	// generous timeouts on CI
	timeout: process.env.CI ? 45000 : 15000,
	webServer: is_node18
		? undefined
		: {
				// do not try to build on node18
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
