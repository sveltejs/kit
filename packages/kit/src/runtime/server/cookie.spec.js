import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { domain_matches, path_matches, get_cookies } from './cookie.js';

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
		assert.ok(!path_matches(path, constraint));
	});
});

const cookiesSetup = () => {
	const url = new URL('https://example.com');
	const request = new Request(url, {
		headers: new Headers({
			cookie: 'a=b;'
		})
	});
	return get_cookies(request, url);
};

test('a cookie should not be present after it is deleted', () => {
	const { cookies } = cookiesSetup();
	cookies.set('a', 'b');
	assert.equal(cookies.get('a'), 'b');
	cookies.delete('a');
	assert.not(cookies.get('a'));
});

test('default values when set is called', () => {
	const { cookies, new_cookies } = cookiesSetup();
	cookies.set('a', 'b');
	const entry = new_cookies.get('a')?.options;
	assert.equal(entry?.secure, true);
	assert.equal(entry?.httpOnly, true);
	assert.equal(entry?.path, '/');
	assert.equal(entry?.sameSite, 'lax');
});
test('overridden defaults when set is called', () => {
	const { cookies, new_cookies } = cookiesSetup();
	cookies.set('a', 'b', { secure: false, httpOnly: false, sameSite: 'strict', path: '/a/b/c' });
	const entry = new_cookies.get('a')?.options;
	assert.equal(entry?.secure, false);
	assert.equal(entry?.httpOnly, false);
	assert.equal(entry?.path, '/a/b/c');
	assert.equal(entry?.sameSite, 'strict');
});

test('default values when delete is called', () => {
	const { cookies, new_cookies } = cookiesSetup();
	cookies.delete('a');
	const entry = new_cookies.get('a')?.options;
	assert.equal(entry?.secure, true);
	assert.equal(entry?.httpOnly, true);
	assert.equal(entry?.path, '/');
	assert.equal(entry?.sameSite, 'lax');
	assert.equal(entry?.maxAge, 0);
});
test('overridden defaults when delete is called', () => {
	const { cookies, new_cookies } = cookiesSetup();
	cookies.delete('a', { secure: false, httpOnly: false, sameSite: 'strict', path: '/a/b/c' });
	const entry = new_cookies.get('a')?.options;
	assert.equal(entry?.secure, false);
	assert.equal(entry?.httpOnly, false);
	assert.equal(entry?.path, '/a/b/c');
	assert.equal(entry?.sameSite, 'strict');
	assert.equal(entry?.maxAge, 0);
});
test('cannot override maxAge on delete', () => {
	const { cookies, new_cookies } = cookiesSetup();
	cookies.delete('a', { maxAge: 1234 });
	const entry = new_cookies.get('a')?.options;
	assert.equal(entry?.maxAge, 0);
});

test.run();
