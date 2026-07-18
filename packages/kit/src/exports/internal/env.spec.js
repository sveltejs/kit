import { assert, test } from 'vitest';
import { validate } from './env.js';

test('reports a variable without a validator as missing when it is undefined', () => {
	/** @type {Record<string, import('@standard-schema/spec').StandardSchemaV1.Issue[]>} */
	const issues = {};
	validate({}, undefined, 'FOO', issues);

	assert.ok(issues.FOO);
});

test('accepts an empty string for a variable without a validator', () => {
	/** @type {Record<string, import('@standard-schema/spec').StandardSchemaV1.Issue[]>} */
	const issues = {};
	const value = validate({}, '', 'FOO', issues);

	assert.equal(value, '');
	assert.deepEqual(issues, {});
});
