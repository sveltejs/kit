import * as path from 'path';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import create_manifest_data from '../create_manifest_data';

test('creates routes', () => {
	const { components, pages, endpoints } = create_manifest_data(path.join(__dirname, 'samples/basic'));

	const index = { name: 'index', file: 'index.svelte', url: '/_app/routes/index.svelte' };
	const about = { name: 'about', file: 'about.svelte', url: '/_app/routes/about.svelte' };
	const blog = { name: 'blog', file: 'blog/index.svelte', url: '/_app/routes/blog/index.svelte' };
	const blog_$slug = { name: 'blog_$slug', file: 'blog/[slug].svelte', url: '/_app/routes/blog/[slug].svelte' };

	assert.equal(components, [
		index,
		about,
		blog,
		blog_$slug
	]);

	assert.equal(pages, [
		{
			path: '/',
			pattern: /^\/$/,
			parts: [
				{ component: index, params: [] }
			]
		},

		{
			path: '/about',
			pattern: /^\/about\/?$/,
			parts: [
				{ component: about, params: [] }
			]
		},

		{
			path: '/blog',
			pattern: /^\/blog\/?$/,
			parts: [
				{ component: blog, params: [] }
			]
		},

		{
			path: null,
			pattern: /^\/blog\/([^/]+?)\/?$/,
			parts: [
				null,
				{ component: blog_$slug, params: ['slug'] }
			]
		}
	]);

	assert.equal(endpoints, [
		{
			name: 'route_index',
			pattern:  /^\/$/,
			file: 'index.js',
			url: '/_app/routes/index.js',
			params: []
		},

		{
			name: 'route_blog_json',
			pattern: /^\/blog\.json$/,
			file: 'blog/index.json.js',
			url: '/_app/routes/blog/index.json.js',
			params: []
		},

		{
			name: 'route_blog_$slug_json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'blog/[slug].json.js',
			url: '/_app/routes/blog/[slug].json.js',
			params: ['slug']
		}
	]);
});

test('encodes invalid characters', () => {
	const { components, pages } = create_manifest_data(path.join(__dirname, 'samples/encoding'));

	// had to remove ? and " because windows

	// const quote = { name: '$34', file: '".svelte', url: '/_app/routes/".svelte' };
	const hash = { name: '$35', file: '#.svelte', url: '/_app/routes/#.svelte' };
	// const question_mark = { name: '$63', file: '?.svelte', url: '/_app/routes/?.svelte' };

	assert.equal(components, [
		// quote,
		hash
		// question_mark
	]);

	assert.equal(pages.map(p => p.pattern), [
		// /^\/%22\/?$/,
		/^\/%23\/?$/
		// /^\/%3F\/?$/
	]);
});

test('allows regex qualifiers', () => {
	const { pages } = create_manifest_data(path.join(__dirname, 'samples/qualifiers'));

	assert.equal(pages.map(p => p.pattern), [
		/^\/([0-9-a-z]{3,})\/?$/,
		/^\/([a-z]{2})\/?$/,
		/^\/([^/]+?)\/?$/
	]);
});

test('sorts routes correctly', () => {
	const { pages } = create_manifest_data(path.join(__dirname, 'samples/sorting'));

	assert.equal(pages.map(p => p.parts.map(part => part && part.component.file)), [
		['index.svelte'],
		['about.svelte'],
		['post/index.svelte'],
		[null, 'post/bar.svelte'],
		[null, 'post/foo.svelte'],
		[null, 'post/f[xx].svelte'],
		[null, 'post/[id([0-9-a-z]{3,})].svelte'],
		[null, 'post/[id].svelte'],
		['[wildcard].svelte'],
		[null, null, null, '[...spread]/deep/[...deep_spread]/xyz.svelte'],
		[null, null, '[...spread]/deep/[...deep_spread]/index.svelte'],
		[null, '[...spread]/deep/index.svelte'],
		[null, '[...spread]/abc.svelte'],
		['[...spread]/index.svelte']
	]);
});

test('ignores files and directories with leading underscores', () => {
	const { endpoints } = create_manifest_data(path.join(__dirname, 'samples/hidden-underscore'));

	assert.equal(endpoints.map(r => r.file), [
		'index.js',
		'e/f/g/h.js'
	]);
});

test('ignores files and directories with leading dots except .well-known', () => {
	const { endpoints } = create_manifest_data(path.join(__dirname, 'samples/hidden-dot'));

	assert.equal(endpoints.map(r => r.file), [
		'.well-known/dnt-policy.txt.js'
	]);
});

test('allows multiple slugs', () => {
	const { endpoints } = create_manifest_data(path.join(__dirname, 'samples/multiple-slugs'));

	assert.equal(endpoints, [
		{
			name: 'route_$file$93_$91ext',
			pattern: /^\/([^/]+?)\.([^/]+?)$/,
			file: '[file].[ext].js',
			url: '/_app/routes/[file].[ext].js',
			params: ['file', 'ext']
		}
	]);
});

test('allows multiple slugs with nested square brackets', () => {
	const { endpoints } = create_manifest_data(path.join(__dirname, 'samples/nested-square-brackets'));

	assert.equal(endpoints, [
		{
			name: 'route_$file_$91ext$40$91a$45z$93$43$41$93',
			pattern: /^\/([a-z]+)\.([a-z]+)$/,
			file: '[file([a-z]+)].[ext([a-z]+)].js',
			url: '/_app/routes/[file([a-z]+)].[ext([a-z]+)].js',
			params: ['file', 'ext']
		}
	]);
});

test('fails on clashes', () => {
	assert.throws(() => {
		create_manifest_data(path.join(__dirname, 'samples/clash-pages'));
	}, /The \[bar\]\/index\.svelte and \[foo\]\.svelte pages clash/);

	assert.throws(() => {
		create_manifest_data(path.join(__dirname, 'samples/clash-routes'));
	}, /The \[bar\]\/index\.js and \[foo\]\.js routes clash/);
});

test('fails if dynamic params are not separated', () => {
	assert.throws(() => {
		create_manifest_data(path.join(__dirname, 'samples/invalid-params'));
	}, /Invalid route \[foo\]\[bar\]\.js — parameters must be separated/);
});

test('errors when trying to use reserved characters in route regexp', () => {
	assert.throws(() => {
		create_manifest_data(path.join(__dirname, 'samples/invalid-qualifier'));
	}, /Invalid route \[foo\(\[a-z\]\(\[0-9\]\)\)\].js — cannot use \(, \), \? or : in route qualifiers/);
});

test('ignores things that look like lockfiles' , () => {
	const { endpoints } = create_manifest_data(path.join(__dirname, 'samples/lockfiles'));

	assert.equal(endpoints, [{
		file: 'foo.js',
		url: '/_app/routes/foo.js',
		name: 'route_foo',
		params: [],
		pattern: /^\/foo\/?$/
	}]);
});

test('works with custom extensions' , () => {
	const { components, pages, endpoints } = create_manifest_data(path.join(__dirname, 'samples/custom-extension'), '.jazz .beebop .funk .svelte');

	const index = { name: 'index', file: 'index.funk', url: '/_app/routes/index.funk' };
	const about = { name: 'about', file: 'about.jazz', url: '/_app/routes/about.jazz' };
	const blog = { name: 'blog', file: 'blog/index.svelte', url: '/_app/routes/blog/index.svelte' };
	const blog_$slug = { name: 'blog_$slug', file: 'blog/[slug].beebop', url: '/_app/routes/blog/[slug].beebop' };

	assert.equal(components, [
		index,
		about,
		blog,
		blog_$slug
	]);

	assert.equal(pages, [
		{
			path: '/',
			pattern: /^\/$/,
			parts: [
				{ component: index, params: [] }
			]
		},

		{
			path: '/about',
			pattern: /^\/about\/?$/,
			parts: [
				{ component: about, params: [] }
			]
		},

		{
			path: '/blog',
			pattern: /^\/blog\/?$/,
			parts: [
				{ component: blog, params: [] }
			]
		},

		{
			path: null,
			pattern: /^\/blog\/([^/]+?)\/?$/,
			parts: [
				null,
				{ component: blog_$slug, params: ['slug'] }
			]
		}
	]);

	assert.equal(endpoints, [
		{
			name: 'route_blog_json',
			pattern: /^\/blog\.json$/,
			file: 'blog/index.json.js',
			url: '/_app/routes/blog/index.json.js',
			params: []
		},
		{
			name: 'route_blog_$slug_json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'blog/[slug].json.js',
			url: '/_app/routes/blog/[slug].json.js',
			params: ['slug']
		}
	]);
});

test.run();
