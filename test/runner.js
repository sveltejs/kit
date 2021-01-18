import * as uvu from 'uvu';
import * as ports from 'port-authority';
import fetch from 'node-fetch';
import { chromium } from 'playwright';
import { dev, build, start, load_config } from '@sveltejs/kit/dist/api';
import * as assert from 'uvu/assert';

async function setup({ port }) {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	const defaultTimeout = 500;

	const text = async (selector) => page.textContent(selector, { timeout: defaultTimeout });
	const wait_for_text = async (selector, expectedValue) => {
		await page
			.waitForFunction(
				({ expectedValue, selector }) =>
					document.querySelector(selector) &&
					document.querySelector(selector).textContent === expectedValue,
				{ expectedValue, selector },
				{ timeout: defaultTimeout }
			)
			.catch((e) => {
				if (!e.message.match(/Timeout.*exceeded/)) throw e;
			});

		assert.equal(await text(selector), expectedValue);
	};

	const capture_requests = async (operations) => {
		const requests = [];
		const on_request = (request) => requests.push(request.url());
		page.on('request', on_request);

		try {
			await operations();
		} finally {
			page.off('request', on_request);
		}

		return requests;
	};
	const base = `http://localhost:${port}`;

	// Uncomment this for debugging
	// page.on('console', msg => {
	// 	const type = msg.type();
	// 	const text = msg.text();

	// 	if (text.startsWith('[ESM-HMR]')) return;

	// 	// TODO would be nice if this warning didn't happen
	// 	if (/received an unexpected slot "default"/.test(text)) return;

	// 	(console[type] || console.log).call(console, text);
	// });

	return {
		base,
		visit: (path) => page.goto(base + path),
		contains: async (str) => (await page.innerHTML('body')).includes(str),
		html: async (selector) => await page.innerHTML(selector, { timeout: defaultTimeout }),
		fetch: (url, opts) => fetch(`${base}${url}`, opts),
		text,
		evaluate: (fn) => page.evaluate(fn),
		// these are assumed to have been put in the global scope by the layout
		goto: (url) => page.evaluate((url) => goto(url), url),
		prefetch: (url) => page.evaluate((url) => prefetch(url), url),
		click: (selector, options) => page.click(selector, { timeout: defaultTimeout, ...options }),
		prefetch_routes: () => page.evaluate(() => prefetchRoutes()),
		wait_for_text,
		wait_for_selector: (selector, options) =>
			page.waitForSelector(selector, { timeout: defaultTimeout, ...options }),
		wait_for_function: (fn, arg, options) =>
			page.waitForFunction(fn, arg, { timeout: defaultTimeout, ...options }),
		capture_requests,
		set_extra_http_headers: (headers) => page.setExtraHTTPHeaders(headers),
		pathname: () => page.url().replace(base, ''),
		keyboard: page.keyboard,
		sleep: (ms) => new Promise((f) => setTimeout(f, ms)),
		$: (selector) => page.$(selector)
	};
}

export function runner(callback, options = {}) {
	function run(is_dev, { before, after }) {
		const suite = uvu.suite(is_dev ? 'dev' : 'build');

		suite.before(before);
		suite.after(after);

		const duplicate = (test_fn) => {
			return (name, callback) => {
				test_fn(`${name} [no js]`, async (context) => {
					await callback({
						...context,
						js: false
					});
				});

				if (!options.amp) {
					test_fn(`${name} [js]`, async (context) => {
						await callback({
							...context,
							js: true,
							visit: async (path) => {
								const res = await context.visit(path);
								await context.evaluate(() => window.start());
								return res;
							}
						});
					});
				}
			};
		};

		const test = duplicate(suite);
		test.skip = duplicate(suite.skip);
		test.only = duplicate(suite.only);

		callback(test, is_dev);

		suite.run();
	}

	const config = load_config();

	run(true, {
		async before(context) {
			const port = await ports.find(3000);

			try {
				context.watcher = await dev({ port, config });
				Object.assign(context, await setup({ port }));
			} catch (e) {
				console.log(e.message);
				throw e;
			}
		},
		async after(context) {
			await context.watcher.close();
			if (context.browser) await context.browser.close();
		}
	});

	run(false, {
		async before(context) {
			try {
				const port = await ports.find(3000);

				// TODO implement `svelte start` so we don't need to use an adapter
				await build(config);

				context.server = await start({ port, config });
				Object.assign(context, await setup({ port }));
			} catch (e) {
				// the try-catch is necessary pending https://github.com/lukeed/uvu/issues/80
				console.error(e);
				throw e;
			}
		},
		async after(context) {
			context.server.close();
			if (context.browser) await context.browser.close();
		}
	});
}
