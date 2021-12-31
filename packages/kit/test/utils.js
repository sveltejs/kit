import { test as base } from '@playwright/test';

/**
 * @typedef {import('@playwright/test').TestType<
 *   import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions & { baseURL: string },
 *   import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions
 * >} TestType
 * */

export const test = /** @type {TestType} */ (base);

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	timeout: 2000,
	webServer: {
		command: process.env.DEV ? 'npm run dev' : 'npm run build && npm run preview',
		port: 3000,
		timeout: 10000
	}
};
