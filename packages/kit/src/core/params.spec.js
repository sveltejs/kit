import { expect, test } from 'vitest';
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
	expect(() =>
		validate_param_matchers({ foo: true }, new Set(['bar']), 'params.js')
	).toThrowKitError('param_matcher_missing', { contains: ['`bar`', 'params.js'] });
});

test('validate_param_matchers ignores inherited properties', () => {
	expect(() => validate_param_matchers({}, new Set(['toString']), 'params.js')).toThrowKitError(
		'param_matcher_missing',
		{ contains: ['`toString`'] }
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
	).rejects.toThrowKitError('param_matcher_missing', { contains: ['`number`'] });
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
	).rejects.toThrowKitError('params_export_missing', { contains: ['params.js'] });
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
