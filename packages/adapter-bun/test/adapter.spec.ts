import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import adapter from '../index.js';

const package_dir = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const index_file = `${package_dir}/src/index.js`;
const manifest_file = `${package_dir}/.svelte-kit/output/server/manifest.js`;
const routes_file = `${package_dir}/src/routes.js`;
const options_file = `${package_dir}/src/options.js`;
const start_file = `${package_dir}/src/start.js`;

vi.mock('node:fs', async (import_original) => {
	const actual = await import_original<typeof import('node:fs')>();
	const mocked = { ...actual, readdirSync: vi.fn(), existsSync: vi.fn(), rmSync: vi.fn() };
	return { ...mocked, default: mocked };
});

const bun = vi.hoisted(() => ({
	entrypoint: '// generated server entrypoint',
	build: vi.fn(async (_options: any): Promise<any> => ({ success: true, logs: [], outputs: [] })),
	file: vi.fn((_path: string) => ({
		text: async () => '// generated server entrypoint',
		stream: () => new Blob([]).stream(),
		lastModified: 0
	})),
	CryptoHasher: class {
		update() {}
		digest() {
			return 'abc';
		}
	}
}));

beforeEach(() => {
	vi.stubGlobal('Bun', { build: bun.build, file: bun.file, CryptoHasher: bun.CryptoHasher });
	vi.mocked(fs.readdirSync).mockReturnValue([]);
	vi.mocked(fs.existsSync).mockReturnValue(true);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('adapter contract', () => {
	test('identifies itself and declares supported SvelteKit features', () => {
		const instance = adapter();

		expect(instance.name).toBe('@sveltejs/adapter-bun');
		expect(instance.supports?.read?.({ route: { id: '/file' }, config: {} })).toBe(true);
		expect(instance.supports?.instrumentation?.()).toBe(true);
	});

	test('requires the SvelteKit build to run in Bun', async () => {
		vi.stubGlobal('Bun', undefined);

		await expect(adapter().adapt(create_builder())).rejects.toThrow(
			'adapter-bun requires running the SvelteKit build with Bun'
		);
	});
});

describe('Bun build configuration', () => {
	test('cleans the output and supplies production defaults', async () => {
		const builder = create_builder();
		await adapter().adapt(builder);

		expect(fs.rmSync).toHaveBeenCalledWith('build', { recursive: true, force: true });
		expect(builder.log.minor).toHaveBeenCalledWith('Building server');

		const options = bun.build.mock.calls[0][0];
		expect(options).toMatchObject({
			entrypoints: [index_file],
			outdir: 'build',
			target: 'bun',
			format: 'esm',
			splitting: true,
			sourcemap: 'external',
			conditions: ['bun', 'node'],
			throw: false,
			compile: false
		});
		expect(options.naming).toEqual({
			entry: '[name].[ext]',
			chunk: 'server/chunks/[name]-[hash].[ext]',
			asset: 'server/assets/[name]-[hash].[ext]'
		});
		expect(options.plugins).toHaveLength(1);
		expect(options.plugins[0].name).toBe('adapter-bun');
	});

	test('generates manifest and server-option modules', async () => {
		const builder = create_builder({ base: '/docs', origin: 'https://example.com' });
		await adapter({
			envPrefix: 'APP_',
			serverOptions: { hostname: '127.0.0.1', port: 4000, development: true }
		}).adapt(builder);

		const files = bun.build.mock.calls[0][0].files;
		expect(files[manifest_file]).toBe(
			'export const manifest = {"appDir":"_app"};\n' +
				'export const base = "/docs";\n' +
				'export const embed = false;\n' +
				'export const env_prefix = "APP_";\n' +
				'export const origin = "https://example.com";'
		);
		expect(files[options_file]).toBe(
			'export default {"hostname":"127.0.0.1","port":4000,"development":true};'
		);
		expect(builder.generateManifest).toHaveBeenCalledWith({ relativePath: './' });
	});

	test('resolves generated runtime modules through the Bun plugin', async () => {
		await adapter().adapt(create_builder());
		const on_resolve = vi.fn();
		bun.build.mock.calls[0][0].plugins[0].setup({ onResolve: on_resolve });

		expect(on_resolve).toHaveBeenCalledWith(
			{ filter: /^(SERVER|MANIFEST|ROUTES|SERVER_OPTIONS)$/ },
			expect.any(Function)
		);
		const resolve_module = on_resolve.mock.calls[0][1];
		expect(resolve_module({ path: 'SERVER' })).toEqual({
			path: '.svelte-kit/output/server/index.js'
		});
		expect(resolve_module({ path: 'MANIFEST' })).toEqual({ path: manifest_file });
		expect(resolve_module({ path: 'ROUTES' })).toEqual({ path: routes_file });
		expect(resolve_module({ path: 'SERVER_OPTIONS' })).toEqual({ path: options_file });
	});

	test('passes supported advanced options while retaining reserved options', async () => {
		await adapter({
			out: 'dist',
			buildOptions: {
				compile: { outfile: 'application', target: 'bun-linux-x64' },
				minify: true,
				bytecode: true,
				sourcemap: 'linked',
				drop: ['debugger']
			}
		}).adapt(create_builder());

		expect(bun.build.mock.calls[0][0]).toMatchObject({
			outdir: 'dist',
			target: 'bun',
			format: 'esm',
			minify: true,
			bytecode: true,
			sourcemap: 'linked',
			drop: ['debugger'],
			compile: { outfile: 'application', target: 'bun-linux-x64' }
		});
	});

	test.each([
		[true, { outfile: 'server' }],
		['bun-linux-x64', { outfile: 'server', target: 'bun-linux-x64' }],
		[
			{ target: 'bun-windows-x64', windows: { hideConsole: true } },
			{
				outfile: 'server',
				target: 'bun-windows-x64',
				windows: { hideConsole: true }
			}
		]
	] as const)('normalizes compile option %j', async (compile, expected) => {
		await adapter({ buildOptions: { compile } }).adapt(create_builder());

		expect(bun.build.mock.calls[0][0].compile).toEqual(expected);
	});

	test('loads instrumentation before the generated server entrypoint', async () => {
		const builder = create_builder({ instrumentation: true });
		await adapter().adapt(builder);

		const files = bun.build.mock.calls[0][0].files;
		expect(files[index_file]).toBe(
			`import ".svelte-kit/output/server/instrumentation.server.js";\nawait import(${JSON.stringify(start_file)});`
		);
		expect(files[start_file]).toBe(bun.entrypoint);
		expect(builder.instrument).not.toHaveBeenCalled();

		// start.js must be its own entrypoint so asset paths resolve from the output root
		expect(bun.build.mock.calls[0][0].entrypoints).toEqual([index_file, start_file]);
	});

	test('keeps a single entrypoint when compiling with instrumentation', async () => {
		const builder = create_builder({ instrumentation: true });
		await adapter({ buildOptions: { compile: true } }).adapt(builder);

		expect(bun.build.mock.calls[0][0].entrypoints).toEqual([index_file]);
	});

	test('reports every Bun diagnostic before failing the build', async () => {
		bun.build.mockResolvedValueOnce({
			success: false,
			logs: [
				{ level: 'error', message: 'broken' },
				{ level: 'warning', message: 'careful' },
				{ level: 'info', message: 'context' }
			],
			outputs: []
		});
		const builder = create_builder();

		await expect(adapter().adapt(builder)).rejects.toBeInstanceOf(AggregateError);
		expect(builder.log.error).toHaveBeenCalledWith('broken');
		expect(builder.log.warn).toHaveBeenCalledWith('careful');
		expect(builder.log.info).toHaveBeenCalledWith('context');
	});
});

describe('generated routes', () => {
	test('writes regular-build assets and excludes prerendered routes from server reads', async () => {
		const dynamic = { id: '/read', prerender: false };
		const prerendered = { id: '/prerendered', prerender: true };
		const builder = create_builder({
			client_files: ['data.json', '_app/immutable/read.txt'],
			prerendered_files: ['page/index.html', 'icon.png'],
			prerendered_pages: [['/page/', { file: 'page/index.html' }]],
			prerendered_redirects: [['/old', { status: 301, location: '/new' }]],
			routes: [dynamic, prerendered],
			server_assets: ['_app/immutable/read.txt']
		});

		await adapter().adapt(builder);

		expect(builder.findServerAssets).toHaveBeenCalledWith([dynamic]);
		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('...client_asset("data.json", undefined, {"hash":"abc","mtime":0})');
		expect(source).toContain(
			'...client_asset("_app/immutable/read.txt", undefined, {"hash":"abc","mtime":0})'
		);
		expect(source).toContain(
			'...prerendered_page("/page/", "page/index.html", {"hash":"abc","mtime":0})'
		);
		expect(source).toContain('prerendered_asset("icon.png", undefined, {"hash":"abc","mtime":0})');
		expect(source).toContain('prerendered_redirect("/old", 301, "/new")');
		expect(source).toContain(
			'["_app/immutable/read.txt", server_asset("_app/immutable/read.txt")]'
		);
	});

	test('does not prepend the base to prerendered route paths a second time', async () => {
		await adapter().adapt(
			create_builder({
				base: '/base',
				prerendered_files: ['page/index.html'],
				prerendered_pages: [['/base/page/', { file: 'page/index.html' }]]
			})
		);

		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).toContain(
			'...prerendered_page("/base/page/", "page/index.html", {"hash":"abc","mtime":0})'
		);
		expect(source).not.toContain('/base/base/');
	});

	test('embeds assets in compiled executables and ignores Vite metadata', async () => {
		mock_files({
			client: ['data.json', '.vite/manifest.json', '.well-known/asset.txt', '_app/read.txt'],
			pages: ['page/index.html', 'favicon.ico'],
			dependencies: ['dependency.json'],
			data: ['page/__data.json']
		});

		await adapter({ buildOptions: { compile: true } }).adapt(
			create_builder({
				prerendered_pages: [['/page/', { file: 'page/index.html' }]],
				server_assets: ['_app/read.txt']
			})
		);

		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).toContain("with { type: 'file' }");
		expect(source).toContain('...client_asset("data.json", asset_0, {"hash":"abc","mtime":0})');
		expect(source).toContain(
			'...client_asset(".well-known/asset.txt", asset_1, {"hash":"abc","mtime":0})'
		);
		expect(source).toContain('...prerendered_page("/page/", asset_3, {"hash":"abc","mtime":0})');
		expect(source).toContain('prerendered_asset("favicon.ico", asset_4, {"hash":"abc","mtime":0})');
		expect(source).toContain(
			'prerendered_asset("dependency.json", asset_5, {"hash":"abc","mtime":0})'
		);
		expect(source).toContain(
			'prerendered_asset("page/__data.json", asset_6, {"hash":"abc","mtime":0})'
		);
		expect(source).toContain('["_app/read.txt", server_asset("_app/read.txt", asset_2)]');
		expect(source).not.toContain('.vite/manifest.json');
	});

	test.each([false, true])('rejects wildcard filenames when compile is %s', async (compile) => {
		if (compile) mock_files({ client: ['literal*.txt'] });
		const builder = create_builder({ client_files: ['literal*.txt'] });

		await expect(adapter({ buildOptions: { compile } }).adapt(builder)).rejects.toThrow(
			'Bun treats literal `*` characters in route paths as wildcards'
		);
		expect(bun.build).not.toHaveBeenCalled();
	});

	test('precompresses assets and marks the variants in the generated routes', async () => {
		const builder = create_builder({ client_files: ['app.js'] });

		await adapter({ precompress: true }).adapt(builder);

		expect(builder.compress).toHaveBeenCalledWith('build/client');
		expect(builder.compress).toHaveBeenCalledWith('build/prerendered');
		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).toContain(
			'...client_asset("app.js", undefined, {"hash":"abc","mtime":0,"br":true,"gz":true})'
		);
	});

	test('warns when precompress is combined with compile', async () => {
		const builder = create_builder();

		await adapter({ precompress: true, buildOptions: { compile: true } }).adapt(builder);

		expect(builder.log.warn).toHaveBeenCalledWith(
			expect.stringContaining('precompress is ignored')
		);
		expect(builder.compress).not.toHaveBeenCalled();
	});

	test('does not compress by default', async () => {
		const builder = create_builder({ client_files: ['app.js'] });

		await adapter().adapt(builder);

		expect(builder.compress).not.toHaveBeenCalled();
	});

	test('does not register dotfiles apart from .well-known', async () => {
		const builder = create_builder({
			client_files: ['.env', '.well-known/security.txt', 'ok.txt']
		});

		await adapter().adapt(builder);

		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).not.toContain('.env');
		expect(source).toContain(
			'...client_asset(".well-known/security.txt", undefined, {"hash":"abc","mtime":0})'
		);
		expect(source).toContain('...client_asset("ok.txt", undefined, {"hash":"abc","mtime":0})');
	});

	test('embedded builds tolerate absent output directories but propagate readdir errors', async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		await adapter({ buildOptions: { compile: true } }).adapt(create_builder());
		expect(bun.build).toHaveBeenCalledOnce();
		expect(fs.readdirSync).not.toHaveBeenCalled();

		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readdirSync).mockImplementation(() => {
			throw Object.assign(new Error('denied'), { code: 'EACCES' });
		});
		await expect(
			adapter({ buildOptions: { compile: true } }).adapt(create_builder())
		).rejects.toThrow('denied');
	});

	test('excludes dotfiles from embedded assets', async () => {
		mock_files({ client: ['.secret', 'public.txt'] });

		await adapter({ buildOptions: { compile: true } }).adapt(create_builder());

		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).not.toContain('.secret');
		expect(source).toContain('...client_asset("public.txt", asset_0, {"hash":"abc","mtime":0})');
	});

	test('rejects route segments starting with a colon', async () => {
		const builder = create_builder({ client_files: [':tag.txt'] });

		await expect(adapter().adapt(builder)).rejects.toThrow('starts with `:`');
		expect(bun.build).not.toHaveBeenCalled();
	});

	test('embedded assets with the same relative path keep distinct imports', async () => {
		mock_files({ client: ['page.html'], pages: ['page.html'] });

		await adapter({ buildOptions: { compile: true } }).adapt(
			create_builder({ prerendered_pages: [['/page/', { file: 'page.html' }]] })
		);

		const source = bun.build.mock.calls[0][0].files[routes_file];
		expect(source).toContain('...client_asset("page.html", asset_0, {"hash":"abc","mtime":0})');
		expect(source).toContain('...prerendered_page("/page/", asset_1, {"hash":"abc","mtime":0})');
	});

	test('rejects wildcard characters in prerendered redirect sources', async () => {
		const builder = create_builder({
			prerendered_redirects: [['/docs/*', { status: 308, location: '/new' }]]
		});

		await expect(adapter().adapt(builder)).rejects.toThrow(
			'Bun treats literal `*` characters in route paths as wildcards'
		);
		expect(bun.build).not.toHaveBeenCalled();
	});

	test('fails when a prerendered page is absent from compiled build output', async () => {
		await expect(
			adapter({ buildOptions: { compile: true } }).adapt(
				create_builder({ prerendered_pages: [['/missing', { file: 'missing.html' }]] })
			)
		).rejects.toThrow('Could not find prerendered page missing.html for route /missing');
	});

	test('fails when a server-readable asset is absent from compiled build output', async () => {
		await expect(
			adapter({ buildOptions: { compile: true } }).adapt(
				create_builder({ server_assets: ['missing.txt'] })
			)
		).rejects.toThrow('Could not find server asset missing.txt');
	});
});

function mock_files({
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
	vi.mocked(fs.readdirSync).mockImplementation((path) => {
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
		}) as unknown as ReturnType<typeof fs.readdirSync>;
	});
}

function create_builder({
	client_files = [],
	prerendered_files = [],
	prerendered_pages = [],
	prerendered_redirects = [],
	routes = [],
	server_assets = [],
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
	base?: string;
	origin?: string;
	instrumentation?: boolean;
} = {}) {
	return {
		config: { outDir: '.svelte-kit', paths: { base, origin } },
		routes,
		prerendered: {
			pages: new Map(prerendered_pages),
			redirects: new Map(prerendered_redirects)
		},
		log: {
			minor: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn()
		},
		getServerDirectory: () => '.svelte-kit/output/server',
		writeClient: vi.fn(() => client_files),
		writePrerendered: vi.fn(() => prerendered_files),
		compress: vi.fn(async () => {}),
		findServerAssets: vi.fn(() => server_assets),
		generateManifest: vi.fn(() => '{"appDir":"_app"}'),
		hasServerInstrumentationFile: () => instrumentation,
		instrument: vi.fn()
	} as any;
}
