import fs from 'node:fs';
import { afterAll, beforeAll } from 'vitest';
import { build, deploy as copy, location } from './deploy.js';

export { build, leaked_imports } from './deploy.js';

/**
 * Deploys and builds the test app in `dir` before the tests in the current file and removes the
 * copy afterwards
 * @param {string} dir the app's directory in the workspace
 * @param {Record<string, string>} [env]
 * @returns {string} the copy
 */
export function deploy(dir, env) {
	const app = location(dir);

	beforeAll(() => {
		copy(dir);
		build(app, env);
	}, 60_000);

	afterAll(() => fs.rmSync(app, { recursive: true, force: true }));

	return app;
}
