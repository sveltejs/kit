import { assert, test } from 'vitest';
import { defineEnvVars } from '../env/index.js';
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

test('wraps function validators', () => {
	const variables = defineEnvVars({
		PORT: {
			schema: (value) => (value === undefined ? 3000 : Number(value) || undefined)
		},
		NAME: {
			schema: (value) => {
				if (value === '') throw new Error('NAME must not be empty');
				return value;
			}
		}
	});

	/** @type {Record<string, import('@standard-schema/spec').StandardSchemaV1.Issue[]>} */
	const issues = {};

	assert.equal(validate(variables, undefined, 'PORT', issues), 3000);
	assert.equal(validate(variables, '8080', 'PORT', issues), 8080);
	assert.deepEqual(issues, {});

	// returning undefined is valid, so a function validator can describe an optional variable
	assert.equal(validate(variables, 'nope', 'PORT', issues), undefined);
	assert.deepEqual(issues, {});

	validate(variables, '', 'NAME', issues);
	assert.deepEqual(issues.NAME, [{ message: 'NAME must not be empty' }]);
});

test('rejects async function validators', () => {
	const variables = defineEnvVars({
		FOO: { schema: (value) => Promise.resolve(value) }
	});

	/** @type {Record<string, import('@standard-schema/spec').StandardSchemaV1.Issue[]>} */
	const issues = {};
	validate(variables, 'x', 'FOO', issues);

	assert.equal(issues.FOO[0].message, 'Variable uses an async validator, which is not supported');
});

test('passes standard schema configs through untouched', () => {
	const config = {
		/** @type {import('@standard-schema/spec').StandardSchemaV1<string | undefined, string>} */
		schema: {
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: (value) => ({ value: /** @type {string} */ (value) })
			}
		}
	};

	// standard schemas can be callable (e.g. ArkType)
	const callable = {
		schema:
			/** @type {import('@standard-schema/spec').StandardSchemaV1<string | undefined, string>} */ (
				/** @type {unknown} */ (
					Object.assign(() => 'from-call', {
						'~standard': {
							version: 1,
							vendor: 'test',
							validate: () => ({ value: 'from-schema' })
						}
					})
				)
			)
	};

	const variables = defineEnvVars({ FOO: config, BAR: callable });

	assert.equal(variables.FOO, config);
	assert.equal(variables.BAR, callable);

	/** @type {Record<string, import('@standard-schema/spec').StandardSchemaV1.Issue[]>} */
	const issues = {};
	assert.equal(validate(variables, 'x', 'BAR', issues), 'from-schema');
	assert.deepEqual(issues, {});
});
