import process from 'node:process';
import { assert, expect, test, describe } from 'vitest';
import { domain_matches, path_matches, get_cookies } from './cookie.js';
import { installPolyfills } from '@sveltejs/kit/node/polyfills';

installPolyfills();

const domains = {
	positive: [
		['localhost'],
		['example.com', 'example.com'],
		['sub.example.com', 'example.com'],
		['example.com', '.example.com'],
		['sub.example.com', '.example.com']
	]
};

const paths = {
	positive: [['/'], ['/foo', '/'], ['/foo', '/foo'], ['/foo/', '/foo'], ['/foo', '/foo/']],

	negative: [
		['/', '/foo'],
		['/food', '/foo']
	]
};

/** @param {{ href?: string, headers?: Record<string, string> }} href */
const cookies_setup = ({ href, headers } = {}) => {
	const url = new URL(href || 'https://example.com');
	const request = new Request(url, {
		headers: new Headers({
			cookie: 'a=b;',
			...headers
		})
	});
	const result = get_cookies(request, url);
	result.set_trailing_slash('ignore');
	return result;
};

describe.skipIf(process.env.NODE_ENV === 'production')('cookies in dev', () => {
	test('warns if cookie exceeds 4,129 bytes', () => {
		try {
			const { cookies } = cookies_setup();
			cookies.set('a', 'a'.repeat(4097), { path: '/' });
		} catch (e) {
			const error = /** @type {Error} */ (e);

			assert.equal(error.message, 'Cookie "a" is too large, and will be discarded by the browser');
		}
	});
});

describe.skipIf(process.env.NODE_ENV !== 'production')('cookies in prod', () => {
	domains.positive.forEach(([hostname, constraint]) => {
		test(`${hostname} / ${constraint}`, () => {
			assert.ok(domain_matches(hostname, constraint));
		});
	});

	paths.positive.forEach(([path, constraint]) => {
		test(`${path} / ${constraint}`, () => {
			assert.ok(path_matches(path, constraint));
		});
	});

	paths.negative.forEach(([path, constraint]) => {
		test(`! ${path} / ${constraint}`, () => {
			assert.isFalse(path_matches(path, constraint));
		});
	});

	test('a cookie should not be present after it is deleted', () => {
		const { cookies } = cookies_setup();
		cookies.set('a', 'b', { path: '/' });
		expect(cookies.get('a')).toEqual('b');
		cookies.delete('a', { path: '/' });
		assert.isUndefined(cookies.get('a'));
	});

	test('default values when set is called', () => {
		const { cookies, new_cookies } = cookies_setup();
		cookies.set('a', 'b', { path: '/' });
		const opts = new_cookies.get('/?a')?.options;
		assert.equal(opts?.secure, true);
		assert.equal(opts?.httpOnly, true);
		assert.equal(opts?.path, '/');
		assert.equal(opts?.sameSite, 'lax');
	});

	test('default values when set is called on sub path', () => {
		const { cookies, new_cookies } = cookies_setup({ href: 'https://example.com/foo/bar' });
		cookies.set('a', 'b', { path: '' });
		const opts = new_cookies.get('/foo/bar?a')?.options;
		assert.equal(opts?.secure, true);
		assert.equal(opts?.httpOnly, true);
		assert.equal(opts?.path, '/foo/bar');
		assert.equal(opts?.sameSite, 'lax');
	});

	test('default values when on localhost', () => {
		const { cookies, new_cookies } = cookies_setup({ href: 'http://localhost:1234' });
		cookies.set('a', 'b', { path: '/' });
		const opts = new_cookies.get('/?a')?.options;
		assert.equal(opts?.secure, false);
	});

	test('overridden defaults when set is called', () => {
		const { cookies, new_cookies } = cookies_setup();
		cookies.set('a', 'b', { secure: false, httpOnly: false, sameSite: 'strict', path: '/a/b/c' });
		const opts = new_cookies.get('/a/b/c?a')?.options;
		assert.equal(opts?.secure, false);
		assert.equal(opts?.httpOnly, false);
		assert.equal(opts?.path, '/a/b/c');
		assert.equal(opts?.sameSite, 'strict');
	});

	test('default values when delete is called', () => {
		const { cookies, new_cookies } = cookies_setup();
		cookies.delete('a', { path: '/' });
		const opts = new_cookies.get('/?a')?.options;
		assert.equal(opts?.secure, true);
		assert.equal(opts?.httpOnly, true);
		assert.equal(opts?.path, '/');
		assert.equal(opts?.sameSite, 'lax');
		assert.equal(opts?.maxAge, 0);
	});

	test('overridden defaults when delete is called', () => {
		const { cookies, new_cookies } = cookies_setup();
		cookies.delete('a', { secure: false, httpOnly: false, sameSite: 'strict', path: '/a/b/c' });
		const opts = new_cookies.get('/a/b/c?a')?.options;
		assert.equal(opts?.secure, false);
		assert.equal(opts?.httpOnly, false);
		assert.equal(opts?.path, '/a/b/c');
		assert.equal(opts?.sameSite, 'strict');
		assert.equal(opts?.maxAge, 0);
	});

	test('cannot override maxAge on delete', () => {
		const { cookies, new_cookies } = cookies_setup();
		cookies.delete('a', { path: '/', maxAge: 1234 });
		const opts = new_cookies.get('/?a')?.options;
		assert.equal(opts?.maxAge, 0);
	});

	test('last cookie set with the same name wins', () => {
		const { cookies, new_cookies } = cookies_setup();
		cookies.set('a', 'foo', { path: '/' });
		cookies.set('a', 'bar', { path: '/' });
		const entry = new_cookies.get('/?a');
		assert.equal(entry?.value, 'bar');
	});

	test('cookie names are case sensitive', () => {
		const { cookies, new_cookies } = cookies_setup();
		// not that one should do this, but we follow the spec...
		cookies.set('a', 'foo', { path: '/' });
		cookies.set('A', 'bar', { path: '/' });
		const entrya = new_cookies.get('/?a');
		const entryA = new_cookies.get('/?A');
		assert.equal(entrya?.value, 'foo');
		assert.equal(entryA?.value, 'bar');
	});

	test('serialized cookie header should be url-encoded', () => {
		const href = 'https://example.com';
		const { cookies, get_cookie_header } = cookies_setup({
			href,
			headers: {
				cookie: 'a=f%C3%BC; b=foo+bar' // a=fü
			}
		});
		cookies.set('c', 'fö', { path: '/' }); // should use default encoding
		cookies.set('d', 'fö', { path: '/', encode: () => 'öf' }); // should respect `encode`
		const header = get_cookie_header(new URL(href), 'e=f%C3%A4; f=foo+bar');
		assert.equal(header, 'a=f%C3%BC; b=foo+bar; c=f%C3%B6; d=öf; e=f%C3%A4; f=foo+bar');
	});

	test('get all cookies from header and set calls', () => {
		const { cookies } = cookies_setup();
		expect(cookies.getAll()).toEqual([{ name: 'a', value: 'b' }]);

		cookies.set('a', 'foo', { path: '/' });
		cookies.set('a', 'bar', { path: '/' });
		cookies.set('b', 'baz', { path: '/' });

		expect(cookies.getAll()).toEqual([
			{ name: 'a', value: 'bar' },
			{ name: 'b', value: 'baz' }
		]);
	});

	test("set_internal isn't affected by defaults", () => {
		const { cookies, new_cookies, set_internal } = cookies_setup({
			href: 'https://example.com/a/b/c'
		});

		const options = {
			secure: false,
			httpOnly: false,
			sameSite: /** @type {const} */ ('none'),
			path: '/a/b/c'
		};

		set_internal('test', 'foo', options);

		expect(cookies.get('test')).toEqual('foo');
		expect(new_cookies.get('/a/b/c?test')?.options).toEqual(options);
	});

	test('reproduce issue #13947: multiple cookies with same name but different paths', () => {
		// Test on root path to see if most specific cookie wins
		const { cookies: root_cookies } = cookies_setup({ href: 'https://example.com/' });
		root_cookies.set('key', 'value_root', { path: '/' });
		root_cookies.set('key', 'value_foo', { path: '/foo' });

		// When on root path, should get the root cookie
		expect(root_cookies.get('key')).toEqual('value_root');

		// Test on /foo path to see if more specific cookie wins
		const { cookies: foo_cookies } = cookies_setup({ href: 'https://example.com/foo' });
		foo_cookies.set('key', 'value_root', { path: '/' });
		foo_cookies.set('key', 'value_foo', { path: '/foo' });

		// When on /foo path, should get the more specific /foo cookie
		expect(foo_cookies.get('key')).toEqual('value_foo');
	});

	test('cookies with same name but different domains work correctly', () => {
		// Test setting cookies with different domains (unique key storage should work)
		const { cookies, new_cookies } = cookies_setup({ href: 'https://example.com/' });

		cookies.set('key', 'value1', { path: '/', domain: 'example.com' });
		cookies.set('key', 'value2', { path: '/', domain: 'sub.example.com' });

		// Both cookies should be stored with unique keys
		expect(new_cookies.get('example.com/?key')).toBeDefined();
		expect(new_cookies.get('sub.example.com/?key')).toBeDefined();
		expect(new_cookies.get('example.com/?key')?.value).toEqual('value1');
		expect(new_cookies.get('sub.example.com/?key')?.value).toEqual('value2');
	});

	test('cookie path specificity: more specific paths win', () => {
		const { cookies } = cookies_setup({ href: 'https://example.com/x/y/z' });

		// Set cookies with increasing path specificity
		cookies.set('n', '1', { path: '/' });
		cookies.set('n', '2', { path: '/x' });
		cookies.set('n', '3', { path: '/x/y' });
		cookies.set('n', '4', { path: '/x/y/z' });

		// Most specific path should win
		expect(cookies.get('n')).toEqual('4');
	});

	test('backward compatibility: get without domain/path options still works', () => {
		const { cookies } = cookies_setup();

		// Set a cookie the old way
		cookies.set('old-style', 'value', { path: '/' });

		// Should be retrievable without specifying path
		expect(cookies.get('old-style')).toEqual('value');
	});

	test('getAll should return most specific cookie when multiple cookies have same name', () => {
		// This test demonstrates the bug: getAll doesn't respect path specificity like get() does
		const { cookies } = cookies_setup({ href: 'https://example.com/foo/bar' });

		// Set cookies with the same name but different path specificity
		// Setting most specific first, then less specific ones to expose the bug
		cookies.set('duplicate', 'foobar_value', { path: '/foo/bar' }); // Most specific
		cookies.set('duplicate', 'root_value', { path: '/' }); // Least specific
		cookies.set('duplicate', 'foo_value', { path: '/foo' }); // Middle specificity

		const all = cookies.getAll();
		const duplicate = all.find((c) => c.name === 'duplicate');

		expect(duplicate?.value).toEqual('foobar_value');
	});
});
