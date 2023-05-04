import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { domain_matches, path_matches, get_cookies } from './cookie.js';
import { installPolyfills } from '../../exports/node/polyfills.js';

installPolyfills();

// @ts-expect-error
globalThis.__SVELTEKIT_DEV__ = false;

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
		assert.not(path_matches(path, constraint));
	});
});

/** @param {{ href?: string, headers?: Record<string, string> }} href */
const cookies_setup = ({ href, headers } = {}) => {
	const url = new URL(href || 'https://example.com');
	const request = new Request(url, {
		headers: new Headers({
			cookie: 'a=b;',
			...headers
		})
	});
	return get_cookies(request, url, 'ignore');
};

test('a cookie should not be present after it is deleted', () => {
	const { cookies } = cookies_setup();
	cookies.set('a', 'b');
	assert.equal(cookies.get('a'), 'b');
	cookies.delete('a');
	assert.not(cookies.get('a'));
});

test('default values when set is called', () => {
	const { cookies, new_cookies } = cookies_setup();
	cookies.set('a', 'b');
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.secure, true);
	assert.equal(opts?.httpOnly, true);
	assert.equal(opts?.path, '/');
	assert.equal(opts?.sameSite, 'lax');
});

test('default values when set is called on sub path', () => {
	const { cookies, new_cookies } = cookies_setup({ href: 'https://example.com/foo/bar' });
	cookies.set('a', 'b');
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.secure, true);
	assert.equal(opts?.httpOnly, true);
	assert.equal(opts?.path, '/foo');
	assert.equal(opts?.sameSite, 'lax');
});

test('default values when on localhost', () => {
	const { cookies, new_cookies } = cookies_setup({ href: 'http://localhost:1234' });
	cookies.set('a', 'b');
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.secure, false);
});

test('overridden defaults when set is called', () => {
	const { cookies, new_cookies } = cookies_setup();
	cookies.set('a', 'b', { secure: false, httpOnly: false, sameSite: 'strict', path: '/a/b/c' });
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.secure, false);
	assert.equal(opts?.httpOnly, false);
	assert.equal(opts?.path, '/a/b/c');
	assert.equal(opts?.sameSite, 'strict');
});

test('default values when delete is called', () => {
	const { cookies, new_cookies } = cookies_setup();
	cookies.delete('a');
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.secure, true);
	assert.equal(opts?.httpOnly, true);
	assert.equal(opts?.path, '/');
	assert.equal(opts?.sameSite, 'lax');
	assert.equal(opts?.maxAge, 0);
});

test('overridden defaults when delete is called', () => {
	const { cookies, new_cookies } = cookies_setup();
	cookies.delete('a', { secure: false, httpOnly: false, sameSite: 'strict', path: '/a/b/c' });
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.secure, false);
	assert.equal(opts?.httpOnly, false);
	assert.equal(opts?.path, '/a/b/c');
	assert.equal(opts?.sameSite, 'strict');
	assert.equal(opts?.maxAge, 0);
});

test('cannot override maxAge on delete', () => {
	const { cookies, new_cookies } = cookies_setup();
	cookies.delete('a', { maxAge: 1234 });
	const opts = new_cookies['a']?.options;
	assert.equal(opts?.maxAge, 0);
});

test('last cookie set with the same name wins', () => {
	const { cookies, new_cookies } = cookies_setup();
	cookies.set('a', 'foo');
	cookies.set('a', 'bar');
	const entry = new_cookies['a'];
	assert.equal(entry?.value, 'bar');
});

test('cookie names are case sensitive', () => {
	const { cookies, new_cookies } = cookies_setup();
	// not that one should do this, but we follow the spec...
	cookies.set('a', 'foo');
	cookies.set('A', 'bar');
	const entrya = new_cookies['a'];
	const entryA = new_cookies['A'];
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
	cookies.set('c', 'fö'); // should use default encoding
	cookies.set('d', 'fö', { encode: () => 'öf' }); // should respect `encode`
	const header = get_cookie_header(new URL(href), 'e=f%C3%A4; f=foo+bar');
	assert.equal(header, 'a=f%C3%BC; b=foo+bar; c=f%C3%B6; d=öf; e=f%C3%A4; f=foo+bar');
});

test('warns if cookie exceeds 4,129 bytes', () => {
	// @ts-expect-error
	globalThis.__SVELTEKIT_DEV__ = true;

	try {
		const { cookies } = cookies_setup();
		cookies.set('a', 'a'.repeat(4097));
	} catch (e) {
		const error = /** @type {Error} */ (e);

		assert.equal(error.message, `Cookie "a" is too large, and will be discarded by the browser`);
	}

	// @ts-expect-error
	globalThis.__SVELTEKIT_DEV__ = false;
});

test('get all cookies from header and set calls', () => {
	const { cookies } = cookies_setup();
	assert.equal(cookies.getAll(), [{ name: 'a', value: 'b' }]);

	cookies.set('a', 'foo');
	cookies.set('a', 'bar');
	cookies.set('b', 'baz');

	assert.equal(cookies.getAll(), [
		{ name: 'a', value: 'bar' },
		{ name: 'b', value: 'baz' }
	]);
});

test.run();
