import fs from 'fs';
import glob from 'tiny-glob/sync.js';
import ports from 'port-authority';
import fetch from 'node-fetch';
import { chromium } from 'playwright-chromium';
import { dev } from '../src/core/dev/index.js';
import { build } from '../src/core/build/index.js';
import { start } from '../src/core/start/index.js';
import { load_config } from '../src/core/config/index.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { format } from 'util';

/**
 * @param {{ port: number }} opts
 * @returns {Promise<Partial<import('./types').TestContext>>}
 */
async function setup({ port }) {
	const base = `http://localhost:${port}`;

	const browser = await chromium.launch();

	const contexts = {
		js: await browser.newContext({ javaScriptEnabled: true }),
		nojs: await browser.newContext({ javaScriptEnabled: false })
	};

	contexts.js.setDefaultTimeout(5000);
	contexts.nojs.setDefaultTimeout(5000);

	const cookie = {
		name: 'name',
		value: 'SvelteKit',
		domain: base,
		path: '/',
		httpOnly: true
	};

	await contexts.js.addCookies([cookie]);
	await contexts.nojs.addCookies([cookie]);

	const pages = {
		js: await contexts.js.newPage(),
		nojs: await contexts.nojs.newPage()
	};

	pages.js.addInitScript({
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

	/** @param {() => Promise<void>} operations */
	const capture_requests = async (operations) => {
		/** @type {string[]} */
		const requests = [];

		/** @param {import('playwright-chromium').Request} request */
		const on_request = (request) => requests.push(request.url());
		pages.js.on('request', on_request);

		try {
			await operations();
		} finally {
			pages.js.off('request', on_request);
		}

		return requests;
	};

	// Uncomment this for debugging
	// pages.js.on('console', (msg) => {
	// 	const type = msg.type();
	// 	const text = msg.text();

	// 	if (text.startsWith('[ESM-HMR]')) return;

	// 	// TODO would be nice if this warning didn't happen
	// 	if (/received an unexpected slot "default"/.test(text)) return;

	// 	(console[type] || console.log).call(console, text);
	// });

	return {
		base,
		pages,
		/**
		 * @param {import('node-fetch').RequestInfo} url
		 * @param {import('node-fetch').RequestInit | undefined} opts
		 */
		fetch: (url, opts) => fetch(`${base}${url}`, opts),
		capture_requests,

		// these are assumed to have been put in the global scope by the layout
		app: {
			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			goto: (url) => pages.js.evaluate((url) => goto(url), url),

			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			invalidate: (url) => pages.js.evaluate((url) => invalidate(url), url),

			/**
			 * @param {string} url
			 * @returns {Promise<void>}
			 */
			prefetch: (url) => pages.js.evaluate((url) => prefetch(url), url),

			/**
			 * @param {string[]} [urls]
			 * @returns {Promise<void>}
			 */
			prefetchRoutes: (urls) => pages.js.evaluate((urls) => prefetchRoutes(urls), urls)
		},

		reset: () => browser && browser.close()
	};
}

function patch_console() {
	const { error } = console;

	let buffered = '';

	/** @param {any[]} args */
	console.error = (...args) => {
		buffered += format(...args) + '\n';
	};

	return {
		errors: () => {
			const errors = buffered;
			buffered = '';
			return errors;
		},
		unpatch: () => {
			console.error = error;
		}
	};
}

/**
 * @param {import('uvu').Test<import('test').TestContext>} test_fn
 * @param {import('types/config').ValidatedConfig} config
 * @param {boolean} is_build
 * @returns {import('test').TestFunctionBase}
 */
function duplicate(test_fn, config, is_build) {
	return (name, start, callback, { js = true, nojs = true, dev = true, build = true } = {}) => {
		if (is_build) {
			if (!build) return;
		} else {
			if (!dev) return;
		}

		if (process.env.FILTER && !name.includes(process.env.FILTER)) return;

		if (nojs) {
			test_fn(`${name} [no js]`, async (context) => {
				let response;

				if (start) {
					response = await context.pages.nojs.goto(context.base + start);
				}

				await callback({
					...context,
					page: context.pages.nojs,
					clicknav: (selector) => context.pages.nojs.click(selector),
					back: () => context.pages.nojs.goBack().then(() => void 0),
					// @ts-expect-error TODO: fix this and document wtf start is
					response,
					js: false
				});
			});
		}

		if (js && !config.kit.amp) {
			test_fn(`${name} [js]`, async (context) => {
				let response;

				if (start) {
					response = await context.pages.js.goto(context.base + start);
					await context.pages.js.evaluate(() => window.started);
				}

				await callback({
					...context,
					page: context.pages.js,
					clicknav: async (selector) => {
						await context.pages.js.evaluate(() => {
							window.navigated = new Promise((fulfil, reject) => {
								addEventListener('sveltekit:navigation-end', function handler() {
									fulfil();
									removeEventListener('sveltekit:navigation-end', handler);
								});

								setTimeout(() => reject(new Error('Timed out')), 2000);
							});
						});

						await context.pages.js.click(selector);
						await context.pages.js.evaluate(() => window.navigated);
					},
					back: async () => {
						await context.pages.js.evaluate(() => {
							window.navigated = new Promise((fulfil, reject) => {
								addEventListener('sveltekit:navigation-end', function handler() {
									fulfil();
									removeEventListener('sveltekit:navigation-end', handler);
								});

								setTimeout(() => reject(new Error('Timed out')), 2000);
							});
						});

						await context.pages.js.goBack();
						await context.pages.js.evaluate(() => window.navigated);
					},
					js: true,
					// @ts-expect-error TODO: fix this and document wtf start is
					response
				});
			});
		}
	};
}

async function main() {
	// @ts-expect-error
	globalThis.UVU_DEFER = 1;
	const uvu = await import('uvu');

	const apps = process.env.APP
		? [process.env.APP]
		: fs.readdirSync(new URL('apps', import.meta.url));

	/**
	 * @param {string} app
	 * @param {string} cwd
	 * @param {import('types/config').ValidatedConfig} config
	 * @param {any[]} tests
	 */
	async function test_dev(app, cwd, config, tests) {
		const name = `dev:${app}`;

		// manually replicate uvu global state
		// @ts-expect-error
		const count = globalThis.UVU_QUEUE.push([name]);
		// @ts-expect-error
		globalThis.UVU_INDEX = count - 1;

		/** @type {import('uvu').Test<import('./types').TestContext>} */
		const suite = uvu.suite(name);

		suite.before(async (context) => {
			const port = await ports.find(3000);

			try {
				context.watcher = await dev({ cwd, port, config, host: undefined, https: false });
				Object.assign(context, await setup({ port }));
			} catch (e) {
				console.log(e.stack);
				throw e;
			}
		});

		suite.after(async (context) => {
			await context.watcher.close();
			await context.reset();
		});

		suite.before.each((context) => {
			Object.assign(context, patch_console());
		});

		suite.after.each((context) => {
			context.unpatch();
		});

		/** @type {import('test').TestFunction} */
		const test = Object.assign(duplicate(suite, config, false), {
			// @ts-expect-error
			skip: duplicate(suite.skip, config, false),
			// @ts-expect-error
			only: duplicate(suite.only, config, false)
		});

		tests.forEach((mod) => {
			mod.default(test, true);
		});

		suite.run();
	}

	/**
	 * @param {string} app
	 * @param {string} cwd
	 * @param {import('types/config').ValidatedConfig} config
	 * @param {any[]} tests
	 */
	async function test_build(app, cwd, config, tests) {
		const name = `build:${app}`;

		// manually replicate uvu global state
		// @ts-expect-error
		const count = globalThis.UVU_QUEUE.push([name]);
		// @ts-expect-error
		globalThis.UVU_INDEX = count - 1;

		/** @type {import('uvu').Test<import('./types').TestContext>} */
		const suite = uvu.suite(name);

		suite.before(async (context) => {
			try {
				const port = await ports.find(3000);

				await build(config, {
					cwd,
					runtime: '../../../../../src/runtime/server/index.js'
				});

				context.server = await start({ port, config, cwd, host: undefined, https: false });
				Object.assign(context, await setup({ port }));
			} catch (e) {
				// the try-catch is necessary pending https://github.com/lukeed/uvu/issues/80
				console.error(e);
				throw e;
			}
		});

		suite.after(async (context) => {
			context.server.close();
			await context.reset();
		});

		suite.before.each((context) => {
			Object.assign(context, patch_console());
		});

		suite.after.each((context) => {
			context.unpatch();
		});

		/** @type {import('test').TestFunction} */
		const test = Object.assign(duplicate(suite, config, true), {
			// @ts-expect-error
			skip: duplicate(suite.skip, config, true),
			// @ts-expect-error
			only: duplicate(suite.only, config, true)
		});

		tests.forEach((mod) => {
			mod.default(test, false);
		});

		suite.run();
	}

	for (const app of apps) {
		const cwd = fileURLToPath(new URL(`apps/${app}`, import.meta.url));
		const tests = await Promise.all(
			glob('**/_tests.js', { cwd }).map((file) => import(pathToFileURL(`${cwd}/${file}`).href))
		);

		const config = await load_config({ cwd });

		if (process.env.DEV !== 'false') {
			await test_dev(app, cwd, config, tests);
		}

		if (process.env.BUILD !== 'false') {
			await test_build(app, cwd, config, tests);
		}
	}

	await uvu.exec();
	process.exit(process.exitCode || 0);
}

main();
