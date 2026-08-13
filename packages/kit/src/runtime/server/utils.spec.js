import { expect, test, vi } from 'vitest';
import { stream_from_iterator } from './utils.js';

const decoder = new TextDecoder();

/** @param {string[]} chunks */
async function* from(chunks) {
	for (const chunk of chunks) {
		await Promise.resolve();
		yield chunk;
	}
}

test('streams encoded chunks and closes when the iterator is done', async () => {
	const reader = stream_from_iterator(from(['one', 'two'])).getReader();

	const first = await reader.read();
	expect(decoder.decode(first.value)).toBe('one');

	const second = await reader.read();
	expect(decoder.decode(second.value)).toBe('two');

	await expect(reader.read()).resolves.toEqual({ value: undefined, done: true });
});

test('cancellation notifies the producer and returns the iterator', async () => {
	let finished = false;
	const oncancel = vi.fn();

	async function* source() {
		try {
			await Promise.resolve();
			yield 'one';
			yield 'two';
		} finally {
			finished = true;
		}
	}

	const reader = stream_from_iterator(source(), oncancel).getReader();
	await reader.read();

	await reader.cancel();

	expect(oncancel).toHaveBeenCalledOnce();
	expect(finished).toBe(true);
});

// https://github.com/sveltejs/kit/issues/16778
test('a value that arrives after cancellation is dropped', async () => {
	/** @type {(result: IteratorResult<string>) => void} */
	let resolve_next = () => {};
	let returned = false;

	/** @type {AsyncIterator<string>} */
	const iterator = {
		next: () => new Promise((resolve) => (resolve_next = resolve)),
		return: () => {
			returned = true;
			return Promise.resolve({ value: undefined, done: true });
		}
	};

	const reader = stream_from_iterator(iterator).getReader();
	const read = reader.read(); // pull is now suspended on `iterator.next()`
	await Promise.resolve();

	await reader.cancel();
	expect(returned).toBe(true);

	// the parked value lands after teardown
	resolve_next({ value: 'late', done: false });
	await new Promise((resolve) => setTimeout(resolve, 0));

	await expect(read).resolves.toEqual({ value: undefined, done: true });
});

test('cancellation tolerates iterators without a return method', async () => {
	/** @type {AsyncIterator<string>} */
	const iterator = { next: () => new Promise(() => {}) };

	const reader = stream_from_iterator(iterator).getReader();
	await Promise.resolve();

	await expect(reader.cancel()).resolves.toBeUndefined();
});
