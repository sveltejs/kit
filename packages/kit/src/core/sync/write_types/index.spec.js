import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { assert, describe, expect, test } from 'vitest';
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

describe('write_all_types caching', () => {
	/**
	 * @param {(ctx: { root: string; config: import('types').ValidatedConfig; types_dir: string }) => void} fn
	 */
	function with_temp_project(fn) {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-write-types-'));
		try {
			const config = validate_config({});
			config.files.assets = path.resolve(root, 'static');
			config.files.params = path.resolve(root, 'src/params');
			config.files.routes = path.resolve(root, 'src/routes');
			config.outDir = path.resolve(root, '.svelte-kit');

			fs.mkdirSync(path.join(root, 'src/routes/only-svelte'), { recursive: true });
			fs.mkdirSync(path.join(root, 'src/routes/sub'), { recursive: true });
			fs.writeFileSync(
				path.join(root, 'src/routes/+page.js'),
				'export function load() { return { a: 1 }; }\n'
			);
			fs.writeFileSync(path.join(root, 'src/routes/+page.svelte'), '');
			fs.writeFileSync(path.join(root, 'src/routes/only-svelte/+page.svelte'), '');
			fs.writeFileSync(
				path.join(root, 'src/routes/sub/+page.js'),
				'export function load() { return { b: 2 }; }\n'
			);
			fs.writeFileSync(path.join(root, 'src/routes/sub/+page.svelte'), '');

			fn({ root, config, types_dir: path.join(config.outDir, 'types') });
		} finally {
			fs.rmSync(root, { force: true, recursive: true });
		}
	}

	test('preserves route_meta_data.json and root $types.d.ts and skips unchanged routes on subsequent syncs', () => {
		with_temp_project(({ root, config, types_dir }) => {
			const manifest = create_manifest_data(config, root);
			write_all_types(config, manifest, root);

			const meta_data_file = path.join(types_dir, 'route_meta_data.json');
			const root_types = path.join(types_dir, 'src/routes/$types.d.ts');

			expect(fs.existsSync(meta_data_file)).toBe(true);
			expect(fs.existsSync(root_types)).toBe(true);

			// Replace root $types.d.ts with a sentinel whose mtime is >= source ctime
			fs.writeFileSync(root_types, '// cached sentinel\n');

			write_all_types(config, manifest, root);

			expect(fs.existsSync(meta_data_file)).toBe(true);
			expect(fs.readFileSync(root_types, 'utf-8')).toBe('// cached sentinel\n');
		});
	});

	test('regenerates $types.d.ts when deleted on a route with only +page.svelte', () => {
		with_temp_project(({ root, config, types_dir }) => {
			const manifest = create_manifest_data(config, root);
			write_all_types(config, manifest, root);

			const only_svelte_types = path.join(types_dir, 'src/routes/only-svelte/$types.d.ts');
			expect(fs.existsSync(only_svelte_types)).toBe(true);

			fs.rmSync(only_svelte_types);
			expect(fs.existsSync(only_svelte_types)).toBe(false);

			write_all_types(config, manifest, root);
			expect(fs.existsSync(only_svelte_types)).toBe(true);
		});
	});

	test('removes stale route files from types_dir', () => {
		with_temp_project(({ root, config, types_dir }) => {
			const manifest = create_manifest_data(config, root);
			write_all_types(config, manifest, root);

			const meta_data_file = path.join(types_dir, 'route_meta_data.json');
			const root_types = path.join(types_dir, 'src/routes/$types.d.ts');
			const sub_types = path.join(types_dir, 'src/routes/sub/$types.d.ts');

			expect(fs.existsSync(sub_types)).toBe(true);

			fs.rmSync(path.join(root, 'src/routes/sub'), { force: true, recursive: true });
			const next_manifest = create_manifest_data(config, root);
			write_all_types(config, next_manifest, root);

			expect(fs.existsSync(sub_types)).toBe(false);
			expect(fs.existsSync(meta_data_file)).toBe(true);
			expect(fs.existsSync(root_types)).toBe(true);
		});
	});
});
