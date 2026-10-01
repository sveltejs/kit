import { assert, describe, test } from 'vitest';
import {
	extends_id,
	validate_exclusions,
	validate_resolved_config,
	validate_types
} from './validate.js';

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

	test('does not warn if service worker is absent', () => {
		const warnings = validate_exclusions(
			[],
			'/path/to/project',
			['/path/to/project/src/service-worker'],
			[]
		);

		assert.deepEqual(warnings, []);
	});

	test('detects windows-style exclusions', () => {
		const warnings = validate_exclusions(
			[],
			'C:/project',
			['C:\\project\\src\\service-worker'],
			['C:/project/src/service-worker/index.ts']
		);
		assert.deepEqual(warnings, ['"src/service-worker" should be added to the "exclude" array']);
	});
});

describe('validate_resolved_config', () => {
	test('collects issues in order', () => {
		const dir = '/path/to/project';

		const warnings = validate_resolved_config(
			dir,
			/** @type {import('typescript').ParsedCommandLine} */ ({
				options: {
					types: ['node'],
					paths: { $utils: ['./elsewhere'] },
					pathsBasePath: dir,
					verbatimModuleSyntax: false,
					isolatedModules: true
				},
				fileNames: [`${dir}/src/service-worker.ts`],
				errors: []
			}),
			{ $utils: [`${dir}/src/utils`] },
			['$app/types'],
			[`${dir}/src/service-worker`]
		);

		assert.deepEqual(warnings, [
			'"types" was overwritten. It must include "$app/types"',
			'"paths" was overwritten. Imports from "$utils" may not typecheck',
			'"src/service-worker" should be added to the "exclude" array',
			'"verbatimModuleSyntax" was overwritten. It should be true'
		]);
	});
});
