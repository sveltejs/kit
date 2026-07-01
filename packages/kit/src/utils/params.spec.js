import { assert, expect, test } from 'vitest';
import {
	collect_matcher_names,
	load_and_validate_params,
	validate_param_matchers
} from './params.js';
import { normalize_param_definition } from '../exports/params.js';

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
		/No matcher found for parameter 'bar'/
	);
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

test('normalize_param_definition uses the returned value as the parsed param', () => {
	const matcher = normalize_param_definition(() => true);

	assert.deepEqual(matcher['~standard'].validate('x'), { value: true });
});

test('normalize_param_definition supports transform functions', () => {
	const matcher = normalize_param_definition((param) => {
		if (param !== '42') throw new Error('nope');
		return 42;
	});

	assert.deepEqual(matcher['~standard'].validate('42'), { value: 42 });

	const result = matcher['~standard'].validate('nope');
	if (result instanceof Promise) assert.fail('Expected synchronous validation');
	assert.ok(result.issues);
});

test('normalize_param_definition rejects invalid return types', () => {
	// @ts-expect-error
	const matcher = normalize_param_definition(() => ({ invalid: true }));

	const result = matcher['~standard'].validate('irrelevant');
	if (result instanceof Promise) assert.fail('Expected synchronous validation');
	assert.ok(result.issues);
});
