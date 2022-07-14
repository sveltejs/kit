import child_process from 'child_process';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import { chromium } from 'playwright-chromium';
import * as uvu from 'uvu';

/**
 * @typedef {{
 *   cwd: string;
 *   server: import('http').Server;
 *   base: string;
 *   browser: import('playwright-chromium').Browser;
 *   page: import('playwright-chromium').Page;
 * }} TestContext
 */

/**
 * @param {string} app
 * @param {(test: import('uvu').Test<TestContext>) => void} callback
 */
export function run(app, callback) {
	/** @type {import('uvu').Test<TestContext>} */
	const suite = uvu.suite(app);

	suite.before(async (context) => {
		try {
			const cwd = fileURLToPath(new URL(`apps/${app}`, import.meta.url));

			rimraf(`${cwd}/build`);

			await spawn('npm run build', {
				cwd,
				stdio: 'inherit',
				shell: true
			});

			context.cwd = cwd;
			const handler = sirv(`${cwd}/build`, {
				single: '200.html'
			});
			context.server = await create_server(context.port, handler);

			const { port } = /** @type {import('net').AddressInfo} */ (context.server.address());
			if (!port) {
				throw new Error(
					`Could not find port from server ${JSON.stringify(context.server.address())}`
				);
			}

			context.port = port;
			context.base = `http://localhost:${context.port}`;
			context.browser = await chromium.launch();
			context.page = await context.browser.newPage();
		} catch (e) {
			// TODO remove unnecessary try-catch https://github.com/lukeed/uvu/pull/61
			console.error(e);
		}
	});

	suite.after(async (context) => {
		context.server.close();
		context.browser.close();
	});

	callback(suite);

	suite.run();
}

const parameterRegex = new RegExp('"[^"]+"|[\\S]+', 'g');

/**
 * @param {string} str
 * @param {child_process.SpawnOptions} opts
 */
function spawn(str, opts) {
	return new Promise((fulfil, reject) => {
		const [cmd, ...args] = str.match(parameterRegex);

		const child = child_process.spawn(cmd, args, opts);

		child.on('error', reject);

		child.on('exit', () => {
			fulfil();
		});
	});
}

/**
 * @param {number} port
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} handler
 * @returns {Promise<http.Server>}
 */
function create_server(port, handler) {
	return new Promise((fulfil) => {
		const server = http.createServer(handler);
		server.listen(port, () => {
			fulfil(server);
		});
	});
}

/** @param {string} path */
function rimraf(path) {
	(fs.rmSync || fs.rmdirSync)(path, { recursive: true, force: true });
}

export const plugin = process.env.CI
	? (await import('../../kit/dist/vite.js')).sveltekit
	: (await import('../../kit/src/vite/index.js')).sveltekit;
