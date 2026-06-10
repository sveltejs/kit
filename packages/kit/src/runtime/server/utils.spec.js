import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { handle_fatal_error } from './utils.js';

describe('handle_fatal_error', () => {
	beforeAll(() => {
		// @ts-expect-error build-time global, injected by the Vite plugin in real builds
		globalThis.__SVELTEKIT_DEV__ = false;
	});

	afterAll(() => {
		// @ts-expect-error reset the build-time global so it doesn't leak into other suites
		delete globalThis.__SVELTEKIT_DEV__;
	});

	/** A minimal RequestEvent that negotiates a JSON response so we never hit the HTML error template. */
	function json_event() {
		return /** @type {any} */ ({
			request: new Request('https://example.test', { headers: { accept: 'application/json' } }),
			isDataRequest: false
		});
	}

	test('preserves the status of a native HttpError', async () => {
		const { HttpError } = await import('../../exports/internal/index.js');
		const response = await handle_fatal_error(
			json_event(),
			/** @type {any} */ ({}),
			/** @type {any} */ ({}),
			new HttpError(404, 'Not Found')
		);
		expect(response.status).toBe(404);
	});

	test('preserves the status of a cross-bundle HttpError (name fallback)', async () => {
		// Simulates an HttpError thrown from a different @sveltejs/kit copy (e.g. adapter-node inlining
		// its own bundle): instanceof fails, but .name/.status/.body are intact. Before the fix this was
		// collapsed to a generic Error by coalesce_to_error and reported as 500.
		const foreign = { name: 'HttpError', status: 404, body: { message: 'Not Found' } };
		const response = await handle_fatal_error(
			json_event(),
			/** @type {any} */ ({}),
			/** @type {any} */ ({}),
			foreign
		);
		expect(response.status).toBe(404);
	});

	test('still reports a plain Error as 500', async () => {
		const options = /** @type {any} */ ({ hooks: { handleError: () => undefined } });
		const response = await handle_fatal_error(
			json_event(),
			/** @type {any} */ ({}),
			options,
			new Error('boom')
		);
		expect(response.status).toBe(500);
	});
});
