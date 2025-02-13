import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

test('Cannot use middleware without experimental flag', { timeout }, () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/experimental-middleware'),
				stdio: 'pipe',
				timeout
			}),
		/.*To use middleware, set `experimental.middleware` to `true`*/gs
	);
});