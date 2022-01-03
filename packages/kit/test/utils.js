import fs from 'fs';
import { test as base } from '@playwright/test';

export const test = base.extend({
	// @ts-expect-error
	app: async ({ page }, use) => {
		// these are assumed to have been put in the global scope by the layout
		use({
			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			goto: (url) => page.evaluate((/** @type {string} */ url) => goto(url), url),

			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			invalidate: (url) => page.evaluate((/** @type {string} */ url) => invalidate(url), url),

			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			prefetch: (url) => page.evaluate((/** @type {string} */ url) => prefetch(url), url),

			/**
			 * @param {string[]} [urls]
			 * @returns {Promise<void>}
			 */
			prefetchRoutes: (urls) =>
				page.evaluate((/** @type {string[]} */ urls) => prefetchRoutes(urls), urls)
		});
	},

	// @ts-expect-error
	back: async ({ page, javaScriptEnabled }, use) => {
		use(async () => {
			if (javaScriptEnabled) {
				await page.evaluate(() => {
					window.navigated = new Promise((fulfil, reject) => {
						const timeout = setTimeout(() => reject(new Error('Timed out')), 2000);
						addEventListener(
							'sveltekit:navigation-end',
							() => {
								clearTimeout(timeout);
								fulfil();
							},
							{ once: true }
						);
					});
				});

				await Promise.all([page.goBack(), page.evaluate(() => window.navigated)]);
			} else {
				return page.goBack().then(() => void 0);
			}
		});
	},

	// @ts-expect-error
	clicknav: async ({ page, javaScriptEnabled, started }, use) => {
		/** @param {string} selector */
		async function clicknav(selector) {
			await started();

			if (javaScriptEnabled) {
				await page.evaluate(() => {
					window.navigated = new Promise((fulfil, reject) => {
						const timeout = setTimeout(() => reject(new Error('Timed out')), 2000);
						addEventListener(
							'sveltekit:navigation-end',
							() => {
								clearTimeout(timeout);
								fulfil();
							},
							{ once: true }
						);
					});
				});

				await Promise.all([page.click(selector), page.evaluate(() => window.navigated)]);
			} else {
				await page.click(selector);
			}
		}

		use(clicknav);
	},

	// @ts-expect-error
	in_view: async ({ page }, use) => {
		/** @param {string} selector */
		async function in_view(selector) {
			// @ts-expect-error
			return page.$eval(selector, async (element) => {
				const { top, bottom } = element.getBoundingClientRect();

				if (top > window.innerHeight || bottom < 0) {
					// slightly more useful feedback than true/false
					return {
						top,
						bottom
					};
				}

				return true;
			});
		}

		use(in_view);
	},

	// @ts-expect-error
	// eslint-disable-next-line
	read_errors: ({}, use) => {
		/** @param {string} path */
		function read_errors(path) {
			const errors =
				fs.existsSync('test/errors.json') &&
				JSON.parse(fs.readFileSync('test/errors.json', 'utf8'));
			return errors[path];
		}

		use(read_errors);
	},

	// @ts-expect-error
	started: async ({ page, javaScriptEnabled }, use) => {
		if (javaScriptEnabled) {
			page.addInitScript({
				content: `
					window.started = new Promise((fulfil, reject) => {
						setTimeout(() => {
							reject(new Error('Timed out'));
						}, 5000);

						addEventListener('sveltekit:start', () => {
							fulfil();
						});
					});
				`
			});
		}

		use(async () => {
			if (javaScriptEnabled) {
				await page.waitForFunction(() => window.started);
			}
		});
	}
});

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	// generous timeouts on CI, especially on windows
	timeout: process.env.CI ? (process.platform === 'win32' ? 45000 : 30000) : 10000,
	webServer: {
		command: process.env.DEV ? 'npm run dev' : 'npm run build && npm run preview',
		port: 3000,
		timeout: 15000 // AMP validator needs a long time to get moving
	},
	workers: 8,
	retries: 3,
	projects: [
		{
			name: `${process.env.DEV ? 'dev' : 'build'}+js`,
			use: {
				javaScriptEnabled: true
			}
		},
		{
			name: `${process.env.DEV ? 'dev' : 'build'}-js`,
			use: {
				javaScriptEnabled: false
			}
		}
	],
	use: {
		screenshot: 'only-on-failure'
	}
};
