import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const timeout = 60_000;

/**
 * Run `pnpm build` for the given test app and return the captured stderr output.
 * The build is expected to fail — if it doesn't, the test fails.
 * @param {string} app
 * @returns {string}
 */
function build(app) {
	try {
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps', app),
			stdio: 'pipe',
			timeout
		});
	} catch (e) {
		const error = /** @type {{ stderr: Buffer }} */ (e);
		return stripVTControlCharacters(error.stderr.toString());
	}
	assert.fail('Build should have failed');
}

test('prerenderable routes must be prerendered', { timeout }, () => {
	const stderr = build('prerenderable-not-prerendered');

	assert.match(
		stderr,
		/The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\s+- \/\[x\]/
	);
});

test('entry generators should match their own route', { timeout }, () => {
	const stderr = build('prerender-entry-generator-mismatch');

	assert.match(
		stderr,
		/The entries export from \/\[slug\]\/\[notSpecific\] generated entry \/whatever\/specific, which was matched by \/\[slug\]\/specific/
	);
});

test('an error in a `prerender` function should fail the build', { timeout }, () => {
	const stderr = build('prerender-remote-function-error');

	assert.match(stderr, /remote function blew up/);
});

test('a root +server.js returning non-HTML cannot be prerendered', { timeout }, () => {
	const stderr = build('prerender-root-non-html-server');

	assert.match(stderr, /Cannot prerender a root \+server\.js that returns a non-HTML response/);
});
