import { execSync } from 'child_process';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import { chromium, webkit, firefox } from 'playwright';
import * as uvu from 'uvu';

const known_browsers = {
	chromium: chromium,
	firefox: firefox,
	webkit: webkit
};
const test_browser_name = /** @type {keyof typeof } */ (process.env.KIT_E2E_BROWSER ?? 'chromium');

const test_browser = known_browsers[test_browser_name];

if (!test_browser) {
	throw new Error(
		`invalid test browser specified: KIT_E2E_BROWSER=${
			process.env.KIT_E2E_BROWSER
		}. Allowed values: ${Object.keys().join(', ')}`
	);
}

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

			try {
				execSync(`npm run build`, { cwd, stdio: 'pipe' });
				console.log(`✅ build successful`);
			} catch (e) {
				console.error(`❌ failed to build ${app}`);
				console.error(`---\nstdout:\n${e.stdout}`);
				console.error(`---\nstderr:\n${e.stderr}`);
				console.groupEnd();
			}

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
			context.browser = await test_browser.launch();
			context.page = await context.browser.newPage();
		} catch (e) {
			// TODO remove unnecessary try-catch https://github.com/lukeed/uvu/pull/61
			console.error(e);
		}
	});

	suite.after(async (context) => {
		if (context.browser) {
			try {
				await context.browser.close();
			} catch (e) {
				console.error('failed to close test browser', e);
			}
		}
		if (context.server) {
			try {
				await context.server.close();
			} catch (e) {
				console.error('failed to close test server', e);
			}
		}
	});

	callback(suite);

	suite.run();
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
