import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('$env/dynamic/private is not statically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-dynamic-env'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \0\$env\/dynamic\/private into public-facing code:.*/gs
	);
});

test('$env/dynamic/private is not dynamically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-dynamic-env-dynamic-import'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \0\$env\/dynamic\/private into public-facing code:.*/gs
	);
});

test('$env/static/private is not statically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-static-env'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \0\$env\/static\/private into public-facing code:.*/gs
	);
});

test('$env/static/private is not dynamically importable from the client', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/private-static-env-dynamic-import'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Cannot import \0\$env\/static\/private into public-facing code:.*/gs
	);
});

test.run();
