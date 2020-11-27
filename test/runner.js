import * as child_process from 'child_process';
import * as path from 'path';
import * as uvu from 'uvu';
import { chromium } from 'playwright';
import { dev, build } from '@sveltejs/kit/dist/api';

async function setup({ port }) {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	return {
		browser,
		page,
		visit: path => page.goto(`http://localhost:${port}${path}`),
		contains: async str => (await page.innerHTML('body')).includes(str)
	};
}

export function runner(callback) {
	async function run(is_dev, { before, after }) {
		const suite = uvu.suite(is_dev ? 'dev' : 'build');

		suite.before(before);
		suite.after(after);

		callback(suite);

		suite.run();
	}

	run(true, {
		async before(context) {
			try {
				const port = 3000;

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
			await build({
				// TODO implement `svelte start` so we don't need to use this adapter
				adapter: '@sveltejs/adapter-node'
			});

			const port = 3000;

			// start server
			context.proc = child_process.fork(path.join(process.cwd(), 'build/index.js'), {
				env: {
					PORT: String(port)
				}
			});

			Object.assign(context, await setup({ port }));
		},
		async after(context) {
			context.proc.kill();
		}
	});
}