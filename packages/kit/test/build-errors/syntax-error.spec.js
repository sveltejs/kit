import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const timeout = 60_000;

test('$lib/*.server.* is not statically importable from the client', { timeout }, () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(import.meta.dirname, 'apps/syntax-error'),
			stdio: 'pipe',
			timeout
		});
	} catch (err) {
		const message = /** @type {Error} */ (err).message;
		assert.ok(
			message.includes('Unexpected end of input'),
			`received unexpected exception message ${message}`
		);
		return;
	}
	throw new Error();
});
