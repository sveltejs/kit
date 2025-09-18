import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';

const timeout = 60_000;

const dir = path.dirname(fileURLToPath(import.meta.url));

// ordinarily server-only modules are allowed during testing, since Vitest can't differentiate
/** @type {Record<string, any>} */
const env = { ...process.env, TEST: false };

test('$lib/*.server.* is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(dir, 'apps/server-only-module'),
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
				cwd: path.join(dir, 'apps/server-only-module-dynamic-import'),
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
				cwd: path.join(dir, 'apps/server-only-folder'),
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
				cwd: path.join(dir, 'apps/server-only-folder-dynamic-import'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$lib\/server\/something\/private.js into code that runs in the browser.*/gs
	);
});
