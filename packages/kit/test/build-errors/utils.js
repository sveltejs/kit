import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { stripVTControlCharacters } from 'node:util';
import { assert } from 'vitest';

export const timeout = 60_000;

/**
 * Runs `pnpm build` for one of the apps in `./apps`, which is expected to fail, and returns its
 * output (stdout and stderr, without colours). Fails the test if the build succeeds
 * @param {string} app
 * @param {Record<string, string>} [env] added to `process.env`
 * @returns {string}
 */
export function build(app, env) {
	try {
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps', app),
			stdio: 'pipe',
			timeout,
			env: { ...process.env, ...env }
		});
	} catch (e) {
		const error = /** @type {{ stdout: Buffer; stderr: Buffer }} */ (e);
		return stripVTControlCharacters(`${error.stdout}\n${error.stderr}`);
	}

	assert.fail(`Expected the build of ${app} to fail`);
}
