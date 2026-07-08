import { describe, expect, test, vi } from 'vitest';
import { SharedIterator } from './shared-iterator.js';

/**
 * @template T
 * @param {AsyncGenerator<T>} iterator
 * @param {number} [timeout_ms]
 */
async function next_with_timeout(iterator, timeout_ms = 100) {
	return Promise.race([
		iterator.next(),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('timeout waiting for next()')), timeout_ms)
		)
	]);
}

describe('SharedIterator', () => {
	test('a single subscriber receives broadcast values', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const iter = shared.subscribe();

		const a = iter.next();
		shared.push(1);
		expect(await a).toEqual({ value: 1, done: false });

		const b = iter.next();
		shared.push(2);
		expect(await b).toEqual({ value: 2, done: false });

		await iter.return();
	});

	test('multiple subscribers see the same pushed values', async () => {
		const shared = /** @type {SharedIterator<string>} */ (new SharedIterator());
		const a = shared.subscribe();
		const b = shared.subscribe();

		const na = a.next();
		const nb = b.next();
		shared.push('hello');
		expect(await na).toEqual({ value: 'hello', done: false });
		expect(await nb).toEqual({ value: 'hello', done: false });

		await a.return();
		await b.return();
	});

	test('initial_value is yielded first to new subscribers', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const iter = shared.subscribe({ initial_value: { value: 42 } });

		expect(await iter.next()).toEqual({ value: 42, done: false });

		const next = iter.next();
		shared.push(43);
		expect(await next).toEqual({ value: 43, done: false });

		await iter.return();
	});

	test('done() signals completion to all subscribers', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const a = shared.subscribe();
		const b = shared.subscribe();

		const na = a.next();
		const nb = b.next();
		shared.done();

		expect(await na).toEqual({ value: undefined, done: true });
		expect(await nb).toEqual({ value: undefined, done: true });
	});

	test('fail() rejects pending and future next() calls with the error', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const a = shared.subscribe();

		const na = a.next();
		const err = new Error('boom');
		shared.fail(err);

		await expect(na).rejects.toBe(err);
	});

	test('new subscribers after fail() reject on first next()', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const err = new Error('boom');
		shared.fail(err);

		const iter = shared.subscribe();
		await expect(iter.next()).rejects.toBe(err);
	});

	test('new subscribers after done() see immediately-done iterator', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		shared.done();

		const iter = shared.subscribe();
		expect(await iter.next()).toEqual({ value: undefined, done: true });
	});

	test('latest-wins backpressure: undrained pending value is overwritten', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const iter = shared.subscribe();

		shared.push(1);
		shared.push(2);
		shared.push(3);

		expect(await iter.next()).toEqual({ value: 3, done: false });

		await iter.return();
	});

	test('start is called when count goes 0 -> 1', () => {
		const start = vi.fn(() => () => undefined);
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator(start));

		expect(start).not.toHaveBeenCalled();
		const a = shared.subscribe();
		expect(start).toHaveBeenCalledTimes(1);

		// Second subscribe doesn't fire the hook again
		const b = shared.subscribe();
		expect(start).toHaveBeenCalledTimes(1);

		void a.return();
		void b.return();
	});

	test('stop is called when count returns to 0', async () => {
		let stop;

		const shared = /** @type {SharedIterator<number>} */ (
			new SharedIterator(() => {
				return (stop = vi.fn());
			})
		);

		const a = shared.subscribe();
		const b = shared.subscribe();

		await a.return();
		expect(stop).not.toHaveBeenCalled();

		await b.return();
		expect(stop).toHaveBeenCalledTimes(1);
	});

	test('iterator.return() resolves a pending next() with done', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const iter = shared.subscribe();

		const pending = iter.next();
		await iter.return();
		expect(await pending).toEqual({ value: undefined, done: true });
	});

	test('iterator.throw() rejects a pending next() with the error', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		const iter = shared.subscribe();

		const pending = iter.next();
		const err = new Error('client-side throw');
		await expect(iter.throw(err)).rejects.toBe(err);
		await expect(pending).rejects.toBe(err);
	});

	test('push() after done() is a no-op', async () => {
		const shared = /** @type {SharedIterator<number>} */ (new SharedIterator());
		shared.done();
		shared.push(1);

		const iter = shared.subscribe();
		expect(await next_with_timeout(iter)).toEqual({ value: undefined, done: true });
	});
});
