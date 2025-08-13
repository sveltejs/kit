import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

// ordinarily server-only modules are allowed during testing, since Vitest can't differentiate
/** @type {Record<string, any>} */
const env = { ...process.env, TEST: false };

test('$lib/*.server.* is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-module'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/test.server.js into code that runs in the browser.*/gs
	);
});

test('$lib/*.server.* is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-module-dynamic-import'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/test.server.js into code that runs in the browser.*/gs
	);
});

test('$lib/server/* is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-folder'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/server\/something\/private.js into code that runs in the browser.*/gs
	);
});

test('$lib/server/* is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/server-only-folder-dynamic-import'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/server\/something\/private.js into code that runs in the browser.*/gs
	);
});
