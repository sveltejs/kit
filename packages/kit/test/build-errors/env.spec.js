import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

// ordinarily server-only modules are allowed during testing, since Vitest can't differentiate
/** @type {Record<string, any>} */
const env = { ...process.env, TEST: false };

test('$app/env/private is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/env-private'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$app\/env\/private into code that runs in the browser.*/gs
	);
});

test('$app/env/private is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/env-private-dynamic'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$app\/env\/private into code that runs in the browser.*/gs
	);
});

test('$app/env/private is not importable from the service worker', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(import.meta.dirname, 'apps/env-private-service-worker'),
				stdio: 'pipe',
				timeout,
				env
			}),
		/.*Cannot import \$app\/env\/private into service-worker code.*/gs
	);
});
