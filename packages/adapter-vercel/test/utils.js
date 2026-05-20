import { devices } from '@playwright/test';
import process from 'node:process';

if (!process.env.DEPLOYMENT_URL) {
	throw new Error('DEPLOYMENT_URL environment variable is required');
}

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	timeout: process.env.CI ? 45000 : 15000,
	retries: process.env.CI ? 2 : 0,
	projects: [{ name: 'chromium' }],
	use: {
		...devices['Desktop Chrome'],
		baseURL: process.env.DEPLOYMENT_URL,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		channel: 'chromium'
	},
	workers: process.env.CI ? 2 : undefined,
	reporter: 'list',
	testDir: 'test',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};
