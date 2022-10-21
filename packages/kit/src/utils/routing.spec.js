import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { exec, parse_route_id } from './routing.js';

const tests = {
	'/': {
		pattern: /^\/$/,
		names: [],
		types: []
	},
	'/blog': {
		pattern: /^\/blog\/?$/,
		names: [],
		types: []
	},
	'/blog.json': {
		pattern: /^\/blog\.json$/,
		names: [],
		types: []
	},
	'/blog/[slug]': {
		pattern: /^\/blog\/([^/]+?)\/?$/,
		names: ['slug'],
		types: [undefined]
	},
	'/blog/[slug].json': {
		pattern: /^\/blog\/([^/]+?)\.json$/,
		names: ['slug'],
		types: [undefined]
	},
	'/blog/[[slug]]': {
		pattern: /^\/blog(?:\/([^/]+))?\/?$/,
		names: ['slug'],
		types: [undefined]
	},
	'/blog/[[slug=type]]/sub': {
		pattern: /^\/blog(?:\/([^/]+))?\/sub\/?$/,
		names: ['slug'],
		types: ['type']
	},
	'/blog/[[slug]].json': {
		pattern: /^\/blog\/([^/]*)?\.json$/,
		names: ['slug'],
		types: [undefined]
	},
	'/[...catchall]': {
		pattern: /^(?:\/(.*))?\/?$/,
		names: ['catchall'],
		types: [undefined]
	},
	'/foo/[...catchall]/bar': {
		pattern: /^\/foo(?:\/(.*))?\/bar\/?$/,
		names: ['catchall'],
		types: [undefined]
	},
	'/matched/[id=uuid]': {
		pattern: /^\/matched\/([^/]+?)\/?$/,
		names: ['id'],
		types: ['uuid']
	},
	'/%23hash-encoded': {
		pattern: /^\/%23hash-encoded\/?$/,
		names: [],
		types: []
	},
	'/%40at-encoded/[id]': {
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

const exec_tests = [
	{
		route: '/blog/[[slug]]/sub[[param]]',
		path: '/blog/sub',
		expected: { slug: '', param: '' }
	},
	{
		route: '/blog/[[slug]]/sub[[param]]',
		path: '/blog/slug/sub',
		expected: { slug: 'slug', param: '' }
	},
	{
		route: '/blog/[[slug]]/sub[[param]]',
		path: '/blog/slug/subparam',
		expected: { slug: 'slug', param: 'param' }
	},
	{
		route: '/blog/[[slug]]/sub[[param]]',
		path: '/blog/subparam',
		expected: { slug: '', param: 'param' }
	},
	{
		route: '/[[slug]]/[...rest]',
		path: '/slug/rest/sub',
		expected: { slug: 'slug', rest: 'rest/sub' }
	},
	{
		route: '/[[slug]]/[...rest]',
		path: '/slug/rest',
		expected: { slug: 'slug', rest: 'rest' }
	},
	{
		route: '/[[slug]]/[...rest]',
		path: '/slug',
		expected: { slug: 'slug', rest: '' }
	},
	{
		route: '/[[slug]]/[...rest]',
		path: '/',
		expected: { slug: '', rest: '' }
	},
	{
		route: '/[...rest]/path',
		path: '/rest/path',
		expected: { rest: 'rest' }
	},
	{
		route: '/[[slug1]]/[[slug2]]',
		path: '/slug1/slug2',
		expected: { slug1: 'slug1', slug2: 'slug2' }
	},
	{
		route: '/[[slug1]]/[[slug2]]',
		path: '/slug1',
		expected: { slug1: 'slug1', slug2: '' }
	}
];

for (const { path, route, expected } of exec_tests) {
	test(`exec extracts params correctly for ${path}`, () => {
		const { pattern, names, types } = parse_route_id(route);
		const match = pattern.exec(path);
		if (!match) throw new Error(`Failed to match ${path}`);
		const actual = exec(match, names, types, {});
		assert.equal(actual, expected);
	});
}

test('errors on bad param name', () => {
	assert.throws(() => parse_route_id('abc/[b-c]'), /Invalid param: b-c/);
	assert.throws(() => parse_route_id('abc/[bc=d-e]'), /Invalid param: bc=d-e/);
});

test.run();
