import * as child_process from 'child_process';
import * as path from 'path';
import * as uvu from 'uvu';
import * as ports from 'port-authority';
import { chromium } from 'playwright';
import { dev, build } from '@sveltejs/kit/dist/api';
import * as assert from 'uvu/assert';

async function setup({ port }) {
	const browser = await chromium.launch();
	const page = await browser.newPage();
		
	const defaultTimeout = 2000;

	const query_text = async (selector) => page.textContent(selector);
	const wait_for_query_text_to_equal = async (selector, expectedValue) => {
		await page
			.waitForFunction(
				({ expectedValue, selector }) =>
					document.querySelector(selector).textContent === expectedValue,
				{ expectedValue, selector },
				{ timeout: defaultTimeout }
			)
			.catch((e) => {
				if (!e.message.match(/Timeout.*exceeded/)) throw e;
			});

		assert.equal(await query_text(selector), expectedValue);
	};

	const capture_requests = async (operations) => {
		const requests = [];
		const on_request = request => requests.push(request.url());
		page.on('request', on_request);

		try {
			await operations();
		} finally {
			page.off('request', on_request);
		}

		return requests;
	};

	return {
		browser,
		page,
		baseUrl: `http://localhost:${port}`,
		visit: (path) => page.goto(`http://localhost:${port}${path}`),
		contains: async (str) => (await page.innerHTML('body')).includes(str),
		query_text,
		evaluate: (fn) => page.evaluate(fn),
		// these are assumed to have been put in the global scope by the layout
		goto: (url) => page.evaluate((url) => goto(url), url),
		prefetch: (url) => page.evaluate((url) => prefetch(url), url),
		click: (selector, options) => page.click(selector, options),
		prefetch_routes: () => page.evaluate(() => prefetchRoutes()),
		// only available if preload calls this.prevent_start()
		start: () => page.evaluate(() => start({
			target: document.querySelector('#svelte') || document.body
		})),
		wait_for_query_text_to_equal,
		wait_for_selector: (selector, options) =>
			page.waitForSelector(selector, { timeout: defaultTimeout, ...options }),
		wait_for_function: (fn, arg, options) =>
			page.waitForFunction(fn, arg, { timeout: defaultTimeout, ...options }),
		capture_requests
	};
}

export function runner(callback) {
	async function run(is_dev, { before, after }) {
		const suite = uvu.suite(is_dev ? 'dev' : 'build');

		suite.before(before);
		suite.after(after);

		callback(suite, is_dev);

		suite.run();
	}

	run(true, {
		async before(context) {
			const port = await ports.find(3000);

			try {
				context.watcher = await dev({ port });
				Object.assign(context, await setup({ port }));
			} catch (e) {
				console.log(e.message);
				throw e;
			}
		},
		async after(context) {
			await context.watcher.close();
			await context.browser.close();
		}
	});

	run(false, {
		async before(context) {
			const port = await ports.find(3000);

			await build({
				// TODO implement `svelte start` so we don't need to use this adapter
				adapter: '@sveltejs/adapter-node'
			});

			// start server
			context.proc = child_process.fork(path.join(process.cwd(), 'build/index.js'), {
				env: {
					PORT: String(port)
				}
			});

			Object.assign(context, await setup({ port }));
		},
		async after(context) {
			if (context.proc) context.proc.kill();
		}
	});
}
