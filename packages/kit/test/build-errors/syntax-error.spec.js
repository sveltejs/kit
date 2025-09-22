import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assert, test } from 'vitest';

const timeout = 60_000;

const dir = path.dirname(fileURLToPath(import.meta.url));

test('$lib/*.server.* is not statically importable from the client', { timeout }, () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(dir, 'apps/syntax-error'),
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
