import { devices } from '@playwright/test';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { number_from_env } from '../../../test-utils/index.js';

const serve = fileURLToPath(new URL('../../../test-utils/serve.js', import.meta.url));
const compiled = process.env.COMPILE === 'true';
const port = 4174;

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	timeout: process.env.CI ? 45000 : 15000,
	webServer: {
		// runs the server with production dependencies only to catch imports of dev dependencies
		command: compiled
			? 'bun run --bun build && ./build/server'
			: `node ${serve} --prod=build build preview`,
		env: { MY_CUSTOM_PORT: `${port}` },
		port,
		gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 }
	},
	retries: process.env.CI ? 2 : number_from_env('KIT_E2E_RETRIES', 0),
	projects: [{ name: 'chromium' }],
	use: {
		...devices['Desktop Chrome'],
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
		channel: process.env.KIT_E2E_BROWSER ?? 'chromium'
	},
	workers: process.env.CI ? 2 : number_from_env('KIT_E2E_WORKERS', undefined),
	reporter: 'list',
	testDir: 'test',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};
