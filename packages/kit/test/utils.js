import fs from 'fs';
import http from 'http';
import { test as base, devices } from '@playwright/test';

export const test = base.extend({
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
			prefetchRoutes: (urls) => page.evaluate((urls) => prefetchRoutes(urls), urls)
		});
	},

	clicknav: async ({ page, javaScriptEnabled }, use) => {
		/**
		 * @param {string} selector
		 * @param {{ timeout: number }} options
		 */
		async function clicknav(selector, options) {
			if (javaScriptEnabled) {
				await Promise.all([page.waitForNavigation(options), page.click(selector)]);
			} else {
				await page.click(selector);
			}
		}

		use(clicknav);
	},

	in_view: async ({ page }, use) => {
		/** @param {string} selector */
		async function in_view(selector) {
			const box = await page.locator(selector).boundingBox();
			const view = await page.viewportSize();
			return box && view && box.y < view.height && box.y + box.height > 0;
		}

		use(in_view);
	},

	page: async ({ page, javaScriptEnabled }, use) => {
		// automatically wait for kit started event after navigation functions if js is enabled
		const page_navigation_functions = ['goto', 'goBack', 'reload'];
		page_navigation_functions.forEach((fn) => {
			// @ts-expect-error
			const page_fn = page[fn];
			if (!page_fn) {
				throw new Error(`function does not exist on page: ${fn}`);
			}
			// @ts-expect-error
			page[fn] = async function (...args) {
				const res = await page_fn.call(page, ...args);
				if (javaScriptEnabled) {
					/**
					 * @type {Promise<any>[]}
					 */
					const page_ready_conditions = [page.waitForSelector('body.started', { timeout: 5000 })];
					if (process.env.DEV && fn !== 'goBack') {
						// if it is an spa back, there is no new connect
						page_ready_conditions.push(wait_for_vite_connected_message(page, 5000));
					}
					await Promise.all(page_ready_conditions);
				}
				return res;
			};
		});

		await use(page);
	},

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

const known_devices = {
	chromium: devices['Desktop Chrome'],
	firefox: devices['Desktop Firefox'],
	webkit: devices['Desktop Safari']
};
const test_browser = /** @type {keyof typeof known_devices} */ (
	process.env.KIT_E2E_BROWSER ?? 'chromium'
);

// @ts-expect-error indexed access
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
		command: process.env.DEV ? 'npm run dev' : 'npm run build && npm run preview',
		port: process.env.DEV ? 5173 : 4173
	},
	retries: process.env.CI ? 5 : 0,
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
	workers: process.env.CI ? 2 : undefined
};

/**
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 */
export async function start_server(handler) {
	const server = http.createServer(handler);

	await new Promise((fulfil) => {
		server.listen(0, 'localhost', () => {
			fulfil(undefined);
		});
	});

	const { port } = /** @type {import('net').AddressInfo} */ (server.address());
	if (!port) {
		throw new Error(`Could not find port from server ${JSON.stringify(server.address())}`);
	}

	return {
		port,
		close: () => {
			return new Promise((fulfil, reject) => {
				server.close((err) => {
					if (err) {
						reject(err);
					} else {
						fulfil(undefined);
					}
				});
			});
		}
	};
}

/**
 * wait for the vite client to log "[vite] connected." on browser console
 *
 * @param page {import('@playwright/test').Page}
 * @param timeout {number}
 * @returns {Promise<void>}
 */
async function wait_for_vite_connected_message(page, timeout) {
	// remove once https://github.com/microsoft/playwright/issues/15550 is fixed/released
	if (process.env.KIT_E2E_BROWSER === 'firefox') {
		// crude wait instead of checking the console
		return new Promise((resolve) => setTimeout(resolve, 100));
	}
	// @ts-ignore
	return page.waitForEvent('console', {
		predicate: async (message) => message?.text()?.includes('[vite] connected.'),
		timeout
	});
}
