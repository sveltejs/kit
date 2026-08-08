import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import adapter from './index.js';

const index_file = new URL('./src/index.js', import.meta.url).pathname;
const manifest_file = new URL('./.svelte-kit/output/server/manifest.js', import.meta.url).pathname;
const routes_file = new URL('./src/routes.js', import.meta.url).pathname;
const start_file = new URL('./src/start.js', import.meta.url).pathname;

vi.mock('node:fs/promises', async (import_original) => {
	const actual = await import_original<typeof import('node:fs/promises')>();
	return { ...actual, readdir: vi.fn() };
});

const { adapter_entrypoint, build, file } = vi.hoisted(() => {
	const adapter_entrypoint = '// adapter entrypoint';
	const build = vi.fn((_options: any) => ({ success: true, logs: [], outputs: [] }));
	const file = vi.fn((path: string) => ({
		text: () => adapter_entrypoint,
		type: path.endsWith('.html')
			? 'text/html;charset=utf-8'
			: path.endsWith('.json')
				? 'application/json;charset=utf-8'
				: 'text/plain;charset=utf-8'
	}));
	vi.stubGlobal('Bun', { build, file });
	return { adapter_entrypoint, build, file };
});

beforeEach(() => {
	vi.mocked(readdir).mockResolvedValue([]);
});

afterEach(() => {
	build.mockClear();
	file.mockClear();
});

describe('Bun build options', () => {
	test('reserves the runtime target and module format', async () => {
		const instance = adapter();
		expect(instance.supports?.read?.({ route: { id: '/read' }, config: {} })).toBe(true);

		await instance.adapt(builder());

		const options = build.mock.calls[0][0];
		expect(options).toMatchObject({
			target: 'bun',
			format: 'esm',
			conditions: ['bun', 'node'],
			outdir: 'build',
			sourcemap: 'external',
			compile: false
		});
		expect(options.plugins[0].name).toBe('adapter-bun');
	});

	test('provides runtime constants without globally replacing application identifiers', async () => {
		await adapter({ envPrefix: 'MY_', serverOptions: { port: 4000 } }).adapt(
			builder({ origin: 'https://example.com' })
		);

		const options = build.mock.calls[0][0];
		expect(options.define).toBeUndefined();
		expect(options.files[manifest_file]).toContain('export const env_prefix = "MY_";');
		expect(options.files[manifest_file]).toContain('export const origin = "https://example.com";');
	});

	test('shares Bun files between directory routes and server reads', async () => {
		const active_route = { id: '/read', prerender: false };
		const prerendered_route = { id: '/prerendered', prerender: true };
		const test_builder = builder({
			client_files: ['data.json', 'encoded name.txt', '_app/immutable/assets/read.txt'],
			prerendered_files: ['prerendered/index.html'],
			prerendered_pages: [['/prerendered/', { file: 'prerendered/index.html' }]],
			routes: [active_route, prerendered_route],
			server_assets: ['_app/immutable/assets/read.txt']
		});

		await adapter().adapt(test_builder);
		expect(test_builder.findServerAssets).toHaveBeenCalledWith([active_route]);

		const source = build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('...client_asset("data.json")');
		expect(source).toContain('...client_asset("_app/immutable/assets/read.txt")');
		expect(source).toContain('...prerendered_page("/prerendered/", "prerendered/index.html")');
		expect(source).toContain(
			'export const server_assets = new Map([["_app/immutable/assets/read.txt", server_asset("_app/immutable/assets/read.txt")]])'
		);
	});

	test('maps logical paths to embedded Bun files for executables', async () => {
		mock_embedded_files({
			client: ['data.json', '_app/immutable/assets/read.txt'],
			pages: ['prerendered/index.html']
		});

		await adapter({ buildOptions: { compile: true } }).adapt(
			builder({
				prerendered_pages: [['/prerendered/', { file: 'prerendered/index.html' }]],
				server_assets: ['_app/immutable/assets/read.txt']
			})
		);

		const options = build.mock.calls[0][0];
		const source = options.files[routes_file];
		expect(options.compile).toEqual({ outfile: 'server' });
		expect(source).toContain("with { type: 'file' }");
		expect(source).toContain('...client_asset("data.json", asset_0)');
		expect(source).toContain('...client_asset("_app/immutable/assets/read.txt", asset_1)');
		expect(source).toContain('server_asset("_app/immutable/assets/read.txt", asset_1)');
	});

	test('maps prerendered non-HTML assets into compiled executables', async () => {
		mock_embedded_files({
			pages: ['prerendered/index.html', 'prerendered.ico']
		});

		await adapter({ buildOptions: { compile: true } }).adapt(
			builder({
				prerendered_pages: [['/prerendered/', { file: 'prerendered/index.html' }]]
			})
		);

		const source = build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('prerendered_asset("prerendered.ico", asset_1)');
	});

	test('preserves dotfiles other than Vite build metadata in executables', async () => {
		mock_embedded_files({ client: ['.vite/manifest.json', '.well-known/assetlinks.json'] });

		await adapter({ buildOptions: { compile: true } }).adapt(builder());

		const source = build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('assetlinks.json');
		expect(source).toContain('...client_asset(".well-known/assetlinks.json", asset_0)');
		expect(source).not.toContain('.vite/manifest.json');
	});

	test('rejects literal wildcard filenames in regular builds', async () => {
		await expect(adapter().adapt(builder({ client_files: ['asterisk*.txt'] }))).rejects.toThrow(
			'Rename the file to remove the `*` character'
		);
		expect(build).not.toHaveBeenCalled();
	});

	test('rejects literal wildcard filenames in compiled executables', async () => {
		mock_embedded_files({ client: ['asterisk*.txt'] });

		await expect(adapter({ buildOptions: { compile: true } }).adapt(builder())).rejects.toThrow(
			'Rename the file to remove the `*` character'
		);
		expect(build).not.toHaveBeenCalled();
	});

	test('does not duplicate the base path for prerendered pages', async () => {
		await adapter().adapt(
			builder({
				base: '/base',
				app_path: 'base/_app',
				prerendered_files: ['prerendered/index.html'],
				prerendered_pages: [['/base/prerendered/', { file: 'prerendered/index.html' }]]
			})
		);

		const source = build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('...prerendered_page("/base/prerendered/", "prerendered/index.html")');
		expect(source).not.toContain('/base/base/');
	});

	test('serves prerendered redirects from their original paths', async () => {
		await adapter().adapt(
			builder({
				prerendered_redirects: [['/old', { status: 301, location: '/new' }]]
			})
		);

		const source = build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('prerendered_redirect("/old", 301, "/new")');
	});

	test('passes supported advanced build options to Bun', async () => {
		mock_embedded_files({ client: ['data.json'] });

		await adapter({
			out: 'dist',
			buildOptions: {
				compile: { outfile: 'advanced-app', target: 'bun-linux-x64' },
				minify: true,
				bytecode: true,
				sourcemap: 'linked'
			}
		}).adapt(builder());

		expect(build.mock.calls[0][0]).toMatchObject({
			target: 'bun',
			format: 'esm',
			outdir: 'dist',
			compile: { outfile: 'advanced-app', target: 'bun-linux-x64' },
			minify: true,
			bytecode: true,
			sourcemap: 'linked'
		});
	});

	test('runs server instrumentation before starting the server', async () => {
		const test_builder = builder({ instrumentation: true });

		await adapter({ out: 'dist' }).adapt(test_builder);

		const options = build.mock.calls[0][0];
		expect(options.entrypoints).toEqual([index_file]);
		expect(options.files[index_file]).toBe(
			`import ".svelte-kit/output/server/instrumentation.server.js";\nawait import(${JSON.stringify(start_file)});`
		);
		expect(options.files[start_file]).toBe(adapter_entrypoint);
		expect(test_builder.instrument).not.toHaveBeenCalled();
	});

	test('runs server instrumentation before starting a compiled executable', async () => {
		const test_builder = builder({ instrumentation: true });

		await adapter({ buildOptions: { compile: true } }).adapt(test_builder);

		const options = build.mock.calls[0][0];
		expect(options.entrypoints).toEqual([index_file]);
		expect(options.files[index_file]).toBe(
			`import ".svelte-kit/output/server/instrumentation.server.js";\nawait import(${JSON.stringify(start_file)});`
		);
		expect(options.files[start_file]).toBe(adapter_entrypoint);
		expect(test_builder.instrument).not.toHaveBeenCalled();
	});
});

test('the runtime reader reuses the generated Bun file', () => {
	const source = readFileSync(new URL('./src/handler.js', import.meta.url), 'utf8');
	expect(source).toContain('server_assets.get(file)?.stream() ?? null');
	expect(source).not.toContain('Bun.file(');
	expect(source).not.toContain('asset_path');
});

test('publishes the runtime sources without a stale build lifecycle', () => {
	const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
	expect(pkg.files).toContain('src/*.js');
	expect(pkg.files).not.toContain('files');
	expect(pkg.scripts.build).toBeUndefined();
	expect(pkg.scripts.prepublishOnly).toBeUndefined();
});

function mock_embedded_files({
	client = [],
	pages = [],
	dependencies = [],
	data = []
}: {
	client?: string[];
	pages?: string[];
	dependencies?: string[];
	data?: string[];
}) {
	vi.mocked(readdir).mockImplementation((path) => {
		const directory = String(path);
		const files = directory.endsWith('/client')
			? client
			: directory.endsWith('/prerendered/pages')
				? pages
				: directory.endsWith('/prerendered/dependencies')
					? dependencies
					: data;

		return files.map((file) => {
			const segments = file.split('/');
			const name = /** @type {string} */ segments.pop();
			return {
				name,
				parentPath: [directory, ...segments].join('/'),
				isFile: () => true
			};
		}) as any;
	});
}

function builder({
	client_files = [],
	prerendered_files = [],
	prerendered_pages = [],
	prerendered_redirects = [],
	routes = [],
	server_assets = [],
	app_path = '_app',
	base = '',
	origin,
	instrumentation = false
}: {
	client_files?: string[];
	prerendered_files?: string[];
	prerendered_pages?: Array<[string, { file: string }]>;
	prerendered_redirects?: Array<[string, { status: number; location: string }]>;
	routes?: Array<{ id: string; prerender: boolean | string }>;
	server_assets?: string[];
	app_path?: string;
	base?: string;
	origin?: string;
	instrumentation?: boolean;
} = {}) {
	return {
		config: { kit: { outDir: '.svelte-kit', paths: { base, origin } } },
		routes,
		prerendered: {
			pages: new Map(prerendered_pages),
			redirects: new Map(prerendered_redirects)
		},
		log: { minor() {}, error() {}, warn() {}, info() {} },
		getServerDirectory: () => '.svelte-kit/output/server',
		rimraf() {},
		writeClient: () => client_files,
		writePrerendered: () => prerendered_files,
		findServerAssets: vi.fn(() => server_assets),
		generateManifest: () => '{}',
		getAppPath: () => app_path,
		hasServerInstrumentationFile: () => instrumentation,
		instrument: vi.fn()
	} as any;
}
