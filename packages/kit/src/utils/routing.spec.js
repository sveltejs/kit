import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { exec, parse_route_id } from './routing.js';

const tests = {
	'': {
		pattern: /^\/$/,
		names: [],
		types: []
	},
	blog: {
		pattern: /^\/blog\/?$/,
		names: [],
		types: []
	},
	'blog.json': {
		pattern: /^\/blog\.json$/,
		names: [],
		types: []
	},
	'blog/[slug]': {
		pattern: /^\/blog\/([^/]+?)\/?$/,
		names: ['slug'],
		types: [undefined]
	},
	'blog/[slug].json': {
		pattern: /^\/blog\/([^/]+?)\.json$/,
		names: ['slug'],
		types: [undefined]
	},
	'blog/[[slug]]': {
		pattern: /^\/blog(\/[^/]+)?\/?$/,
		names: ['slug'],
		types: [undefined]
	},
	'blog/[[slug=type]]/sub': {
		pattern: /^\/blog(\/[^/]+)?\/sub\/?$/,
		names: ['slug'],
		types: ['type']
	},
	'blog/[[slug]].json': {
		pattern: /^\/blog\/([^/]*)?\.json$/,
		names: ['slug'],
		types: [undefined]
	},
	'[...catchall]': {
		pattern: /^(?:\/(.*))?\/?$/,
		names: ['catchall'],
		types: [undefined]
	},
	'foo/[...catchall]/bar': {
		pattern: /^\/foo(?:\/(.*))?\/bar\/?$/,
		names: ['catchall'],
		types: [undefined]
	},
	'matched/[id=uuid]': {
		pattern: /^\/matched\/([^/]+?)\/?$/,
		names: ['id'],
		types: ['uuid']
	},
	'%23hash-encoded': {
		pattern: /^\/%23hash-encoded\/?$/,
		names: [],
		types: []
	},
	'%40at-encoded/[id]': {
		pattern: /^\/@at-encoded\/([^/]+?)\/?$/,
		names: ['id'],
		types: [undefined]
	}
};

for (const [key, expected] of Object.entries(tests)) {
	test(`parse_route_id: "${key}"`, () => {
		const actual = parse_route_id(key);

		assert.equal(actual.pattern.toString(), expected.pattern.toString());
		assert.equal(actual.names, expected.names);
		assert.equal(actual.types, expected.types);
	});
}

test('exec extracts params correctly', () => {
	const route_regex = /^\/blog(\/[^/]+)?\/sub([^/]+?)\/?$/;
	{
		const match = route_regex.exec('/blog/123/subparam');
		if (!match) throw new Error('failed to match, test setup is borked');
		assert.equal(exec(match, ['slug', 'param'], [], {}), { slug: '123', param: 'param' });
	}
	{
		const match = route_regex.exec('/blog/subparam');
		if (!match) throw new Error('failed to match, test setup is borked');
		assert.equal(exec(match, ['slug', 'param'], [], {}), { slug: '', param: 'param' });
	}
});

test('errors on bad param name', () => {
	assert.throws(() => parse_route_id('abc/[b-c]'), /Invalid param: b-c/);
	assert.throws(() => parse_route_id('abc/[bc=d-e]'), /Invalid param: bc=d-e/);
});

test.run();
