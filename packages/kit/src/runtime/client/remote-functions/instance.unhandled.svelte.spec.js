/* eslint-disable n/prefer-global/process */
import { describe, expect, test, vi } from 'vitest';
import { tick } from 'svelte';
import { HandledHttpError, HttpError, Redirect } from '@sveltejs/kit/internal';

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

describe('Query refresh failures', () => {
	const transient_errors = [
		new TypeError('Failed to fetch'),
		...[408, 429, 500, 502, 503, 504].map(
			(status) => new HttpError({ status, message: 'unavailable' })
		)
	];
	const terminal_errors = [
		new Redirect(307, '/redirected'),
		...[400, 401, 403, 404].map((status) => new HttpError({ status, message: 'refused' })),
		...[408, 429, 500, 503].map(
			(status) => new HandledHttpError({ status, message: 'application error' })
		)
	];

	test.each(transient_errors)('preserves a value after a transient failure (%o)', async (error) => {
		const fn = vi.fn().mockResolvedValue('value');
		const query = new Query('transient', fn);
		expect(await query).toBe('value');

		fn.mockRejectedValue(error);
		for (let i = 0; i < 2; i++) {
			await expect(query.refresh()).rejects.toBeInstanceOf(HandledHttpError);
			expect(query.error).toBeDefined();
			expect(query.loading).toBe(false);
			expect(query.ready).toBe(true);
			expect(query.current).toBe('value');
			expect(await query).toBe('value');
			expect(await query.catch(() => 'caught')).toBe('value');
			const finally_fn = vi.fn();
			expect(await query.finally(finally_fn)).toBe('value');
			expect(finally_fn).toHaveBeenCalledOnce();
		}

		fn.mockResolvedValue('fresh');
		await query.refresh();
		expect(await query).toBe('fresh');
		expect(query.error).toBeUndefined();
	});

	test.each(transient_errors)('rejects without a successful value (%o)', async (error) => {
		const query = new Query('initial', () => Promise.reject(error));
		await expect(Promise.resolve(query)).rejects.toBeInstanceOf(HandledHttpError);
		expect(query.ready).toBe(false);
	});

	test.each(terminal_errors)(
		'does not resurrect a value after a terminal failure (%o)',
		async (error) => {
			const fn = vi.fn().mockResolvedValue('value');
			const query = new Query('terminal', fn);
			expect(await query).toBe('value');

			fn.mockRejectedValue(error);
			await expect(query.refresh()).rejects.toBeInstanceOf(HandledHttpError);
			await expect(Promise.resolve(query)).rejects.toBeInstanceOf(HandledHttpError);
			expect(query.current).toBe('value');
			expect(query.ready).toBe(true);

			fn.mockRejectedValue(new TypeError('offline'));
			await expect(query.refresh()).rejects.toBeInstanceOf(HandledHttpError);
			await expect(Promise.resolve(query)).rejects.toBeInstanceOf(HandledHttpError);

			// An explicit update makes the value usable again, including during
			// subsequent transport failures.
			query.set('updated');
			await expect(query.refresh()).rejects.toBeInstanceOf(HandledHttpError);
			expect(await query).toBe('updated');
		}
	);

	test('a server-driven failure invalidates the previous value', async () => {
		const query = new Query(
			'fail-after-value',
			/** @returns {Promise<string>} */ () => Promise.reject(new TypeError('offline'))
		);
		query.set('value');
		query.fail(new HandledHttpError({ status: 503, message: 'application error' }));
		await expect(query.refresh()).rejects.toBeInstanceOf(HandledHttpError);
		await expect(Promise.resolve(query)).rejects.toBeInstanceOf(HandledHttpError);
	});

	test('undefined is a successful value', async () => {
		const query = new Query(
			'undefined-value',
			/** @returns {Promise<undefined>} */ () => Promise.reject(new TypeError('offline'))
		);
		query.set(undefined);
		await expect(query.refresh()).rejects.toBeInstanceOf(HandledHttpError);
		expect(await query).toBeUndefined();
		expect(query.ready).toBe(true);
	});

	for (const terminal of [false, true]) {
		test(`a superseding ${terminal ? 'terminal' : 'transient'} failure settles pending value consumers`, async () => {
			const first = Promise.withResolvers();
			const second = Promise.withResolvers();
			let runs = 0;
			const query = new Query('refresh-overlap', () =>
				runs++ === 0 ? first.promise : second.promise
			);
			query.set('value');
			const first_refresh = query.refresh();
			const first_result = Promise.resolve(query).catch((error) => error);
			await tick();
			const second_refresh = query.refresh();
			second.reject(
				terminal
					? new HandledHttpError({ status: 404, message: 'deleted' })
					: new TypeError('offline')
			);
			await expect(second_refresh).rejects.toBeInstanceOf(HandledHttpError);
			await first_refresh;
			const result = await first_result;
			if (terminal) {
				expect(result).toBeInstanceOf(HandledHttpError);
			} else {
				expect(result).toBe('value');
			}
			first.resolve('obsolete');
			await flush();
			expect(query.current).toBe('value');
		});
	}
});
