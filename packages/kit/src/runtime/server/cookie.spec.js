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

test('a cookie should not be present after it is deleted', () => {
	const url = new URL('https://example.com');
	const request = new Request(new URL('https://example.com'), {
		headers: new Headers({
			cookie: 'a=b;'
		})
	});
	const { cookies } = get_cookies(request, url);
	assert.equal(cookies.get('a'), 'b');
	cookies.delete('a');
	assert.not(cookies.get('a'));
});

test.run();
