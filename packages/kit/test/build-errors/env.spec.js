import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('$env/dynamic/private is not statically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-dynamic-env'),
				stdio: 'pipe',
				timeout: 60000
			}),
		/.*Cannot import \0\$env\/dynamic\/private into client-side code:.*/gs
	);
});

test('$env/dynamic/private is not dynamically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-dynamic-env-dynamic-import'),
				stdio: 'pipe',
				timeout: 60000
			}),
		/.*Cannot import \0\$env\/dynamic\/private into client-side code:.*/gs
	);
});

test('$env/static/private is not statically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-static-env'),
				stdio: 'pipe',
				timeout: 60000
			}),
		/.*Cannot import \0\$env\/static\/private into client-side code:.*/gs
	);
});

test('$env/static/private is not dynamically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-static-env-dynamic-import'),
				stdio: 'pipe',
				timeout: 60000
			}),
		/.*Cannot import \0\$env\/static\/private into client-side code:.*/gs
	);
});
