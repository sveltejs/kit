import { describe, expect, test } from 'vitest';
import { getHrefBetween } from './diff-urls.js';

describe('getHrefBetween', () => {
	test.concurrent('two identical urls with different search query', () => {
		const from = new URL('http://localhost:3000');
		const to = new URL('http://localhost:3000?foo=bar');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/?foo=bar');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('two identical urls with different fragment', () => {
		const from = new URL('http://localhost:3000');
		const to = new URL('http://localhost:3000#some-fragment');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/#some-fragment');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('two identical urls with different search query and fragment', () => {
		const from = new URL('http://localhost:3000');
		const to = new URL('http://localhost:3000?foo=bar#some-fragment');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/?foo=bar#some-fragment');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('two identical urls with different protocols', () => {
		const from = new URL('http://localhost:3000');
		const to = new URL('https://localhost:3000');

		const href = getHrefBetween(from, to);

		expect(href).toBe('https://localhost:3000/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test("child page, no trailing slash", () => {
		const from = new URL("http://localhost:5173/en")
		const to = new URL("http://localhost:5173/en/about")

		const href = getHrefBetween(from, to)

		expect(href).toBe("/en/about")
		expect(new URL(href, from).href).toBe(to.href)
	})


	test.concurrent('two identical urls with different hosts', () => {
		const from = new URL('http://localhost:3000');
		const to = new URL('http://localhost:3001');

		const href = getHrefBetween(from, to);

		expect(href).toBe('//localhost:3001/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('two identical urls with different ports', () => {
		const from = new URL('http://localhost:3000');
		const to = new URL('http://localhost:3001');

		const href = getHrefBetween(from, to);

		expect(href).toBe('//localhost:3001/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('get to parents-page', () => {
		const from = new URL('https://example.com/foo/some-page');
		const to = new URL('https://example.com/foo/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/foo/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('get to grand-parents-page', () => {
		const from = new URL('https://example.com/foo/bar/some-page');
		const to = new URL('https://example.com/foo/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/foo/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('get to child page', () => {
		const from = new URL('https://example.com/foo/');
		const to = new URL('https://example.com/foo/some-page/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/foo/some-page/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('get to grand-child page', () => {
		const from = new URL('https://example.com/foo/');
		const to = new URL('https://example.com/foo/bar/some-page');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/foo/bar/some-page');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('get to sibling page, with trailing slash', () => {
		const from = new URL('https://example.com/foo/bar/some-page/');
		const to = new URL('https://example.com/foo/bar/another-page/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/foo/bar/another-page/');
		expect(new URL(href, from).href).toBe(to.href);
	});


	test.concurrent('absolute path is shorter than relative path', () => {
		const from = new URL('https://example.com/foo/bar/some-page');
		const to = new URL('https://example.com/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent('urls with different credentials', () => {
		const from = new URL('https://user:pass1@example.com/some-page');
		const to = new URL('https://user:pass2@example.com/some-page');

		const href = getHrefBetween(from, to);

		expect(href).toBe('//user:pass2@example.com/some-page');
		expect(new URL(href, from).href).toBe(to.href);
	});


	test.concurrent("same credentials, different host", () => {
		const from = new URL('https://user:pass@localhost:3000');
		const to = new URL('https://user:pass@localhost:3001');

		const href = getHrefBetween(from, to);

		expect(href).toBe('//user:pass@localhost:3001/');
		expect(new URL(href, from).href).toBe(to.href);
	})

	test.concurrent("same credentials, different path", () => {
		const from = new URL('https://user:pass@localhost:3000/');
		const to = new URL('https://user:pass@localhost:3000/about');

		const href = getHrefBetween(from, to);

		expect(href).toBe('//user:pass@localhost:3000/about');
		expect(new URL(href, from).href).toBe(to.href);
	})

	test.concurrent("same credentials, different protocol", () => {
		const from = new URL('https://user:pass@localhost:3000/');
		const to = new URL('http://user:pass@localhost:3000/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('http://user:pass@localhost:3000/');
		expect(new URL(href, from).href).toBe(to.href);
	});

	test.concurrent("only username", () => {
		const from = new URL('https://user@localhost:3000/');
		const to = new URL('https://user@localhost:3001/');

		const href = getHrefBetween(from, to);

		expect(href).toBe('//user@localhost:3001/');
		expect(new URL(href, from).href).toBe(to.href);
	});
});
