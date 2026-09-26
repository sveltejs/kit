import { assert, describe, it, vi } from 'vitest';
import { error, redirect } from './index.js';

// an adapter's bundler may resolve `esm-env` with the `browser` condition for server code,
// as wrangler and rolldown do for Cloudflare Workers and Netlify edge functions
vi.mock('esm-env', () => ({ BROWSER: true, DEV: false }));

describe('status validation under the browser condition', () => {
	it('error() rejects statuses outside 400-599', () => {
		for (const status of [undefined, 399, 600]) {
			// @ts-expect-error
			assert.throws(() => error(status, 'x'), /must be between 400 and 599/);
		}
	});

	it('redirect() rejects statuses outside 300-308', () => {
		for (const status of [undefined, 299, 309]) {
			// @ts-expect-error
			assert.throws(() => redirect(status, '/'), /Invalid status code/);
		}
	});
});
