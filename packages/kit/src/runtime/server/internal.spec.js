import { expect, test, vi } from 'vitest';
import { stripVTControlCharacters } from 'node:util';

// `__SVELTEKIT_DEV__` is a compile-time flag that is normally replaced by the
// Vite plugin at build time; provide it here so the module can be loaded
/** @type {any} */ (globalThis).__SVELTEKIT_DEV__ = false;

const { format_response } = await import('./internal.js');

test('formats a plain page request', () => {
	expect(
		stripVTControlCharacters(format_response(200, new Request('http://localhost:5173/')))
	).toBe('200 GET /');
});

test('formats a request with a path', () => {
	expect(
		stripVTControlCharacters(format_response(200, new Request('http://localhost:5173/blog/hello')))
	).toBe('200 GET /blog/hello');
});

test('formats a data request', () => {
	expect(
		stripVTControlCharacters(
			format_response(200, new Request('http://localhost:5173/blog/hello/__data.json?sveltekit=1'))
		)
	).toBe('200 GET /blog/hello/__data.json?sveltekit=1');
});

test('formats a route resolution request', () => {
	expect(
		stripVTControlCharacters(
			format_response(200, new Request('http://localhost:5173/blog/hello/__route.js'))
		)
	).toBe('200 GET /blog/hello/__route.js');
});

test('formats a remote function request', () => {
	expect(
		stripVTControlCharacters(
			format_response(200, new Request('http://localhost:5173/_app/remote/abc123?x=1'))
		)
	).toBe('200 GET /_app/remote/abc123?x=1');
});

test('formats an error response', () => {
	expect(
		stripVTControlCharacters(format_response(500, new Request('http://localhost:5173/')))
	).toBe('500 GET /');
});

test('returns a string and does not log to the console', () => {
	const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
	const result = format_response(200, new Request('http://localhost:5173/'));
	expect(typeof result).toBe('string');
	expect(spy).not.toHaveBeenCalled();
	spy.mockRestore();
});
