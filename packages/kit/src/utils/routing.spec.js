import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parse_route_id } from './routing.js';

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
		types: []
	},
	'blog/[slug].json': {
		pattern: /^\/blog\/([^/]+?)\.json$/,
		names: ['slug'],
		types: []
	},
	'[...catchall]': {
		pattern: /^(?:\/(.*))?\/?$/,
		names: ['catchall'],
		types: []
	},
	'foo/[...catchall]/bar': {
		pattern: /^\/foo(?:\/(.*))?\/bar\/?$/,
		names: ['catchall'],
		types: []
	}
};

for (const [key, expected] of Object.entries(tests)) {
	test(`parse_route_id: "${key}"`, () => {
		const actual = parse_route_id(key);

		assert.equal(actual.pattern.toString(), expected.pattern.toString());
	});
}

test.run();
