import { devices } from '@playwright/test';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { number_from_env } from '../../../test-utils/index.js';

const serve = fileURLToPath(new URL('../../../test-utils/serve.js', import.meta.url));

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	// generous timeouts on CI
	timeout: process.env.CI ? 45000 : 15000,
	webServer: {
		command: process.env.DEV ? `node ${serve} dev` : `node ${serve} build preview`,
		port: process.env.DEV ? 5173 : 8787,
		// match `wrangler deploy`, which bundles with NODE_ENV=production
		env: { NODE_ENV: 'production' },
		gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 }
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
		channel: 'chrome'
	},
	workers: process.env.CI ? 2 : number_from_env('KIT_E2E_WORKERS', undefined),
	reporter: 'list',
	testDir: 'test',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};
