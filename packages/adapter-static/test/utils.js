import { devices } from '@playwright/test';
import process from 'node:process';
import { number_from_env } from '../../../test-utils/index.js';

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	// generous timeouts on CI
	timeout: process.env.CI ? 45000 : 15000,
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 5173
	},
	retries: process.env.CI ? 2 : number_from_env('KIT_E2E_RETRIES', 0),
	projects: [
		{
			name: 'chromium'
		}
	],
	use: {
		...devices['Desktop Chrome'],
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		channel: 'chromium'
	},
	workers: process.env.CI ? 2 : number_from_env('KIT_E2E_WORKERS', undefined),
	reporter: 'list',
	testDir: 'test',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};
