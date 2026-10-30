/* eslint-disable n/prefer-global/process */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';
import { HandledHttpError, HttpError, Redirect } from '@sveltejs/kit/internal';
import { _goto } from '../client.js';

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
		_goto: vi.fn(async () => {}),
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

	test('Query.refresh whose returned promise is ignored', async () => {
		const tracker = track_unhandled();
		try {
			const query = new Query('refresh-error', () => Promise.reject(new Error('nope')));
			void query.refresh();
			await flush();
			expect(query.error).toEqual({ message: 'nope', status: 500 });
			expect(tracker.unhandled).toEqual([]);

			// Awaiting callers must still receive the failure.
			await expect(query.refresh()).rejects.toMatchObject({
				status: 500,
				body: { message: 'nope' }
			});
			await flush();
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

describe('Query redirects', () => {
	beforeEach(() => {
		vi.mocked(_goto).mockClear();
	});

	test('replays cached redirects for awaited and reactive consumers', async () => {
		const fn = vi.fn(
			/** @returns {Promise<string>} */ () => Promise.reject(new Redirect(307, '/target'))
		);
		const query = new Query('redirect', fn);

		const rejected = vi.fn();
		const finalized = vi.fn();
		const consumers = [
			() => Promise.resolve(query),
			() => query.catch(rejected),
			() => query.finally(finalized)
		];

		for (let i = 0; i < consumers.length; i++) {
			await expect(consumers[i]()).resolves.toBeUndefined();
			await flush();
			expect(_goto).toHaveBeenCalledTimes(i + 1);
		}
		expect(rejected).not.toHaveBeenCalled();
		expect(finalized).toHaveBeenCalledTimes(1);

		void query.current;
		await flush();
		expect(_goto).toHaveBeenCalledTimes(4);
		expect(_goto).toHaveBeenLastCalledWith('/target');
		expect(fn).toHaveBeenCalledTimes(1);

		query.set('updated');
		await expect(Promise.resolve(query)).resolves.toBe('updated');
		await flush();
		expect(_goto).toHaveBeenCalledTimes(4);
	});

	test('shares navigation between consumers of a batched redirect', async () => {
		const redirect = new Redirect(307, '/target');
		const first = new Query('batch-a', () => Promise.reject(redirect));
		const second = new Query('batch-b', () => Promise.reject(redirect));

		await expect(Promise.all([first, second, first])).resolves.toEqual([
			undefined,
			undefined,
			undefined
		]);
		await flush();
		expect(_goto).toHaveBeenCalledTimes(1);
	});

	test('a redirect from a newer run also redirects superseded awaiters', async () => {
		const first = Promise.withResolvers();
		const second = Promise.withResolvers();
		let runs = 0;
		const query = new Query('redirect-overlap', () =>
			runs++ === 0 ? first.promise : second.promise
		);

		const first_result = Promise.resolve(query);
		await tick();
		const second_result = query.refresh();
		second.reject(new Redirect(307, '/target'));

		await expect(Promise.all([first_result, second_result])).resolves.toEqual([
			undefined,
			undefined
		]);
		await flush();
		expect(_goto).toHaveBeenCalledTimes(1);

		first.resolve('stale');
		await flush();
		await expect(Promise.resolve(query)).resolves.toBeUndefined();
		expect(_goto).toHaveBeenCalledTimes(2);
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
