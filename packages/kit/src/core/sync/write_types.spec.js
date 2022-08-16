import { test } from 'uvu';
import * as assert from 'uvu/assert';
import ts from 'typescript';
import { find_nearest_layout, tweak_types } from './write_types.js';

test('Rewrites types for a TypeScript module', () => {
	const source = `
		export const GET: Get = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(ts, source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		export const GET = ({ params }: Parameters<Get>[0]) => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a JavaScript module with `function`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export function GET({ params }) {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(ts, source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		/** @param {Parameters<import('./$types').Get>[0]} event */
		export function GET({ params }) {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a JavaScript module with `const`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(ts, source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`
		/** @param {Parameters<import('./$types').Get>[0]} event */
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`
	);
});

/** @type {import('types').PageNode[]} */
const nodes = [
	{ component: 'src/routes/+layout.svelte' }, // 0
	{ component: 'src/routes/+layout-named2@default.svelte' }, // 1
	{ component: 'src/routes/+layout-named.svelte' }, // 2
	{
		shared: 'src/routes/+page.js',
		component: 'src/routes/+page@named2.svelte'
	}, // 3
	{
		server: 'src/routes/docs/+layout.server.js',
		component: 'src/routes/docs/+layout.svelte'
	}, // 4
	{ shared: 'src/routes/docs/+page.js' }, // 5
	{
		server: 'src/routes/faq/+page.server.js',
		component: 'src/routes/faq/+page.svelte'
	}, // 6
	{
		shared: 'src/routes/search/+page.js',
		server: 'src/routes/search/+page.server.js',
		component: 'src/routes/search/+page.svelte'
	}, // 7
	{
		server: 'src/routes/docs/[slug]/+page.server.js',
		component: 'src/routes/docs/[slug]/+page.svelte'
	}, // 8
	{
		server: 'src/routes/docs/[slug]/hi/+page.server.js',
		component: 'src/routes/docs/[slug]/hi/+page@named.svelte'
	} // 9
];

test('Finds nearest layout (nested)', () => {
	assert.equal(find_nearest_layout('src/routes', nodes, 8), {
		key: 'docs',
		folder_depth_diff: 1,
		name: ''
	});
});

test('Finds nearest layout (root)', () => {
	assert.equal(find_nearest_layout('src/routes', nodes, 6), {
		key: '',
		folder_depth_diff: 1,
		name: ''
	});
});

test('Finds nearest layout (named)', () => {
	assert.equal(find_nearest_layout('src/routes', nodes, 9), {
		key: '',
		folder_depth_diff: 3,
		name: 'named'
	});
});

test('Finds nearest layout (recursively named)', () => {
	assert.equal(find_nearest_layout('src/routes', nodes, 3), {
		key: '',
		folder_depth_diff: 0,
		name: 'named2'
	});
});

test.run();
