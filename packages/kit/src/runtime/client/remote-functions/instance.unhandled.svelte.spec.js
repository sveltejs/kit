/* eslint-disable n/prefer-global/process */
import { describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery and resolves `$app/paths` to a server-side
// virtual module that only exists during a real SvelteKit build. We only need
// the cache `Map`s and a stub `app` for the instances' interactions.
vi.mock(new URL('../client.js', import.meta.url).pathname, () => ({
	app: { hooks: { transport: {} }, decoders: {}, encoders: {} },
	query_map: new Map(),
	query_responses: {},
	live_query_map: new Map(),
	prerender_responses: {},
	goto: () => {}
}));

// `prerender.svelte.js` references the `__SVELTEKIT_DEV__` build-time constant at
// module scope; it isn't provided by the unit-test config, so define it here.
/** @type {any} */ (globalThis).__SVELTEKIT_DEV__ = false;

const { Query } = await import('./query/instance.svelte.js');
const { LiveQuery } = await import('./query-live/instance.svelte.js');
const { prerender } = await import('./prerender.svelte.js');

function track_unhandled() {
	/** @type {unknown[]} */
	const unhandled = [];
	const listener = (/** @type {any} */ reason) => unhandled.push(reason);
	process.on('unhandledRejection', listener);
	return {
		unhandled,
		stop: () => process.off('unhandledRejection', listener)
	};
}

async function flush() {
	await tick();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await tick();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('reactive consumption never produces unhandled rejections', () => {
	test('Query whose fn rejects', async () => {
		const tracker = track_unhandled();
		try {
			const q = new Query('id/payload', () => Promise.reject(new Error('nope')));
			void q.current; // reactive read triggers start()
			await flush();
			expect(q.error).toBeInstanceOf(Error);
			expect(tracker.unhandled).toEqual([]);
		} finally {
			tracker.stop();
		}
	});

	test('LiveQuery.fail without any consumers', async () => {
		const tracker = track_unhandled();
		try {
			const instance = new LiveQuery('id', 'id/payload', 'payload');
			instance.fail(new Error('nope'));
			await flush();
			expect(instance.error).toBeInstanceOf(Error);
			expect(tracker.unhandled).toEqual([]);
		} finally {
			tracker.stop();
		}
	});

	test('Prerender whose fetch rejects', async () => {
		const tracker = track_unhandled();
		const original_fetch = globalThis.fetch;
		globalThis.fetch = () => Promise.reject(new Error('nope'));
		try {
			const resource = prerender('id')(undefined);
			void resource.current; // reactive read, no awaiting
			await flush();
			expect(resource.error).toBeInstanceOf(Error);
			expect(tracker.unhandled).toEqual([]);
		} finally {
			globalThis.fetch = original_fetch;
			tracker.stop();
		}
	});
});
