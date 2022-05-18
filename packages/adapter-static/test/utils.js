import child_process from 'child_process';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import * as ports from 'port-authority';
import sirv from 'sirv';
import { chromium } from 'playwright-chromium';
import * as uvu from 'uvu';

/**
 * @typedef {{
 *   cwd: string;
 *   port: number;
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
			const mode = process.env.CI ? 'dist' : 'src';
			const cli_path = fileURLToPath(new URL(`../../kit/${mode}/cli.js`, import.meta.url));

			rimraf(`${cwd}/build`);

			await spawn(`"${process.execPath}" ${cli_path} build`, {
				cwd,
				stdio: 'inherit',
				shell: true
			});

			context.cwd = cwd;
			context.port = await ports.find(4000);
			const handler = sirv(`${cwd}/build`, {
				single: '200.html'
			});
			context.server = await create_server(context.port, handler);

			context.base = `http://localhost:${context.port}`;
			context.browser = await chromium.launch({
				// use stable chrome from host OS instead of downloading one
				// see https://playwright.dev/docs/browsers#google-chrome--microsoft-edge
				channel: 'chrome'
			});
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
