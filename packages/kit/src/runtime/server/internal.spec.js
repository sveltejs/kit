/** @import { SSRManifest } from 'types' */
import { expect, test, vi } from 'vitest';
import { stripVTControlCharacters } from 'node:util';

// `__SVELTEKIT_DEV__` is a compile-time flag that is normally replaced by the
// Vite plugin at build time; provide it here so the module can be loaded
/** @type {any} */ (globalThis).__SVELTEKIT_DEV__ = false;

const { format_response } = await import('./internal.js');

const manifest = /** @type {SSRManifest} */ (
	/** @type {unknown} */ ({
		remotes: {
			abc123: () =>
				Promise.resolve({
					default: {
						my_query: {
							__: {
								type: 'query',
								name: 'my_query',
								dev_loc: {
									file: 'file:///tmp/file.js',
									line: 12,
									column: 13
								}
							}
						},
						no_line: {
							__: {
								type: 'command',
								name: 'no_line',
								dev_loc: {
									file: 'file:///tmp/file.js'
								}
							}
						},
						no_loc: {
							__: {
								type: 'command',
								name: 'no_loc'
							}
						}
					}
				})
		}
	})
);

test('formats a plain page request', async () => {
	expect(
		stripVTControlCharacters(
			await format_response(200, new Request('http://localhost:5173/'), manifest)
		)
	).toBe('200 GET /');
});

test('formats a request with a path', async () => {
	expect(
		stripVTControlCharacters(
			await format_response(200, new Request('http://localhost:5173/blog/hello'), manifest)
		)
	).toBe('200 GET /blog/hello');
});

test('formats a data request', async () => {
	expect(
		stripVTControlCharacters(
			await format_response(
				200,
				new Request('http://localhost:5173/blog/hello/__data.json?sveltekit=1'),
				manifest
			)
		)
	).toBe('200 GET /blog/hello/__data.json?sveltekit=1');
});

test('formats a route resolution request', async () => {
	expect(
		stripVTControlCharacters(
			await format_response(
				200,
				new Request('http://localhost:5173/blog/hello/__route.js'),
				manifest
			)
		)
	).toBe('200 GET /blog/hello/__route.js');
});

test('formats a remote function request with manifest missing', async () => {
	expect(
		stripVTControlCharacters(
			await format_response(
				200,
				new Request('http://localhost:5173/_app/remote/abc123/def?x=1', {}),
				manifest
			)
		)
	).toBe('200 GET /_app/remote/abc123/def?x=1');
});

test('formats a remote function request with no location', async () => {
	const res = await format_response(
		200,
		new Request('http://localhost:5173/_app/remote/abc123/no_loc?x=1', {}),
		manifest
	);
	expect(stripVTControlCharacters(res)).toBe('200 GET remote: no_loc() ?x=1');
});

test('formats a remote function request with no line number', async () => {
	const res = await format_response(
		200,
		new Request('http://localhost:5173/_app/remote/abc123/no_line', {}),
		manifest
	);
	expect(stripVTControlCharacters(res)).toBe('200 GET remote: no_line()');
	expect(res).toContain(';file:///tmp/file.js\u0007');
});

test('formats a remote function request with a line number', async () => {
	const res = await format_response(
		200,
		new Request('http://localhost:5173/_app/remote/abc123/my_query', {}),
		manifest
	);
	expect(stripVTControlCharacters(res)).toBe('200 GET remote: my_query()');
	expect(res).toContain(';file:///tmp/file.js#12\u0007');
});

test('formats an error response', async () => {
	expect(
		stripVTControlCharacters(
			await format_response(500, new Request('http://localhost:5173/'), manifest)
		)
	).toBe('500 GET /');
});

test('returns a string and does not log to the console', async () => {
	const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
	const result = await format_response(200, new Request('http://localhost:5173/'), manifest);
	expect(typeof result).toBe('string');
	expect(spy).not.toHaveBeenCalled();
	spy.mockRestore();
});
