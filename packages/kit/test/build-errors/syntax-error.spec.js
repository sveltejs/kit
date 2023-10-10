import { assert, test } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

test('$lib/*.server.* is not statically importable from the client', () => {
	try {
		execSync('pnpm build', {
			cwd: path.join(process.cwd(), 'apps/syntax-error'),
			stdio: 'pipe',
			timeout: 60000
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
