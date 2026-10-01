import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { assert, describe, expect, test, vi } from 'vitest';
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

	return { config: initial, manifest, root };
}

/**
 * @param {Record<string, string>} files
 * @param {(config: import('types').ValidatedConfig, root: string) => void} callback
 */
function with_routes(files, callback) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'svelte-kit-write-types-'));
	const config = validate_config({});
	config.files.assets = path.join(root, 'static');
	config.files.params = path.join(root, 'src/params');
	config.files.routes = path.join(root, 'src/routes');
	config.outDir = path.join(root, '.svelte-kit');

	try {
		for (const [file, content] of Object.entries(files)) {
			const filename = path.join(config.files.routes, file);
			fs.mkdirSync(path.dirname(filename), { recursive: true });
			fs.writeFileSync(filename, content);
		}
		callback(config, root);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
}

describe('route metadata cache', () => {
	test('keeps root and nested types and skips unchanged generation', () => {
		const { config, manifest, root } = run_test('simple-page-shared-only');
		const write_spy = vi.spyOn(fs, 'writeFileSync');
		const remove_spy = vi.spyOn(fs, 'rmSync');
		try {
			write_all_types(config, manifest, root);
			const generated = [
				path.join(config.outDir, 'types/$types.d.ts'),
				path.join(config.outDir, 'types/sub/$types.d.ts'),
				path.join(config.outDir, 'types/sub/proxy+page.js')
			];
			for (const file of generated) {
				expect(fs.existsSync(file)).toBe(true);
				expect(write_spy.mock.calls.map(([file]) => file.toString())).not.toContain(file);
				expect(remove_spy.mock.calls.map(([file]) => file.toString())).not.toContain(file);
			}
		} finally {
			write_spy.mockRestore();
			remove_spy.mockRestore();
		}
	});

	test('keeps LayoutProps and PageProps without load modules on repeated sync', () => {
		with_routes({ '+layout.svelte': '', '+page.svelte': '' }, (config, root) => {
			const manifest = create_manifest_data(config, root);
			write_all_types(config, manifest, root);
			write_all_types(config, manifest, root);
			const types = fs.readFileSync(
				path.join(config.outDir, 'types/src/routes/$types.d.ts'),
				'utf8'
			);
			expect(types).toContain('export type LayoutProps');
			expect(types).toContain('export type PageProps');
		});
	});

	test('metadata remains readable while a competing sync writes', () => {
		const { config, manifest, root } = run_test('simple-page-shared-only');
		const meta_data_file = path.join(config.outDir, 'types/route_meta_data.json');
		const temp_prefix = path.join(config.outDir, 'route_meta_data.');
		const original_write = fs.writeFileSync;
		let intercepted = false;
		const write_spy = vi.spyOn(fs, 'writeFileSync').mockImplementation((file, data, options) => {
			const filename = file.toString();
			if (!intercepted && (filename === meta_data_file || filename.startsWith(temp_prefix))) {
				intercepted = true;
				if (filename === meta_data_file) {
					original_write(file, '');
				} else {
					original_write(file, data, options);
				}
				expect(() => JSON.parse(fs.readFileSync(meta_data_file, 'utf8'))).not.toThrow();
				write_all_types(config, manifest, root);
				if (filename === meta_data_file) original_write(file, data, options);
				return;
			}
			original_write(file, data, options);
		});
		try {
			write_all_types(config, manifest, root);
			expect(intercepted).toBe(true);
			expect(
				fs.readdirSync(config.outDir).filter((file) => file.startsWith('route_meta_data.'))
			).toEqual([]);
		} finally {
			write_spy.mockRestore();
		}
	});

	test.each(['', '{', 'null', '[]', '{"/":[]}', '{"/":{"inputs":"bad","outputs":null}}'])(
		'regenerates types for invalid or legacy metadata %j',
		(content) => {
			const { config, manifest, root } = run_test('simple-page-shared-only');
			const file = path.join(config.outDir, 'types/route_meta_data.json');
			fs.writeFileSync(file, content);
			write_all_types(config, manifest, root);
			expect(JSON.parse(fs.readFileSync(file, 'utf8'))['/'].outputs).toContain('$types.d.ts');
		}
	);

	test('treats metadata disappearing during the read as a cache miss', () => {
		const { config, manifest, root } = run_test('simple-page-shared-only');
		const file = path.join(config.outDir, 'types/route_meta_data.json');
		const original_read = fs.readFileSync;
		const read_spy = vi.spyOn(fs, 'readFileSync').mockImplementation((filename, options) => {
			if (filename.toString() === file)
				throw Object.assign(new Error('missing'), { code: 'ENOENT' });
			return original_read(filename, options);
		});
		try {
			expect(() => write_all_types(config, manifest, root)).not.toThrow();
		} finally {
			read_spy.mockRestore();
		}
	});

	test('does not swallow unrelated filesystem errors', () => {
		const { config, manifest, root } = run_test('simple-page-shared-only');
		const file = path.join(config.outDir, 'types/route_meta_data.json');
		const original_read = fs.readFileSync;
		const error = Object.assign(new Error('permission denied'), { code: 'EACCES' });
		const read_spy = vi.spyOn(fs, 'readFileSync').mockImplementation((filename, options) => {
			if (filename.toString() === file) throw error;
			return original_read(filename, options);
		});
		try {
			expect(() => write_all_types(config, manifest, root)).toThrow(error);
		} finally {
			read_spy.mockRestore();
		}
	});

	test('cleans temporary files when replacing metadata fails', () => {
		const { config, manifest, root } = run_test('simple-page-shared-only');
		const file = path.join(config.outDir, 'types/route_meta_data.json');
		const previous = fs.readFileSync(file, 'utf8');
		const error = new Error('rename failed');
		const rename_spy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
			throw error;
		});
		try {
			expect(() => write_all_types(config, manifest, root)).toThrow(error);
			expect(fs.readFileSync(file, 'utf8')).toBe(previous);
			expect(
				fs.readdirSync(config.outDir).filter((file) => file.startsWith('route_meta_data.'))
			).toEqual([]);
		} finally {
			rename_spy.mockRestore();
		}
	});

	test.each(['$types.d.ts', 'sub/proxy+page.js'])('restores missing output %s', (file) => {
		const { config, manifest, root } = run_test('simple-page-shared-only');
		const output = path.join(config.outDir, 'types', file);
		fs.rmSync(output);
		write_all_types(config, manifest, root);
		expect(fs.existsSync(output)).toBe(true);
	});

	test('invalidates layouts when child routes are added or removed', () => {
		with_routes(
			{
				'+layout.js': 'export const load = () => ({});',
				'sub/+page.js': 'export const load = () => ({});'
			},
			(config, root) => {
				const sync = () => write_all_types(config, create_manifest_data(config, root), root);
				const types = path.join(config.outDir, 'types/src/routes/$types.d.ts');
				sync();
				const child = path.join(config.files.routes, '[slug]');
				fs.mkdirSync(child);
				fs.writeFileSync(path.join(child, '+page.js'), 'export const load = () => ({});');
				sync();
				const generated = fs.readFileSync(types, 'utf8');
				expect(generated).toContain('"/[slug]"');
				expect(generated).toContain('slug?: string');
				fs.rmSync(child, { recursive: true });
				sync();
				expect(fs.readFileSync(types, 'utf8')).not.toContain('"/[slug]"');
				expect(fs.existsSync(path.join(config.outDir, 'types/src/routes/[slug]/$types.d.ts'))).toBe(
					false
				);
				expect(
					JSON.parse(
						fs.readFileSync(path.join(config.outDir, 'types/route_meta_data.json'), 'utf8')
					)['/[slug]']
				).toBeUndefined();
			}
		);
	});

	test('invalidates layouts when a child stops exporting load', () => {
		with_routes(
			{
				'+layout.js': 'export const load = () => ({});',
				'sub/+page.js': 'export const load = () => ({});'
			},
			(config, root) => {
				const sync = () => write_all_types(config, create_manifest_data(config, root), root);
				const types = path.join(config.outDir, 'types/src/routes/$types.d.ts');
				sync();
				expect(fs.readFileSync(types, 'utf8')).toContain(
					'LayoutLoad<OutputData extends Partial<App.PageData>'
				);
				fs.writeFileSync(
					path.join(config.files.routes, 'sub/+page.js'),
					'export const prerender = true;'
				);
				sync();
				expect(fs.readFileSync(types, 'utf8')).toContain(
					'LayoutLoad<OutputData extends OutputDataShape<LayoutParentData>'
				);
			}
		);
	});

	test('invalidates matcher imports when the params entry changes', () => {
		with_routes({ '[id=number]/+page.js': 'export const load = () => ({});' }, (config, root) => {
			const sync = () => write_all_types(config, create_manifest_data(config, root), root);
			const types = path.join(config.outDir, 'types/src/routes/[id=number]/$types.d.ts');
			sync();
			expect(fs.readFileSync(types, 'utf8')).toContain('src/params.js');
			config.files.params = path.join(root, 'custom/params');
			sync();
			expect(fs.readFileSync(types, 'utf8')).toContain('custom/params.js');
		});
	});

	test('detects source changes even when generated output has a newer timestamp', () => {
		with_routes({ '+page.server.js': 'export const load = () => ({});' }, (config, root) => {
			const sync = () => write_all_types(config, create_manifest_data(config, root), root);
			const types = path.join(config.outDir, 'types/src/routes/$types.d.ts');
			sync();
			const future = new Date(Date.now() + 60000);
			fs.utimesSync(types, future, future);
			fs.writeFileSync(
				path.join(config.files.routes, '+page.server.js'),
				'export const actions = { default: () => ({ success: true }) };'
			);
			sync();
			expect(fs.readFileSync(types, 'utf8')).toContain('type ActionsExport');
			fs.rmSync(path.join(config.files.routes, '+page.server.js'));
			fs.writeFileSync(path.join(config.files.routes, '+page.svelte'), '');
			sync();
			expect(fs.readFileSync(types, 'utf8')).not.toContain('type ActionsExport');
		});
	});

	test('invalidates types when a page component is added without a load module', () => {
		with_routes({ '+layout.svelte': '' }, (config, root) => {
			const sync = () => write_all_types(config, create_manifest_data(config, root), root);
			const types = path.join(config.outDir, 'types/src/routes/$types.d.ts');
			sync();
			expect(fs.readFileSync(types, 'utf8')).not.toContain('export type PageProps');
			fs.writeFileSync(path.join(config.files.routes, '+page.svelte'), '');
			sync();
			expect(fs.readFileSync(types, 'utf8')).toContain('export type PageProps');
		});
	});
});

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
