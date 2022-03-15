import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parse } from './parse.js';

/** @type {import('types').CSRComponentLoader[]} */
const components = [async () => ({}), async () => ({}), async () => ({}), async () => ({})];

test('parses static routes', () => {
	const routes = parse(components, {
		'': [[0, 2], [1]],
		foo: [[0, 3], [1]],
		'foo/[bar]': [[], []],
		'foo/[...bar]/baz': [[], []]
	});

	assert.equal(
		routes.map((r) => r.pattern.toString()),
		[/^\/$/, /^\/foo\/?$/, /^\/foo\/([^/]+?)\/?$/, /^\/foo(?:\/(.*))?\/baz\/?$/].map((pattern) =>
			pattern.toString()
		)
	);
});

test.run();
