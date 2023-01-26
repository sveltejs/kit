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
				timeout: 60000
			}),
		/The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:\r?\n  - \/\[x\]/gs
	);
});

test.run();
