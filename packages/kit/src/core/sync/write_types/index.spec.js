// @ts-nocheck
import path from 'path';
import fs from 'fs';
import { format } from 'prettier';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { rimraf, walk } from '../../../utils/filesystem.js';
import options from '../../config/options.js';
import create_manifest_data from '../create_manifest_data/index.js';
import { tweak_types, write_all_types } from './index.js';

const cwd = fileURLToPath(new URL('./test', import.meta.url));

/**
 * @param {string} dir
 * @param {import('types').Config} config
 */
async function run_test(dir, config = {}) {
	rimraf(path.join(cwd, dir, '.svelte-kit'));

	const initial = options(config, 'config');

	initial.kit.files.assets = path.resolve(cwd, 'static');
	initial.kit.files.params = path.resolve(cwd, 'params');
	initial.kit.files.routes = path.resolve(cwd, dir);
	initial.kit.outDir = path.resolve(cwd, path.join(dir, '.svelte-kit'));

	const manifest = create_manifest_data({
		config: /** @type {import('types').ValidatedConfig} */ (initial)
	});
	await write_all_types(initial, manifest);

	const expected_dir = path.join(cwd, dir, '_expected');
	const expected_files = walk(expected_dir, true);
	const actual_dir = path.join(
		path.join(cwd, dir, '.svelte-kit', 'types'),
		path.relative(process.cwd(), path.join(cwd, dir))
	);
	const actual_files = walk(actual_dir, true);

	assert.equal(actual_files, expected_files);

	for (const file of actual_files) {
		const expected_file = path.join(expected_dir, file);
		const actual_file = path.join(actual_dir, file);
		if (fs.statSync(path.join(actual_dir, file)).isDirectory()) {
			assert.ok(fs.statSync(actual_file).isDirectory(), 'Expected a directory');
			continue;
		}

		const expected = format(fs.readFileSync(expected_file, 'utf-8'), {
			parser: 'typescript'
		});
		const actual = format(fs.readFileSync(actual_file, 'utf-8'), {
			parser: 'typescript'
		});
		const err_msg = `Expected equal file contents for ${file} in ${dir}`;
		assert.fixture(actual, expected, err_msg);
	}
}

test('Create $types for +page.js', async () => {
	await run_test('simple-page-shared-only');
});

test('Create $types for page.server.js', async () => {
	await run_test('simple-page-server-only');
});

test('Create $types for page(.server).js', async () => {
	await run_test('simple-page-server-and-shared');
});

test('Create $types for layout and page', async () => {
	await run_test('layout');
});

test('Create $types for grouped layout and page', async () => {
	await run_test('layout-advanced');
});

test('Create $types with params', async () => {
	await run_test('slugs');
});

test('Create $types with params and required return types for layout', async () => {
	await run_test('slugs-layout-not-all-pages-have-load');
});

test('Rewrites types for a TypeScript module', () => {
	const source = `
		export const load: Get = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, false);

	assert.equal(rewritten?.exports, ['load']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		export const load = ({ params }: Parameters<Get>[0]) => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a TypeScript module without param', () => {
	const source = `
		export const load: Get = () => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, false);

	assert.equal(rewritten?.exports, ['load']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		export const load = () => {
			return {
				a: 1
			};
		};
	;null as any as Get;`
	);
});

test('Rewrites types for a TypeScript module without param and jsdoc without types', () => {
	const source = `
		/** test */
		export const load: Get = () => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, false);

	assert.equal(rewritten?.exports, ['load']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		/** test */
		export const load = () => {
			return {
				a: 1
			};
		};
	;null as any as Get;`
	);
});

test('Rewrites types for a JavaScript module with `function`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export function load({ params }) {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, false);

	assert.equal(rewritten?.exports, ['load']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		/** @param {Parameters<import('./$types').Get>[0]} event */
		export function load({ params }) {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a JavaScript module with `const`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export const load = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, false);

	assert.equal(rewritten?.exports, ['load']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		/** @param {Parameters<import('./$types').Get>[0]} event */
		export const load = ({ params }) => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Appends @ts-nocheck after @ts-check', () => {
	const source = `// @ts-check
		/** @type {import('./$types').Get} */
		export const load = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, false);

	assert.equal(rewritten?.exports, ['load']);
	assert.equal(
		rewritten?.code,
		`// @ts-check
// @ts-nocheck

		/** @param {Parameters<import('./$types').Get>[0]} event */
		export const load = ({ params }) => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites action types for a JavaScript module', () => {
	const source = `
		/** @type {import('./$types').Actions} */
		export const actions = {
			a: () => {},
			b: (param) => {},
			/** @type {import('./$types').Action} */
			c: (param) => {},
		}
	`;

	const rewritten = tweak_types(source, true);

	assert.equal(rewritten?.exports, ['actions']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		/** */
		export const actions = {
			a: () => {},
			b:/** @param {import('./$types').RequestEvent} param */  (param) => {},
			/** @param {Parameters<import('./$types').Action>[0]} param */
			c: (param) => {},
		}
	`
	);
});

test('Rewrites action types for a TypeScript module', () => {
	const source = `
		import type { Actions, RequestEvent } from './$types';

		export const actions: Actions = {
			a: () => {},
			b: (param: RequestEvent) => {},
			c: (param) => {},
		}
	`;

	const rewritten = tweak_types(source, true);

	assert.equal(rewritten?.exports, ['actions']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		import type { Actions, RequestEvent } from './$types';

		export const actions = {
			a: () => {},
			b: (param: RequestEvent) => {},
			c: (param: import('./$types').RequestEvent) => {},
		}
	;null as any as Actions;`
	);
});

test.run();
