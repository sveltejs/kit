import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const timeout = 60_000;

test('$lib/*.server.* is not statically importable from the client', { timeout }, () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/syntax-error'),
			stdio: 'pipe',
			timeout
		});
	} catch (err) {
		assert.ok(
			err.message.includes('Unexpected end of input'),
			`received unexpected exception message ${err.message}`
		);
		return;
	}
	throw new Error();
});
