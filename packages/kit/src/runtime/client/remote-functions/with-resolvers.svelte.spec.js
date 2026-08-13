import { describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery and resolves `$app/paths` to a server-side
// virtual module that only exists during a real SvelteKit build.
vi.mock(new URL('../client.js', import.meta.url).pathname, async () => {
	const { HttpError } = await import('@sveltejs/kit/internal');
	return {
		query_map: new Map(),
		query_responses: {},
		live_query_map: new Map(),
		prerender_responses: {},
		_goto: () => {},
		handle_error: (/** @type {any} */ error) =>
			Promise.resolve(
				error instanceof HttpError
					? error.body
					: { message: error?.message ?? String(error), status: 500 }
			)
	};
});

// `prerender.svelte.js` references the `__SVELTEKIT_DEV__` build-time constant at
// module scope; it isn't provided by the unit-test config, so define it here.
/** @type {any} */ (globalThis).__SVELTEKIT_DEV__ = false;

const { Query } = await import('./query/instance.svelte.js');
const { LiveQuery } = await import('./query-live/instance.svelte.js');

/**
 * The client runtime is shipped verbatim to browsers and must not assume
 * `Promise.withResolvers` exists — Vite 8's default build target (Safari 16.4 /
 * Chrome 111) predates it (Safari 17.4 / Chrome 119) and it is not polyfilled.
 * Simulate such a browser by removing the static method for the duration of the
 * callback.
 *
 * @param {() => void | Promise<void>} fn
 */
async function without_with_resolvers(fn) {
	const original = Promise.withResolvers;
	// @ts-expect-error simulating an older browser
	Promise.withResolvers = undefined;
	try {
		await fn();
	} finally {
		Promise.withResolvers = original;
	}
}

async function flush() {
	await tick();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await tick();
}

describe('client remote functions do not require Promise.withResolvers', () => {
	test('Query resolves when Promise.withResolvers is unavailable', async () => {
		await without_with_resolvers(async () => {
			const q = new Query('id/payload', () => Promise.resolve('value'));
			void q.current; // reactive read triggers start() -> #run()
			await flush();
			expect(q.current).toBe('value');
		});
	});

	test('LiveQuery constructs when Promise.withResolvers is unavailable', async () => {
		await without_with_resolvers(() => {
			const instance = new LiveQuery('id', 'id/payload', 'payload');
			expect(instance).toBeInstanceOf(LiveQuery);
		});
	});
});
