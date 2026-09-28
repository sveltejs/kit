import { assert, expect, test } from 'vitest';
import {
	collect_matcher_names,
	load_and_validate_params,
	validate_param_matchers
} from './params.js';

test('collect_matcher_names collects matcher names from routes', () => {
	const names = collect_matcher_names([
		/** @type {import('types').RouteData} */ ({
			params: [{ name: 'id', matcher: 'number' }]
		})
	]);

	expect(names).toEqual(new Set(['number']));
});

test('validate_param_matchers throws for unknown matchers', () => {
	assert.throws(
		() => validate_param_matchers({ foo: true }, new Set(['bar']), 'params.js'),
		'param_matcher_missing\nNo matcher found for parameter `bar` in `params.js`\nhttps://next.svelte.dev/e/@sveltejs/kit/param_matcher_missing'
	);
});

test('validate_param_matchers ignores inherited properties', () => {
	assert.throws(
		() => validate_param_matchers({}, new Set(['toString']), 'params.js'),
		/No matcher found for parameter `toString`/
	);
});

test('load_and_validate_params requires a params file for matchers', async () => {
	await expect(
		load_and_validate_params({
			routes: [
				/** @type {import('types').RouteData} */ ({
					params: [{ name: 'id', matcher: 'number' }]
				})
			],
			params_path: null,
			root: import.meta.dirname
		})
	).rejects.toMatchObject({
		name: 'SvelteKit error',
		message:
			'param_matcher_missing\nNo matcher found for parameter `number`\nhttps://next.svelte.dev/e/@sveltejs/kit/param_matcher_missing'
	});
});

test('load_and_validate_params requires a params export', async () => {
	await expect(
		load_and_validate_params({
			routes: [
				/** @type {import('types').RouteData} */ ({
					params: [{ name: 'id', matcher: 'number' }]
				})
			],
			params_path: 'params.js',
			root: import.meta.dirname,
			load: () => Promise.resolve({})
		})
	).rejects.toMatchObject({
		message:
			'params_export_missing\n`params.js` does not export `params` from `defineParams`\nhttps://next.svelte.dev/e/@sveltejs/kit/params_export_missing'
	});
});

test('load_and_validate_params loads and validates params', async () => {
	const params = await load_and_validate_params({
		routes: [
			/** @type {import('types').RouteData} */ ({
				params: [{ name: 'id', matcher: 'number' }]
			})
		],
		params_path: 'params.js',
		root: import.meta.dirname,
		load: () => Promise.resolve({ params: { number: () => true } })
	});

	expect(params).toEqual({ number: expect.any(Function) });
});
