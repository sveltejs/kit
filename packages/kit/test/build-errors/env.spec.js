import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

test('$env/dynamic/private is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-dynamic-env'),
				stdio: 'pipe',
				timeout
			}),
		/.*Cannot import \$env\/dynamic\/private into client-side code:.*/gs
	);
});

test('$env/dynamic/private is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-dynamic-env-dynamic-import'),
				stdio: 'pipe',
				timeout
			}),
		/.*Cannot import \$env\/dynamic\/private into client-side code:.*/gs
	);
});

test('$env/static/private is not statically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-static-env'),
				stdio: 'pipe',
				timeout
			}),
		/.*Cannot import \$env\/static\/private into client-side code:.*/gs
	);
});

test('$env/static/private is not dynamically importable from the client', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-static-env-dynamic-import'),
				stdio: 'pipe',
				timeout
			}),
		/.*Cannot import \$env\/static\/private into client-side code:.*/gs
	);
});

test('$env/dynamic/private is not importable from the service worker', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/service-worker-private-env'),
				stdio: 'pipe',
				timeout: 60000
			}),
		/.*Cannot import \$env\/dynamic\/private into service-worker code.*/gs
	);
});

test('$env/dynamic/public is not importable from the service worker', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/service-worker-dynamic-public-env'),
				stdio: 'pipe',
				timeout
			}),
		/.*Cannot import \$env\/dynamic\/public into service-worker code.*/gs
	);
});
