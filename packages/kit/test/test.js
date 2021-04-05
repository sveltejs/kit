import fs from 'fs';
import glob from 'tiny-glob/sync.js';
import ports from 'port-authority';
import fetch from 'node-fetch';
import { chromium } from 'playwright-chromium';
import { dev } from '../src/core/dev/index.js';
import { build } from '../src/core/build/index.js';
import { start } from '../src/core/start/index.js';
import { load_config } from '../src/core/load_config/index.js';
import { fileURLToPath, pathToFileURL } from 'url';

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

	const capture_requests = async (operations) => {
		const requests = [];
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

function duplicate(test_fn, config) {
	return (name, start, callback) => {
		if (!callback) {
			// TODO move everything over to new signature
			callback = start;
			start = null;
		}

		test_fn(`${name} [no js]`, async (context) => {
			let response;

			if (start) {
				response = await context.pages.nojs.goto(context.base + start);
			}

			await callback({
				...context,
				page: context.pages.nojs,
				clicknav: (selector) => context.pages.nojs.click(selector),
				response,
				js: false
			});
		});

		if (!config.kit.amp) {
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
					js: true,
					response
				});
			});
		}
	};
}

async function main() {
	globalThis.UVU_DEFER = 1;
	const uvu = await import('uvu');

	const apps = process.env.APP
		? [process.env.APP]
		: fs.readdirSync(new URL('apps', import.meta.url));

	async function test_dev(app, cwd, config, tests) {
		const name = `dev:${app}`;

		// manually replicate uvu global state
		const count = globalThis.UVU_QUEUE.push([name]);
		globalThis.UVU_INDEX = count - 1;

		const suite = uvu.suite(name);

		suite.before(async (context) => {
			const port = await ports.find(3000);

			try {
				context.watcher = await dev({ cwd, port, config });
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

		const test = duplicate(suite, config);
		test.skip = duplicate(suite.skip, config);
		test.only = duplicate(suite.only, config);

		tests.forEach((mod) => {
			mod.default(test, true);
		});

		suite.run();
	}

	async function test_build(app, cwd, config, tests) {
		const name = `build:${app}`;

		// manually replicate uvu global state
		const count = globalThis.UVU_QUEUE.push([name]);
		globalThis.UVU_INDEX = count - 1;

		const suite = uvu.suite(name);

		suite.before(async (context) => {
			try {
				const port = await ports.find(3000);

				await build(config, {
					cwd,
					runtime: '../../../../../src/runtime/server/index.js'
				});

				context.server = await start({ port, config, cwd });
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

		const test = duplicate(suite, config);
		test.skip = duplicate(suite.skip, config);
		test.only = duplicate(suite.only, config);

		tests.forEach((mod) => {
			mod.default(test, false);
		});

		suite.run();
	}

	for (const app of apps) {
		const cwd = fileURLToPath(new URL(`apps/${app}`, import.meta.url));
		const tests = await Promise.all(
			glob('**/__tests__.js', { cwd }).map((file) => import(pathToFileURL(`${cwd}/${file}`)))
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
