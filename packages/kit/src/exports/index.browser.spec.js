import { assert, test, vi } from 'vitest';
import { error, redirect } from './index.js';

// wrangler and rolldown resolve `esm-env` with the `browser` condition for server code
vi.mock('esm-env', () => ({ BROWSER: true, DEV: false }));

test('statuses are validated under the browser condition', () => {
	for (const status of [undefined, 399, 600]) {
		// @ts-expect-error
		assert.throws(() => error(status, 'x'), /must be between 400 and 599/);
	}
	for (const status of [undefined, 299, 309]) {
		// @ts-expect-error
		assert.throws(() => redirect(status, '/'), /Invalid status code/);
	}
});
