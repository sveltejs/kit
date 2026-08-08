import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import adapter from './index.js';

vi.mock('node:fs/promises', async (import_original) => {
	const actual = await import_original<typeof import('node:fs/promises')>();
	return { ...actual, readdir: vi.fn() };
});

const { build, file } = vi.hoisted(() => {
	const build = vi.fn((_options: any) => ({ success: true, logs: [], outputs: [] }));
	const file = vi.fn((path: string) => ({
		type: path.endsWith('.html')
			? 'text/html;charset=utf-8'
			: path.endsWith('.json')
				? 'application/json;charset=utf-8'
				: 'text/plain;charset=utf-8'
	}));
	vi.stubGlobal('Bun', { build, file });
	return { build, file };
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
			compile: false
		});
		expect(options.plugins[0].name).toBe('adapter-bun');
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

		const source = build.mock.calls[0][0].files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(source).toContain(
			'const file_0 = Bun.file(resolve(import.meta.dir, "client/data.json"))'
		);
		expect(source).toContain('"/data.json": file_0');
		expect(source).toContain('new Response(file_2, { headers:');
		expect(source).toContain(
			'const file_3 = Bun.file(resolve(import.meta.dir, "prerendered/prerendered/index.html"))'
		);
		expect(source).toContain(
			'export const server_assets = new Map([["_app/immutable/assets/read.txt", file_2]])'
		);
		expect(source).not.toContain('["data.json", file_0]');
		expect(source).not.toContain('export const files');
		expect(source).not.toContain('files.get');
		expect(source).not.toContain('asset_path');
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
		const source = options.files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(options.compile).toEqual({ outfile: 'server' });
		expect(source).toContain("with { type: 'file' }");
		expect(source).toContain('const file_0 = Bun.file(asset_0)');
		expect(source).toContain('const file_1 = Bun.file(asset_1)');
		expect(source).toContain('["_app/immutable/assets/read.txt", file_1]');
		expect(source).toContain('"/data.json": new Response(file_0');
		expect(source).not.toContain('export const files');
		expect(source).not.toContain('files.get');
		expect(source).not.toContain('asset_path');
	});

	test('preserves dotfiles other than Vite build metadata in executables', async () => {
		mock_embedded_files({ client: ['.vite/manifest.json', '.well-known/assetlinks.json'] });

		await adapter({ buildOptions: { compile: true } }).adapt(builder());

		const source = build.mock.calls[0][0].files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(source).toContain('assetlinks.json');
		expect(source).toContain('"/.well-known/assetlinks.json"');
		expect(source).not.toContain('.vite/manifest.json');
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

		const source = build.mock.calls[0][0].files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(source).toContain('"/base/prerendered/": file_0');
		expect(source).toContain('"/base/prerendered": (request) => Response.redirect');
		expect(source).toContain('new URL(request.url).search');
		expect(source).not.toContain('/base/base/');
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

		expect(build.mock.calls[0][0].entrypoints).toEqual([
			new URL('./src/index.js', import.meta.url).pathname,
			new URL('./src/handler.js', import.meta.url).pathname,
			'.svelte-kit/output/server/instrumentation.server.js'
		]);
		expect(test_builder.instrument).toHaveBeenCalledWith({
			entrypoint: 'dist/index.js',
			instrumentation: 'dist/instrumentation.server.js',
			module: {
				exports: ['server', 'unix']
			}
		});
	});

	test('runs server instrumentation before starting a compiled executable', async () => {
		const test_builder = builder({ instrumentation: true });

		await adapter({ buildOptions: { compile: true } }).adapt(test_builder);

		const options = build.mock.calls[0][0];
		expect(options.entrypoints).toEqual(['.svelte-kit/output/server/adapter-bun-instrumented.js']);
		expect(options.files[options.entrypoints[0]]).toBe(
			`import './instrumentation.server.js';\nawait import(${JSON.stringify(new URL('./src/index.js', import.meta.url).pathname)});`
		);
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
	routes = [],
	server_assets = [],
	app_path = '_app',
	base = '',
	instrumentation = false
}: {
	client_files?: string[];
	prerendered_files?: string[];
	prerendered_pages?: Array<[string, { file: string }]>;
	routes?: Array<{ id: string; prerender: boolean | string }>;
	server_assets?: string[];
	app_path?: string;
	base?: string;
	instrumentation?: boolean;
} = {}) {
	return {
		config: { kit: { outDir: '.svelte-kit', paths: { base, origin: undefined } } },
		routes,
		prerendered: { pages: new Map(prerendered_pages) },
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
