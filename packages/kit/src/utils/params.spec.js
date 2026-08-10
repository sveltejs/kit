/** @import { ParamMatcher } from '@sveltejs/kit/params' */
import { assert, expect, test } from 'vitest';
import {
	collect_matcher_names,
	load_and_validate_params,
	validate_param_matchers
} from './params.js';
import { normalize_param_definition } from '../exports/params/index.js';

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

test('validate_param_matchers ignores inherited properties', () => {
	assert.throws(
		() => validate_param_matchers({}, new Set(['toString']), 'params.js'),
		/No matcher found for parameter 'toString'/
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

test('normalize_param_definition treats undefined as no match', () => {
	const matcher = normalize_param_definition(() => undefined);

	const result = matcher['~standard'].validate('x');
	if (result instanceof Promise) assert.fail('Expected synchronous validation');
	assert.ok(result.issues);
});

test('normalize_param_definition supports transform functions', () => {
	const matcher = normalize_param_definition((param) => {
		if (param !== '42') return;
		return 42;
	});

	assert.deepEqual(matcher['~standard'].validate('42'), { value: 42 });

	const result = matcher['~standard'].validate('nope');
	if (result instanceof Promise) assert.fail('Expected synchronous validation');
	assert.ok(result.issues);
});

test('normalize_param_definition propagates thrown errors', () => {
	const matcher = normalize_param_definition(() => {
		throw new Error('boom');
	});

	assert.throws(() => matcher['~standard'].validate('x'), /boom/);
});

test('normalize_param_definition passes callable standard schemas through untouched', () => {
	// standard schemas can be callable (e.g. ArkType)
	const callable = /** @type {ParamMatcher} */ (
		/** @type {unknown} */ (
			Object.assign(() => 'from-call', {
				'~standard': {
					version: 1,
					vendor: 'test',
					validate: () => ({ value: 'from-schema' })
				}
			})
		)
	);

	const matcher = normalize_param_definition(callable);

	assert.equal(matcher, callable);
	assert.deepEqual(matcher['~standard'].validate('x'), { value: 'from-schema' });
});
