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

test('Create $types for page.js', async () => {
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
		export const GET: Get = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		export const GET = ({ params }: Parameters<Get>[0]) => {
			return {
				a: 1
			};
		};
	`
	);
});

test('Rewrites types for a TypeScript module without param', () => {
	const source = `
		export const GET: Get = () => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		export const GET = () => {
			return {
				a: 1
			};
		};
	;Get;`
	);
});

test('Rewrites types for a JavaScript module with `function`', () => {
	const source = `
		/** @type {import('./$types').Get} */
		export function GET({ params }) {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		/** @param {Parameters<import('./$types').Get>[0]} event */
		export function GET({ params }) {
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
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`// @ts-nocheck

		/** @param {Parameters<import('./$types').Get>[0]} event */
		export const GET = ({ params }) => {
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
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`;

	const rewritten = tweak_types(source, new Set(['GET']));

	assert.equal(rewritten?.exports, ['GET']);
	assert.equal(
		rewritten?.code,
		`// @ts-check
// @ts-nocheck

		/** @param {Parameters<import('./$types').Get>[0]} event */
		export const GET = ({ params }) => {
			return {
				a: 1
			};
		};
	`
	);
});

test.run();
