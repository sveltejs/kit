import { test, expect, vi } from 'vitest';
import { streamFileContent } from './index.js';

const mockedFetch = vi.fn(fetch);

test('stream successfully', async () => {
	const content = 'Hello, world!';
	mockedFetch.mockReturnValueOnce(
		new Promise((resolve) =>
			resolve(new Response(content, { status: 200, headers: { 'Content-Type': 'text/plain' } }))
		)
	);
	const stream = streamFileContent({
		fetch: mockedFetch,
		url: 'http://assets.local/file.txt'
	});
	expect(await new Response(stream).text()).toBe(content);
});

test('stream with 404', async () => {
	mockedFetch.mockReturnValueOnce(
		new Promise((resolve) => resolve(new Response(null, { status: 404, statusText: 'Not Found' })))
	);
	const stream = streamFileContent({
		fetch: mockedFetch,
		url: 'http://assets.local/missing.txt'
	});
	await expect(new Response(stream).text()).rejects.toThrow('404 - Not Found');
});

test('stream with null body', async () => {
	mockedFetch.mockReturnValueOnce(
		new Promise((resolve) => resolve(new Response(null, { status: 204, statusText: 'No Content' })))
	);
	const stream = streamFileContent({
		fetch: mockedFetch,
		url: 'http://assets.local/empty.txt'
	});
	expect(await new Response(stream).text()).toBe('');
});

test('stream with invalid URL', async () => {
	const stream = streamFileContent({
		fetch: mockedFetch,
		url: '/assets.local/invalid.txt'
	});
	await expect(new Response(stream).text()).rejects.toThrow('Invalid URL');
});

test('stream with aborted fetch', async () => {
	const controller = new AbortController();
	// abort with DOMException otherwise will fail in CI
	// see https://github.com/nodejs/node/issues/49557
	controller.abort(new DOMException('Timeout'));
	const stream = streamFileContent({
		fetch: mockedFetch,
		url: 'http://assets.local/abort.txt',
		controller
	});
	await expect(new Response(stream).text()).rejects.toThrow('Timeout');
});

test('cancelled stream should trigger abort signal', async () => {
	const controller = new AbortController();
	mockedFetch.mockReturnValueOnce(new Promise(() => {}));
	const stream = streamFileContent({
		fetch: mockedFetch,
		url: 'http://assets.local/cancel.txt',
		controller
	});
	const abortListener = vi.fn();
	controller.signal.addEventListener('abort', abortListener);
	await stream.cancel('User cancelled');
	expect(abortListener).toHaveBeenCalled();
});
