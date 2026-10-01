/** @import { ParamMatcher } from '@sveltejs/kit/params' */
import { assert, test } from 'vitest';
import { normalize_param_definition } from './index.js';

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

test('normalize_param_definition rejects invalid definitions', () => {
	assert.throws(
		() => normalize_param_definition(/** @type {any} */ (42)),
		'param_definition_invalid\nInvalid param definition\nhttps://next.svelte.dev/e/@sveltejs/kit/param_definition_invalid'
	);
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
