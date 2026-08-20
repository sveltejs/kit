import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import { base64_decode, base64_encode, stream_from_iterable, text_encoder } from './utils.js';

const inputs = [
	'hello world',
	'',
	'abcd',
	'the quick brown fox jumps over the lazy dog',
	'工欲善其事，必先利其器'
];

const buffer = globalThis.Buffer;

describe('base64_encode', () => {
	beforeEach(() => {
		// @ts-expect-error
		delete globalThis.Buffer;
	});

	afterEach(() => {
		globalThis.Buffer = buffer;
	});

	test.each(inputs)('%s', (input) => {
		const expected = buffer.from(input).toString('base64');

		const actual = base64_encode(text_encoder.encode(input));
		assert.equal(actual, expected);
	});
});

describe('base64_decode', () => {
	beforeEach(() => {
		// @ts-expect-error
		delete globalThis.Buffer;
	});

	afterEach(() => {
		globalThis.Buffer = buffer;
	});

	test.each(inputs)('%s', (input) => {
		const encoded = buffer.from(input).toString('base64');

		const actual = base64_decode(encoded);
		expect(actual).toEqual(text_encoder.encode(input));
	});
});

describe('stream_from_iterable without ReadableStream.from', () => {
	const from = /** @type {any} */ (ReadableStream).from;

	beforeEach(() => {
		delete (/** @type {any} */ (ReadableStream).from);
	});

	afterEach(() => {
		/** @type {any} */ (ReadableStream).from = from;
	});

	test('streams the iterable', async () => {
		const stream = stream_from_iterable(
			(async function* () {
				yield await Promise.resolve(1);
				yield 2;
			})()
		);

		assert.deepEqual(await Array.fromAsync(stream), [1, 2]);
	});

	test('cancelling the stream ends the iterable', async () => {
		let finished = false;

		const stream = stream_from_iterable(
			(async function* () {
				try {
					yield await Promise.resolve(1);
					yield 2;
				} finally {
					finished = true;
				}
			})()
		);

		const reader = stream.getReader();
		assert.equal((await reader.read()).value, 1);
		await reader.cancel();
		assert.equal(finished, true);
	});
});
