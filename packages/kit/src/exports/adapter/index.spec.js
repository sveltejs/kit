import { test, expect, vi } from 'vitest';
import { fetchFile } from './index.js';

const mockedFetch = vi.fn(fetch);

test('stream successfully', async () => {
	const content = 'Hello, world!';
	mockedFetch.mockReturnValueOnce(
		new Promise((resolve) =>
			resolve(new Response(content, { status: 200, headers: { 'Content-Type': 'text/plain' } }))
		)
	);
	const stream = fetchFile({
		fetch: mockedFetch,
		origin: 'http://assets.local',
		file: 'file.txt'
	});
	expect(await new Response(stream).text()).toBe(content);
});

test('stream with 404', async () => {
	mockedFetch.mockReturnValueOnce(
		new Promise((resolve) => resolve(new Response(null, { status: 404, statusText: 'Not Found' })))
	);
	const stream = fetchFile({
		fetch: mockedFetch,
		origin: 'http://assets.local',
		file: 'missing.txt'
	});
	await expect(new Response(stream).text()).rejects.toThrow('404 Not Found');
});

test('stream with null body', async () => {
	mockedFetch.mockReturnValueOnce(
		new Promise((resolve) => resolve(new Response(null, { status: 204, statusText: 'No Content' })))
	);
	const stream = fetchFile({
		fetch: mockedFetch,
		origin: 'http://assets.local',
		file: 'empty.txt'
	});
	expect(await new Response(stream).text()).toBe('');
});

test('stream with invalid URL', async () => {
	const stream = fetchFile({
		fetch: mockedFetch,
		origin: 'assets.local',
		file: 'invalid.txt'
	});
	await expect(new Response(stream).text()).rejects.toThrow('Failed to parse URL');
});

test('stream with aborted fetch', async () => {
	const controller = new AbortController();
	// abort with DOMException otherwise will fail in CI
	// see https://github.com/nodejs/node/issues/49557
	controller.abort(new DOMException('Timeout'));
	const stream = fetchFile({
		fetch: (input, init) => fetch(input, { ...init, signal: controller.signal }),
		origin: 'http://assets.local',
		file: 'abort.txt'
	});
	await expect(new Response(stream).text()).rejects.toThrow('Timeout');
});

test('cancelled stream should trigger abort signal', async () => {
	mockedFetch.mockReturnValueOnce(new Promise(() => {}));
	/** @type {AbortSignal | null | undefined} */
	let signal;
	const stream = fetchFile({
		fetch: (input, init) => {
			signal = init?.signal;
			return mockedFetch(input, init);
		},
		origin: 'http://assets.local',
		file: 'cancel.txt'
	});
	await stream.cancel('User cancelled');
	expect(signal?.aborted).toBe(true);
});
