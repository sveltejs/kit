/* eslint-disable n/prefer-global/process */
import { describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';
import { HandledHttpError, HttpError } from '@sveltejs/kit/internal';

// Mock `client.js` because the real one pulls in the SvelteKit
// router/hydration machinery and resolves `$app/paths` to a server-side
// virtual module that only exists during a real SvelteKit build. We only need
// the cache `Map`s and a stub `app` for the instances' interactions.
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
			expect(q.error).toEqual({ message: 'nope', status: 500 });
			expect(tracker.unhandled).toEqual([]);
		} finally {
			tracker.stop();
		}
	});

	test('LiveQuery.fail without any consumers', async () => {
		const tracker = track_unhandled();
		try {
			const instance = new LiveQuery('id', 'id/payload', 'payload');
			instance.fail(new HttpError({ status: 500, message: 'nope' }));
			await flush();
			expect(instance.error).toEqual({ message: 'nope', status: 500 });
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
			expect(resource.error).toEqual({ message: 'nope', status: 500 });
			expect(tracker.unhandled).toEqual([]);
		} finally {
			globalThis.fetch = original_fetch;
			tracker.stop();
		}
	});
});

describe('Query errors', () => {
	test('a failed newer run rejects superseded awaiters before the first value', async () => {
		const first = Promise.withResolvers();
		const second = Promise.withResolvers();
		let runs = 0;
		const query = new Query('overlap', () => (runs++ === 0 ? first.promise : second.promise));

		const first_result = Promise.resolve(query);
		await tick();
		const second_result = query.refresh();
		second.reject(new Error('nope'));

		const [first_error, second_error] = await Promise.all([
			first_result.catch((error) => error),
			second_result.catch((error) => error)
		]);
		expect(first_error).toBeInstanceOf(HandledHttpError);
		expect(second_error).toBeInstanceOf(HandledHttpError);
		expect(first_error.body).toBe(second_error.body);
		expect(query.ready).toBe(false);
		expect(query.current).toBeUndefined();
	});

	test('fail rejects existing awaiters before the first value', async () => {
		const pending = Promise.withResolvers();
		const query = new Query('fail', () => pending.promise);
		const result = Promise.resolve(query);
		await tick();

		query.fail(new HttpError({ status: 503, message: 'unavailable' }));

		await expect(result).rejects.toMatchObject({
			status: 503,
			body: { message: 'unavailable' }
		});
	});
});

describe('Query.set', () => {
	/** @param {import('./query/instance.svelte.js').Query<any>} query */
	function count_invalidations(query) {
		let runs = 0;
		const destroy = $effect.root(() => {
			$effect.pre(() => {
				runs++;
				void query.then;
			});
		});
		return { runs: () => runs, destroy };
	}

	test('settles a pending request in place instead of replacing its promise', async () => {
		const pending = Promise.withResolvers();
		const query = new Query('set-pending', () => pending.promise);
		const awaiter = count_invalidations(query);
		await tick();
		expect(awaiter.runs()).toBe(1);

		query.set('b');
		expect(await Promise.resolve(query)).toBe('b');
		await tick();
		expect(awaiter.runs()).toBe(1);
		awaiter.destroy();
	});

	test('invalidates awaiters of a settled request', async () => {
		const query = new Query('set-settled', () => Promise.resolve('a'));
		const awaiter = count_invalidations(query);
		expect(await Promise.resolve(query)).toBe('a');
		expect(awaiter.runs()).toBe(1);

		query.set('b');
		await tick();
		expect(awaiter.runs()).toBe(2);
		expect(await Promise.resolve(query)).toBe('b');
		awaiter.destroy();
	});
});
