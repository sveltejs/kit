import fs from 'fs';
import http from 'http';
import * as ports from 'port-authority';
import { test as base } from '@playwright/test';

export const test = base.extend({
	// @ts-expect-error
	app: async ({ page }, use) => {
		// these are assumed to have been put in the global scope by the layout
		use({
			/**
			 * @param {string} url
			 * @param {{ replaceState?: boolean }} opts
			 * @returns {Promise<void>}
			 */
			goto: (url, opts) =>
				page.evaluate(
					(/** @type {{ url: string, opts: { replaceState?: boolean } }} */ { url, opts }) =>
						goto(url, opts),
					{ url, opts }
				),

			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			invalidate: (url) => page.evaluate((/** @type {string} */ url) => invalidate(url), url),

			/**
			 * @param {(url: URL) => void | boolean | Promise<void | boolean>} fn
			 * @returns {Promise<void>}
			 */
			beforeNavigate: (fn) =>
				page.evaluate((/** @type {(url: URL) => any} */ fn) => beforeNavigate(fn), fn),

			/**
			 * @param {() => void} fn
			 * @returns {Promise<void>}
			 */
			afterNavigate: () => page.evaluate(() => afterNavigate(() => {})),

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
	clicknav: async ({ page, javaScriptEnabled }, use) => {
		/** @param {string} selector */
		async function clicknav(selector) {
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
			const box = await page.locator(selector).boundingBox();
			return !!box;
		}

		use(in_view);
	},

	page: async ({ page, javaScriptEnabled }, use) => {
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

		const goto = page.goto;
		page.goto =
			/**
			 * @param {string} url
			 * @param {object}	opts
			 */
			async function (url, opts) {
				const res = await goto.call(page, url, opts);
				if (javaScriptEnabled) {
					await page.waitForFunction(() => window.started);
				}
				return res;
			};
		await use(page);
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
	}
});

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	// generous timeouts on CI
	timeout: process.env.CI ? 45000 : 15000,
	webServer: {
		command: process.env.DEV ? 'npm run dev' : 'npm run build && npm run preview',
		port: 3000
	},
	retries: process.env.CI ? 5 : 0,
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
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	}
};

/**
 *
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @param {number} [start]
 * @returns
 */
export async function start_server(handler, start = 4000) {
	const port = await ports.find(start);

	const server = http.createServer(handler);

	await new Promise((fulfil) => {
		server.listen(port, () => fulfil(undefined));
	});

	return { port, server };
}
