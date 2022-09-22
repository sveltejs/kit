import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('prerenderable routes must be prerendered', () => {
	assert.throws(
		() =>
			execSync('pnpm build', {
				cwd: path.join(process.cwd(), 'apps/prerenderable-not-prerendered'),
				stdio: 'pipe',
				timeout: 15000
			}),
		/.*Route "\[x\]" is marked as prerenderable, but was not prerendered/gs
	);
});

test.run();
