import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { test as base, devices } from '@playwright/test';

export const test = base.extend({
	app: ({ page }, use) => {
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
			 * @returns {Promise<void>}
			 */
			afterNavigate: () => page.evaluate(() => afterNavigate(() => {})),

			/**
			 * @param {string[]} urls
			 * @returns {Promise<void>}
			 */
			preloadCode: (...urls) => page.evaluate((urls) => preloadCode(...urls), urls),

			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			preloadData: (url) => page.evaluate((/** @type {string} */ url) => preloadData(url), url)
		});
	},

	clicknav: async ({ page, javaScriptEnabled }, use) => {
		/**
		 * @param {string} selector
		 * @param {{ timeout: number }} options
		 */
		async function clicknav(selector, options) {
			const element = page.locator(selector);
			if (javaScriptEnabled) {
				await Promise.all([page.waitForNavigation(options), element.click()]);
			} else {
				await element.click();
			}
		}

		await use(clicknav);
	},

	scroll_to: async ({ page }, use) => {
		/**
		 * @param {number} x
		 * @param {number} y
		 */
		async function scroll_to(x, y) {
			// The browser will do this for us, but we need to do it pre-emptively
			// so that we can check the scroll location.
			// Otherwise, we'd be checking a decimal number against an integer.
			x = Math.trunc(x);
			y = Math.trunc(y);
			const watcher = page.waitForFunction(
				/** @param {{ x: number, y: number }} opt */ (opt) =>
					// check if the scroll position reached the desired or maximum position
					window.scrollX ===
						Math.min(opt.x, document.documentElement.offsetWidth - window.innerWidth) &&
					window.scrollY ===
						Math.min(opt.y, document.documentElement.offsetHeight - window.innerHeight),
				{ x, y }
			);
			await page.evaluate(
				/** @param {{ x: number, y: number }} opt */ (opt) => window.scrollTo(opt.x, opt.y),
				{ x, y }
			);
			await watcher;
		}

		await use(scroll_to);
	},

	in_view: async ({ page }, use) => {
		/** @param {string} selector */
		async function in_view(selector) {
			const box = await page.locator(selector).boundingBox();
			const view = page.viewportSize();
			return box && view && box.y < view.height && box.y + box.height > 0;
		}

		await use(in_view);
	},

	get_computed_style: async ({ page }, use) => {
		/**
		 * @param {string} selector
		 * @param {string} prop
		 */
		function get_computed_style(selector, prop) {
			return page.$eval(
				selector,
				(node, prop) => window.getComputedStyle(node).getPropertyValue(prop),
				prop
			);
		}

		await use(get_computed_style);
	},

	page: async ({ page, javaScriptEnabled }, use) => {
		// automatically wait for kit started event after navigation functions if js is enabled
		const page_navigation_functions = ['goto', 'goBack', 'reload'];
		page_navigation_functions.forEach((fn) => {
			// @ts-expect-error
			const original_page_fn = page[fn];
			if (!original_page_fn) {
				throw new Error(`function does not exist on page: ${fn}`);
			}

			// @ts-expect-error
			async function modified_fn(...args) {
				try {
					const res = await original_page_fn.apply(page, args);
					if (javaScriptEnabled && args[1]?.wait_for_started !== false) {
						await page.waitForSelector('body.started', { timeout: 15000 });
					}
					return res;
				} catch (e) {
					// Exclude this function from the stack trace so that it points to the failing test
					// instead of this file.
					// @ts-expect-error
					Error.captureStackTrace(e, modified_fn);
					throw e;
				}
			}

			// @ts-expect-error
			page[fn] = modified_fn;
		});

		await use(page);
	},

	// eslint-disable-next-line no-empty-pattern
	read_errors: async ({}, use) => {
		/** @param {string} path */
		function read_errors(path) {
			const errors =
				fs.existsSync('test/errors.json') &&
				JSON.parse(fs.readFileSync('test/errors.json', 'utf8'));
			return errors[path];
		}

		await use(read_errors);
	},

	// eslint-disable-next-line no-empty-pattern
	start_server: async ({}, use) => {
		/**
		 * @type {http.Server}
		 */
		let server;

		/**
		 * @type {Set<import('net').Socket>}
		 */
		let sockets;

		/**
		 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
		 */
		async function start_server(handler) {
			if (server) {
				throw new Error('server already started');
			}
			server = http.createServer(handler);

			await new Promise((fulfil) => {
				server.listen(0, 'localhost', () => {
					fulfil(undefined);
				});
			});

			const { port } = /** @type {import('net').AddressInfo} */ (server.address());
			if (!port) {
				throw new Error(`Could not find port from server ${JSON.stringify(server.address())}`);
			}
			sockets = new Set();
			server.on('connection', (socket) => {
				sockets.add(socket);
				socket.on('close', () => {
					sockets.delete(socket);
				});
			});
			return {
				port
			};
		}
		await use(start_server);

		// @ts-expect-error use before set
		if (server) {
			// @ts-expect-error use before set
			if (sockets) {
				sockets.forEach((socket) => {
					if (!socket.destroyed) {
						socket.destroy();
					}
				});
			}

			await new Promise((fulfil, reject) => {
				server.close((err) => {
					if (err) {
						reject(err);
					} else {
						fulfil(undefined);
					}
				});
			});
		}
	},

	// make sure context fixture depends on start server, so setup/teardown order is
	// setup start_server
	// setup context
	// teardown context
	// teardown start_server
	async context({ context, start_server }, use) {
		// just here make sure start_server is referenced, don't call
		if (!start_server) {
			throw new Error('start_server fixture not present');
		}
		await use(context);
		try {
			await context.close();
		} catch (e) {
			console.error('failed to close context fixture', e);
		}
	}
});

const known_devices = {
	chromium: devices['Desktop Chrome'],
	firefox: devices['Desktop Firefox'],
	webkit: devices['Desktop Safari']
};
const test_browser = /** @type {keyof typeof known_devices} */ (
	process.env.KIT_E2E_BROWSER ?? 'chromium'
);

const test_browser_device = known_devices[test_browser];

if (!test_browser_device) {
	throw new Error(
		`invalid test browser specified: KIT_E2E_BROWSER=${
			process.env.KIT_E2E_BROWSER
		}. Allowed values: ${Object.keys(known_devices).join(', ')}`
	);
}

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export const config = {
	forbidOnly: !!process.env.CI,
	// generous timeouts on CI
	timeout: process.env.CI ? 45000 : 15000,
	webServer: {
		command: process.env.DEV ? 'pnpm dev --force' : 'pnpm build && pnpm preview',
		port: process.env.DEV ? 5173 : 4173
	},
	retries: process.env.CI ? 2 : 0,
	projects: [
		{
			name: `${test_browser}-${process.env.DEV ? 'dev' : 'build'}`,
			use: {
				javaScriptEnabled: true
			}
		},
		{
			name: `${test_browser}-${process.env.DEV ? 'dev' : 'build'}-no-js`,
			use: {
				javaScriptEnabled: false
			}
		}
	],
	use: {
		...test_browser_device,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI
		? [
				['dot'],
				[path.resolve(fileURLToPath(import.meta.url), '../github-flaky-warning-reporter.js')]
			]
		: 'list',
	testDir: 'test',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};
