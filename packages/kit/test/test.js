import fs from 'fs';
import glob from 'tiny-glob/sync.js';
import ports from 'port-authority';
import fetch from 'node-fetch';
import { chromium } from 'playwright';
import { dev, build, start, load_config } from '../src/api/index.js';
import { fileURLToPath } from 'url';

async function setup({ port }) {
	const browser = await chromium.launch();
	const page = await browser.newPage();

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
		page,
		contains: async (str) => (await page.innerHTML('body')).includes(str),
		fetch: (url, opts) => fetch(`${base}${url}`, opts),
		capture_requests,

		// these are assumed to have been put in the global scope by the layout
		app: {
			start: () => page.evaluate(() => start()),
			goto: (url) => page.evaluate((url) => goto(url), url),
			prefetch: (url) => page.evaluate((url) => prefetch(url), url),
			prefetchRoutes: () => page.evaluate(() => prefetchRoutes())
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
				response = await context.page.goto(context.base + start);
			}

			await callback({
				...context,
				response,
				js: false
			});
		});

		if (!config.kit.amp) {
			test_fn(`${name} [js]`, async (context) => {
				let response;

				if (start) {
					response = await context.page.goto(context.base + start);
					await context.page.evaluate(() => window.start());
				}

				await callback({
					...context,
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
					renderer: '../../../../../src/renderer/index.js'
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
			glob('**/__tests__.js', { cwd }).map((file) => import(`${cwd}/${file}`))
		);

		const config = await load_config({ cwd });

		await test_dev(app, cwd, config, tests);
		await test_build(app, cwd, config, tests);
	}

	await uvu.exec();
	process.exit(process.exitCode || 0);
}

main();
