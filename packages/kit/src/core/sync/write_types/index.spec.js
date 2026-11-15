import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';
import create_manifest_data from '../create_manifest_data/index.js';
import { tweak_types, write_all_types } from './index.js';
import { write_app_types } from '../write_app_types.js';
import { validate_config } from '../../config/index.js';
import { write_env } from '../write_env.js';
import { write_tsconfig } from '../write_tsconfig/index.js';

const cwd = path.join(import.meta.dirname, 'test');

/**
 * @param {string} dir
 */
function run_test(dir) {
	fs.rmSync(path.join(cwd, dir, '.svelte-kit'), { force: true, recursive: true });

	const initial = validate_config({});

	initial.files.assets = path.resolve(cwd, 'static');
	initial.files.params = path.resolve(cwd, dir, 'params');
	initial.files.routes = path.resolve(cwd, dir);
	initial.outDir = path.resolve(cwd, dir, '.svelte-kit');

	const root = path.join(cwd, dir);

	const manifest = create_manifest_data(initial, root);

	write_all_types(initial, manifest, root);
	write_app_types(initial, manifest, root);
	write_tsconfig(initial, root);
	write_env('', {}, root);
}

describe('Creates correct $types', () => {
	// To save us from creating a real SvelteKit project for each of the tests,
	// we first run the type generation directly for each test case, and then
	// call `tsc` to check that the generated types are valid.
	const directories = fs
		.readdirSync(cwd)
		.filter((dir) => fs.statSync(`${cwd}/${dir}`).isDirectory());

	for (const dir of directories) {
		test(dir, { timeout: 60000 }, () => {
			run_test(dir);
			try {
				// we skip lib check if MATRIX_VITE is set and not 'current' because overrides for vite can cause type mismatches
				const skipLibCheck =
					process.env.MATRIX_VITE != null && process.env.MATRIX_VITE !== 'current';
				execSync(`pnpm testtypes${skipLibCheck ? ' --skipLibCheck' : ''}`, {
					cwd: path.join(cwd, dir)
				});
			} catch (e) {
				console.error(/** @type {any} */ (e).stdout.toString());
				throw e;
			}
		});
	}
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

	expect(rewritten?.exports).toEqual(['load']);
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

	expect(rewritten?.exports).toEqual(['load']);
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

	expect(rewritten?.exports).toEqual(['load']);
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

	expect(rewritten?.exports).toEqual(['load']);
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

	expect(rewritten?.exports).toEqual(['load']);
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

test('Detects destructured exports', () => {
	const source = `
		export const { load, actions } = create_page();
	`;

	const rewritten = tweak_types(source, true);

	expect(rewritten?.exports).toEqual(['load', 'actions']);
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

	expect(rewritten?.exports).toEqual(['load']);
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

	expect(rewritten?.exports).toEqual(['actions']);
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

	expect(rewritten?.exports).toEqual(['actions']);
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

test('Leaves satisfies operator untouched', () => {
	const source = `
		import type { Actions, PageServerLoad, RequestEvent } from './$types';
		export function load({ params }) {
			return {
				a: 1
			};
		} satisfies PageServerLoad
		export const actions = {
			a: () => {},
			b: (param: RequestEvent) => {},
			c: (param) => {},
		} satisfies Actions
	`;

	const rewritten = tweak_types(source, true);

	expect(rewritten?.exports).toEqual(['load', 'actions']);
	assert.equal(rewritten?.modified, false);
	assert.equal(rewritten?.code, source);
});

describe('Cleans up unused files', () => {
	/** @type {string} */
	let root;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-write-types-'));

		for (const dir of ['', 'about']) {
			const route_dir = path.join(root, 'src/routes', dir);
			fs.mkdirSync(route_dir, { recursive: true });
			fs.writeFileSync(path.join(route_dir, '+page.svelte'), '');
		}
	});

	afterEach(() => {
		fs.rmSync(root, { force: true, recursive: true });
	});

	function sync() {
		const config = validate_config({});
		config.files.assets = path.join(root, 'static');
		config.files.params = path.join(root, 'src/params');
		config.files.routes = path.join(root, 'src/routes');
		config.outDir = path.join(root, '.svelte-kit');

		write_all_types(config, create_manifest_data(config, root), root);

		return path.join(config.outDir, 'types');
	}

	test('removes empty output directories for removed routes', () => {
		const types_dir = sync();
		const route_types_dir = path.join(types_dir, 'src/routes/about');
		const types_file = path.join(route_types_dir, '$types.d.ts');
		assert.ok(fs.existsSync(types_file));

		fs.rmSync(path.join(root, 'src/routes/about'), { recursive: true });
		sync();

		assert.ok(!fs.existsSync(types_file));
		assert.ok(!fs.existsSync(route_types_dir));
	});

	test('keeps parent directories that still have nested routes', () => {
		const nested = path.join(root, 'src/routes/about/team');
		fs.mkdirSync(nested, { recursive: true });
		fs.writeFileSync(path.join(nested, '+page.svelte'), '');

		const types_dir = sync();
		const about_dir = path.join(types_dir, 'src/routes/about');
		const team_types = path.join(about_dir, 'team/$types.d.ts');
		assert.ok(fs.existsSync(team_types));

		fs.rmSync(path.join(root, 'src/routes/about/team'), { recursive: true });
		sync();

		assert.ok(!fs.existsSync(team_types));
		assert.ok(!fs.existsSync(path.join(about_dir, 'team')));
		assert.ok(fs.existsSync(path.join(about_dir, '$types.d.ts')));
	});
});

test('prunes stale entries from route_meta_data.json when routes are deleted', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sveltekit-prune-test-'));
	try {
		const config = validate_config({});
		config.files.assets = path.resolve(cwd, 'static');
		config.files.params = path.resolve(tmp, 'params');
		config.files.routes = path.resolve(tmp);
		config.outDir = path.resolve(tmp, '.svelte-kit');

		// Pre-populate the meta data file with a stale entry for a route that no longer exists.
		const types_dir = path.join(config.outDir, 'types');
		fs.mkdirSync(types_dir, { recursive: true });
		const meta_data_file = path.join(types_dir, 'route_meta_data.json');
		fs.writeFileSync(meta_data_file, JSON.stringify({ '/deleted-route': [] }));

		// Create an empty routes directory so manifest generation finds no routes.
		fs.mkdirSync(path.resolve(tmp, 'params'), { recursive: true });

		const manifest = create_manifest_data(config, tmp);
		write_all_types(config, manifest, tmp);

		const result = /** @type {Record<string, unknown>} */ (
			JSON.parse(fs.readFileSync(meta_data_file, 'utf-8'))
		);
		expect(result).not.toHaveProperty('/deleted-route');
	} finally {
		fs.rmSync(tmp, { force: true, recursive: true });
	}
});
