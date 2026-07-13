import { assert, describe, test } from 'vitest';
import { validate, handle_issues } from './env.js';

/**
 * @param {Record<string, any>} variables
 * @param {string | undefined} value
 * @param {string} name
 */
function run(variables, value, name) {
	/** @type {Record<string, any[]>} */
	const issues = {};
	const result = validate(variables, value, name, issues);
	return { result, issues };
}

describe('validate', () => {
	test('records a MISSING issue when a required variable without a schema is undefined', () => {
		const { result, issues } = run({ FOO: {} }, undefined, 'FOO');
		assert.equal(result, undefined);
		assert.deepEqual(issues, { FOO: [issues.FOO[0]] });
		assert.match(issues.FOO[0].message, /Value is missing/);
	});

	test('does not record an issue when an optional variable without a schema is undefined', () => {
		const { result, issues } = run({ FOO: { optional: true } }, undefined, 'FOO');
		assert.equal(result, undefined);
		assert.deepEqual(issues, {});
	});

	test('does not record an issue when an optional variable without a schema is an empty string', () => {
		const { result, issues } = run({ FOO: { optional: true } }, '', 'FOO');
		assert.equal(result, undefined);
		assert.deepEqual(issues, {});
	});

	test('returns the value unchanged when a required variable without a schema is present', () => {
		const { result, issues } = run({ FOO: {} }, 'bar', 'FOO');
		assert.equal(result, 'bar');
		assert.deepEqual(issues, {});
	});

	test('returns the value unchanged when an optional variable is present', () => {
		const { result, issues } = run({ FOO: { optional: true } }, 'bar', 'FOO');
		assert.equal(result, 'bar');
		assert.deepEqual(issues, {});
	});

	test('skips the schema validator when an optional variable is undefined', () => {
		/** @type {any} */
		const validator = {
			'~standard': {
			validate(/** @type {any} */ value) {
				if (value === undefined) return { issues: [{ message: 'nope' }] };
				return { value };
			}
			}
		};
		const { result, issues } = run(
			{ FOO: { optional: true, schema: validator } },
			undefined,
			'FOO'
		);
		assert.equal(result, undefined);
		assert.deepEqual(issues, {});
	});

	test('runs the schema validator when an optional variable is present', () => {
		/** @type {any} */
		const validator = {
			'~standard': {
			validate(/** @type {any} */ value) {
				return { value: `validated:${value}` };
			}
			}
		};
		const { result, issues } = run({ FOO: { optional: true, schema: validator } }, 'bar', 'FOO');
		assert.equal(result, 'validated:bar');
		assert.deepEqual(issues, {});
	});

	test('handle_issues throws when there are issues', () => {
		assert.throws(
			() => handle_issues({ FOO: [{ message: 'bad' }] }),
			/Invalid environment variables/
		);
	});

	test('handle_issues is a no-op when there are no issues', () => {
		handle_issues({});
	});
});
