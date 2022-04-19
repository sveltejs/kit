import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { domain_matches, path_matches } from './cookie.js';

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

test.run();
