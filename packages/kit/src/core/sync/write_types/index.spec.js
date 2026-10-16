import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, assert, beforeEach, describe, expect, test, vi } from 'vitest';
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

	test('root route types are preserved if the root route exists', () => {
		const types_dir = sync();
		const root_types = path.join(types_dir, 'src/routes/$types.d.ts');
		const about_types = path.join(types_dir, 'src/routes/about/$types.d.ts');
		assert.ok(fs.existsSync(root_types));
		assert.ok(fs.existsSync(about_types));

		// `path.posix.join('src/routes', '/')` is `src/routes/`, which never matches
		// `dirname('src/routes/$types.d.ts')`, causing the root types to be removed
		// (and then regenerated) on every sync. Spy on removals to catch that.
		const rm_spy = vi.spyOn(fs, 'rmSync');

		try {
			sync();

			const removed = rm_spy.mock.calls.map(([file]) => String(file));
			assert.ok(!removed.includes(root_types), 'root $types.d.ts should not be removed');
			assert.ok(!removed.includes(about_types), 'about $types.d.ts should not be removed');
		} finally {
			rm_spy.mockRestore();
		}

		assert.ok(fs.existsSync(root_types));
		assert.ok(fs.existsSync(about_types));
	});

	test('deletes files in directories that no longer correspond to a route', () => {
		const types_dir = sync();

		const stale = path.join(types_dir, 'src/routes/removed/$types.d.ts');
		fs.mkdirSync(path.dirname(stale), { recursive: true });
		fs.writeFileSync(stale, '// stale');

		sync();

		assert.ok(!fs.existsSync(stale));
	});

	test('regenerates types when a component-only route is removed and re-added', () => {
		const types_dir = sync();
		const route_dir = path.join(root, 'src/routes/about');
		const types_file = path.join(types_dir, 'src/routes/about/$types.d.ts');
		const meta_data_file = path.join(types_dir, 'route_meta_data.json');
		const original_types = fs.readFileSync(types_file, 'utf-8');

		fs.rmSync(route_dir, { recursive: true });
		sync();

		assert.ok(!fs.existsSync(types_file));
		assert.deepEqual(JSON.parse(fs.readFileSync(meta_data_file, 'utf-8'))['/about'], []);

		// With no own or inherited load files, timestamps and cached inputs cannot
		// invalidate the cache. The missing $types.d.ts must trigger regeneration.
		fs.mkdirSync(route_dir, { recursive: true });
		fs.writeFileSync(path.join(route_dir, '+page.svelte'), '');
		sync();

		assert.equal(fs.readFileSync(types_file, 'utf-8'), original_types);
	});

	test('preserves route_meta_data.json', () => {
		const types_dir = sync();
		const meta_data_file = path.join(types_dir, 'route_meta_data.json');
		const root_types = path.join(types_dir, 'src/routes/$types.d.ts');
		assert.ok(fs.existsSync(meta_data_file));

		// `route_meta_data.json` sits directly in the types dir, so its dirname (`.`) is never
		// an expected directory. It must be skipped explicitly, otherwise the cache is lost
		// and every route's types get regenerated on every sync.
		const rm_spy = vi.spyOn(fs, 'rmSync');
		fs.writeFileSync(root_types, '// marker');

		try {
			sync();

			const removed = rm_spy.mock.calls.map(([file]) => String(file));
			assert.ok(!removed.includes(meta_data_file), 'route_meta_data.json should not be removed');
		} finally {
			rm_spy.mockRestore();
		}

		assert.ok(fs.existsSync(meta_data_file));
		// nothing changed, so the cached metadata means the types should not be regenerated
		assert.equal(fs.readFileSync(root_types, 'utf-8'), '// marker');
	});

	describe('has root route types after repeated syncs', () => {
		beforeEach(() => {
			fs.writeFileSync(path.join(root, 'src/routes/+layout.svelte'), '');
		});

		/** @param {string} types_dir */
		function assert_types_exist(types_dir) {
			for (const dir of ['src/routes', 'src/routes/about']) {
				const file = path.join(types_dir, dir, '$types.d.ts');
				assert.ok(fs.existsSync(file), `${file} should exist`);
			}
		}

		test('in a fresh app (no .svelte-kit)', () => {
			for (let i = 0; i < 3; i += 1) {
				assert_types_exist(sync());
			}
		});

		test('after output directory is removed', () => {
			const types_dir = sync();

			fs.rmSync(path.join(types_dir, 'src/routes/$types.d.ts'));
			fs.rmSync(path.join(types_dir, 'src/routes/about'), { recursive: true });

			assert_types_exist(sync());
		});

		test('if the source is newer than the types', () => {
			const types_dir = sync();

			// make the generated file look older than the source so the cache is invalidated
			const old = new Date(Date.now() - 60_000);
			fs.utimesSync(path.join(types_dir, 'src/routes/$types.d.ts'), old, old);
			fs.writeFileSync(path.join(root, 'src/routes/+page.js'), 'export const load = () => ({});');

			assert_types_exist(sync());
		});
	});
});
