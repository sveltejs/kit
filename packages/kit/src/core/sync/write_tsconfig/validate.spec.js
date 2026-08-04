import { assert, describe, test } from 'vitest';
import { extends_id, validate_exclusions, validate_types } from './validate.js';

describe('extends_id', () => {
	const id = 'POTATO';

	test('validates that a config extends an id (string)', () => {
		assert.equal(extends_id({ extends: id }, id), true);
	});

	test('validates that a config extends an id (array)', () => {
		assert.equal(extends_id({ extends: [id] }, id), true);
	});

	test('validates that a config does not extend an id', () => {
		assert.equal(extends_id({}, id), false);
	});
});

describe('validate_types', () => {
	test('warns if types is overwritten', () => {
		const warnings = validate_types([], ['pinky', 'perky'], []);

		assert.deepEqual(warnings, ['"types" was overwritten. It must include "pinky" and "perky"']);
	});
});

describe('validate_exclusions', () => {
	test('warns if service worker is incorrectly included', () => {
		const warnings = validate_exclusions(
			[],
			'/path/to/project',
			['/path/to/project/src/service-worker'],
			['/path/to/project/src/service-worker/index.ts']
		);

		assert.deepEqual(warnings, ['"src/service-worker" should be added to the "exclude" array']);
	});
});
