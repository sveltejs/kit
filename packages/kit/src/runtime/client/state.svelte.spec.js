import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { updated, notify_version } from './state.svelte.js';

// Mock `esm-env` so the version-check logic is initialised. In the test env,
// `DEV` is true which would skip the `if (!DEV && ...)` block.
vi.mock('esm-env', () => ({
	BROWSER: true,
	DEV: false
}));

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__', true);
	vi.stubGlobal('__SVELTEKIT_APP_VERSION_FILE__', '_app/version.json');
	vi.stubGlobal('__SVELTEKIT_APP_VERSION_POLL_INTERVAL__', 0);
});

describe('updated', () => {
	beforeEach(() => {
		// reset state between tests
		updated.current = false;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.stubGlobal('__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__', true);
		vi.stubGlobal('__SVELTEKIT_APP_VERSION_POLL_INTERVAL__', 0);
	});

	test('notify_version is a no-op when the version matches', () => {
		// `version` is mocked as '<test>' in the test env
		notify_version('<test>');
		expect(updated.current).toBe(false);
	});

	test('notify_version flips current to true when the version differs', () => {
		notify_version('<new-deployment>');
		expect(updated.current).toBe(true);
	});

	test('notify_version ignores null', () => {
		notify_version(null);
		expect(updated.current).toBe(false);
	});

	test('notify_version ignores empty string', () => {
		notify_version('');
		expect(updated.current).toBe(false);
	});

	test('check() remains available when response header checks are disabled', async () => {
		vi.stubGlobal('__SVELTEKIT_APP_VERSION_CHECKS_ENABLED__', false);
		vi.resetModules();
		vi.stubGlobal('fetch', () =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ version: '<new-deployment>' })
			})
		);

		const { updated } = await import('./state.svelte.js');
		expect(await updated.check()).toBe(true);
		expect(updated.current).toBe(true);
	});

	test('check() fetches version.json and flips current on mismatch', async () => {
		vi.stubGlobal('fetch', () =>
			Promise.resolve({
				ok: true,
				headers: new Headers(),
				json: () => Promise.resolve({ version: '<new-deployment>' })
			})
		);

		const result = await updated.check();
		expect(result).toBe(true);
		expect(updated.current).toBe(true);
	});

	test('check() does not flip current when version matches', async () => {
		vi.stubGlobal('fetch', () =>
			Promise.resolve({
				ok: true,
				headers: new Headers(),
				json: () => Promise.resolve({ version: '<test>' })
			})
		);

		const result = await updated.check();
		expect(result).toBe(false);
		expect(updated.current).toBe(false);
	});

	test('check() returns false on non-ok response', async () => {
		vi.stubGlobal('fetch', () =>
			Promise.resolve({
				ok: false,
				status: 404,
				headers: new Headers(),
				json: () => Promise.resolve({})
			})
		);

		const result = await updated.check();
		expect(result).toBe(false);
		expect(updated.current).toBe(false);
	});

	test('check() continues polling after a check exceeds the interval', async () => {
		vi.useFakeTimers();
		vi.stubGlobal('__SVELTEKIT_APP_VERSION_POLL_INTERVAL__', 10);
		vi.resetModules();

		/** @type {Array<(value: Response) => void>} */
		const resolve_queue = [];
		vi.stubGlobal(
			'fetch',
			() =>
				new Promise((resolve) => {
					resolve_queue.push(resolve);
				})
		);

		const { updated } = await import('./state.svelte.js');
		const first = updated.check();
		expect(resolve_queue).toHaveLength(1);

		await vi.advanceTimersByTimeAsync(20);
		expect(resolve_queue).toHaveLength(1);

		resolve_queue[0](
			new Response(JSON.stringify({ version: '<test>' }), {
				headers: { 'content-type': 'application/json' }
			})
		);
		await first;

		await vi.advanceTimersByTimeAsync(10);
		expect(resolve_queue).toHaveLength(2);

		resolve_queue[1](
			new Response(JSON.stringify({ version: '<test>' }), {
				headers: { 'content-type': 'application/json' }
			})
		);
	});

	test('check() does not run concurrent checks', async () => {
		/** @type {Array<{ resolve: (value: any) => void }>} */
		const resolve_queue = [];

		vi.stubGlobal(
			'fetch',
			() =>
				new Promise((resolve) => {
					resolve_queue.push({
						resolve: () =>
							resolve({
								ok: true,
								headers: new Headers(),
								json: () => Promise.resolve({ version: '<test>' })
							})
					});
				})
		);

		// start two checks concurrently
		const p1 = updated.check();
		const p2 = updated.check();

		// only one fetch should be in-flight
		expect(resolve_queue.length).toBe(1);

		resolve_queue[0].resolve(undefined);

		await Promise.all([p1, p2]);

		// the second check should have returned early with the current value
		// (which is false since the version matched)
		expect(updated.current).toBe(false);
	});
});
