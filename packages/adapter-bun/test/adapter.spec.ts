import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, mock, spyOn, test, type Mock } from 'bun:test';
import adapter from '../index.js';

const package_dir = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const index_file = `${package_dir}/src/index.js`;
const manifest_file = `${package_dir}/.svelte-kit/output/server/manifest.js`;
const routes_file = `${package_dir}/src/routes.js`;
const options_file = `${package_dir}/src/options.js`;
const start_file = `${package_dir}/src/start.js`;

const entrypoint = '// generated server entrypoint';

let bun_build: Mock<(options: any) => Promise<any>>;
let read_dir: Mock<typeof fs.readdirSync>;
let exists: Mock<typeof fs.existsSync>;
let read_file: Mock<typeof fs.readFileSync>;

// the real Bun.build would bundle and the real hashers would read assets off
// disk, so the build APIs stay test doubles even under Bun
beforeEach(() => {
	bun_build = spyOn(Bun, 'build').mockImplementation((async (_options: any): Promise<any> => ({
		success: true,
		logs: [],
		outputs: []
	})) as any) as any;
	spyOn(Bun, 'file').mockImplementation(((_path: string) => ({
		text: async () => entrypoint,
		stream: () => new Blob([]).stream(),
		lastModified: 0
	})) as never);
	spyOn(Bun, 'CryptoHasher').mockImplementation(function () {
		return {
			update() {},
			digest() {
				return 'abc';
			}
		};
	} as never);
	spyOn(Bun, 'hash').mockImplementation(((input: string) => {
		let hash = 0n;
		for (const char of input) hash = hash * 31n + BigInt(char.charCodeAt(0));
		return hash;
	}) as never);

	read_dir = spyOn(fs, 'readdirSync').mockReturnValue([]) as any;
	exists = spyOn(fs, 'existsSync').mockReturnValue(true);
	spyOn(fs, 'rmSync').mockImplementation(() => {});
	read_file = spyOn(fs, 'readFileSync').mockImplementation((() => undefined) as any) as any;
});

afterEach(() => {
	mock.restore();
});

describe('adapter contract', () => {
	test('identifies itself and declares supported SvelteKit features', () => {
		const instance = adapter();

		expect(instance.name).toBe('@sveltejs/adapter-bun');
		expect(instance.supports?.read?.({ route: { id: '/file' }, config: {} })).toBe(true);
		expect(instance.supports?.instrumentation?.()).toBe(true);
	});

	test('requires the SvelteKit build to run in Bun', () => {
		// the Bun global cannot be unset inside Bun itself, so run the guard under Node
		const result = Bun.spawnSync([
			'node',
			'--input-type=module',
			'-e',
			`import adapter from ${JSON.stringify(`${package_dir}/index.js`)};\n` +
				'await adapter().adapt({}).then(\n' +
				'\t() => process.exit(0),\n' +
				'\t(error) => { console.error(error.message); process.exit(1); }\n' +
				');'
		]);

		expect(result.exitCode).toBe(1);
		expect(result.stderr.toString()).toContain(
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

		const options = bun_build.mock.calls[0][0];
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

		const files = bun_build.mock.calls[0][0].files;
		expect(files[manifest_file]).toBe(
			'export const app_dir = "_app";\n' +
				'export const base = "/docs";\n' +
				'export const embed = false;\n' +
				'export const env_prefix = "APP_";\n' +
				'export const origin = "https://example.com";'
		);
		expect(files[options_file]).toBe(
			'export default {"hostname":"127.0.0.1","port":4000,"development":true};'
		);
		expect(builder.writeServerEntrypoint).toHaveBeenCalledWith(
			'.svelte-kit/output/bun-tmp/server.js'
		);
	});

	test('resolves generated runtime modules through the Bun plugin', async () => {
		await adapter().adapt(create_builder());
		const on_resolve = mock((_options: any, _callback: any) => {});
		bun_build.mock.calls[0][0].plugins[0].setup({ onResolve: on_resolve, onLoad: mock() });

		expect(on_resolve).toHaveBeenCalledWith(
			{ filter: /^(SERVER|MANIFEST|ROUTES|SERVER_OPTIONS)$/ },
			expect.any(Function)
		);
		const resolve_module = on_resolve.mock.calls[0][1];
		expect(resolve_module({ path: 'SERVER' })).toEqual({
			path: '.svelte-kit/output/bun-tmp/server.js'
		});
		expect(resolve_module({ path: 'MANIFEST' })).toEqual({ path: manifest_file });
		expect(resolve_module({ path: 'ROUTES' })).toEqual({ path: routes_file });
		expect(resolve_module({ path: 'SERVER_OPTIONS' })).toEqual({ path: options_file });
	});

	test('gives side-effect-only chunks a per-importer identity so their copies cannot collide', async () => {
		const chunks_dir = path.resolve('.svelte-kit/output/server/chunks');
		mock_chunks(chunks_dir, { 'events.js': "import './other.js';\nexport {};\n" });

		await adapter().adapt(create_builder());
		const on_resolve = mock((_options: any, _callback: any) => {});
		const on_load = mock((_options: any, _callback: any) => {});
		bun_build.mock.calls[0][0].plugins[0].setup({ onResolve: on_resolve, onLoad: on_load });

		const resolve_chunk = on_resolve.mock.calls[1][1];
		const load_chunk = on_load.mock.calls.find(
			([options]) => options.namespace === 'adapter-bun-side-effect'
		)![1];

		const first = resolve_chunk({
			path: './events.js',
			resolveDir: chunks_dir,
			importer: `${chunks_dir}/a.js`
		});
		const second = resolve_chunk({
			path: './events.js',
			resolveDir: chunks_dir,
			importer: `${chunks_dir}/b.js`
		});
		expect(first.namespace).toBe('adapter-bun-side-effect');
		expect(first.path.startsWith(`${chunks_dir}/events.js?`)).toBe(true);
		expect(first.path).not.toBe(second.path);

		const first_load = load_chunk({ path: first.path });
		const second_load = load_chunk({ path: second.path });
		expect(first_load.contents).toContain("import './other.js';");
		expect(first_load.contents).not.toBe(second_load.contents);

		// chunks with real exports keep their shared identity
		expect(
			resolve_chunk({ path: './real.js', resolveDir: chunks_dir, importer: `${chunks_dir}/a.js` })
		).toBeUndefined();
	});

	test('leaves the plugin out when no chunk is side-effect-only', async () => {
		mock_chunks(path.resolve('.svelte-kit/output/server/chunks'), {
			'real.js': 'export const x = 1;\n'
		});

		await adapter().adapt(create_builder());
		const on_resolve = mock((_options: any, _callback: any) => {});
		bun_build.mock.calls[0][0].plugins[0].setup({ onResolve: on_resolve, onLoad: mock() });

		expect(on_resolve).toHaveBeenCalledTimes(1);
	});

	test('keeps virtual entrypoints resolvable when a chunk shares their name', async () => {
		const chunks_dir = path.resolve('.svelte-kit/output/server/chunks');
		mock_chunks(chunks_dir, { 'start.js': "import './other.js';\nexport {};\n" });

		await adapter().adapt(create_builder({ instrumentation: true }));
		const on_resolve = mock((_options: any, _callback: any) => {});
		bun_build.mock.calls[0][0].plugins[0].setup({ onResolve: on_resolve, onLoad: mock() });

		// resolving nothing here would send Bun to the filesystem, where start.js does not exist
		expect(on_resolve.mock.calls[1][1]({ path: start_file, resolveDir: package_dir })).toEqual({
			path: start_file
		});
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

		expect(bun_build.mock.calls[0][0]).toMatchObject({
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

		expect(bun_build.mock.calls[0][0].compile).toEqual(expected);
	});

	test('loads instrumentation before the generated server entrypoint', async () => {
		const builder = create_builder({ instrumentation: true });
		await adapter().adapt(builder);

		const files = bun_build.mock.calls[0][0].files;
		expect(files[index_file]).toBe(
			`import ".svelte-kit/output/server/instrumentation.server.js";\nawait import(${JSON.stringify(start_file)});`
		);
		expect(files[start_file]).toBe(entrypoint);
		expect(builder.instrument).not.toHaveBeenCalled();

		// start.js must be its own entrypoint so asset paths resolve from the output root
		expect(bun_build.mock.calls[0][0].entrypoints).toEqual([index_file, start_file]);
	});

	test('keeps a single entrypoint when compiling with instrumentation', async () => {
		const builder = create_builder({ instrumentation: true });
		await adapter({ buildOptions: { compile: true } }).adapt(builder);

		expect(bun_build.mock.calls[0][0].entrypoints).toEqual([index_file]);
	});

	test('reports every Bun diagnostic before failing the build', async () => {
		bun_build.mockResolvedValueOnce({
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
		const source = bun_build.mock.calls[0][0].files[routes_file];
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

		const source = bun_build.mock.calls[0][0].files[routes_file];
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

		const source = bun_build.mock.calls[0][0].files[routes_file];
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
		expect(bun_build).not.toHaveBeenCalled();
	});

	test('precompresses assets and marks the variants in the generated routes', async () => {
		const builder = create_builder({ client_files: ['app.js'] });

		await adapter({ precompress: true }).adapt(builder);

		expect(builder.compress).toHaveBeenCalledWith('build/client');
		expect(builder.compress).toHaveBeenCalledWith('build/prerendered');
		const source = bun_build.mock.calls[0][0].files[routes_file];
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

		const source = bun_build.mock.calls[0][0].files[routes_file];
		expect(source).not.toContain('.env');
		expect(source).toContain(
			'...client_asset(".well-known/security.txt", undefined, {"hash":"abc","mtime":0})'
		);
		expect(source).toContain('...client_asset("ok.txt", undefined, {"hash":"abc","mtime":0})');
	});

	test('embedded builds tolerate absent output directories but propagate readdir errors', async () => {
		exists.mockReturnValue(false);
		await adapter({ buildOptions: { compile: true } }).adapt(create_builder());
		expect(bun_build).toHaveBeenCalledTimes(1);
		expect(read_dir).not.toHaveBeenCalled();

		exists.mockReturnValue(true);
		read_dir.mockImplementation(() => {
			throw Object.assign(new Error('denied'), { code: 'EACCES' });
		});
		await expect(
			adapter({ buildOptions: { compile: true } }).adapt(create_builder())
		).rejects.toThrow('denied');
	});

	test('excludes dotfiles from embedded assets', async () => {
		mock_files({ client: ['.secret', 'public.txt'] });

		await adapter({ buildOptions: { compile: true } }).adapt(create_builder());

		const source = bun_build.mock.calls[0][0].files[routes_file];
		expect(source).not.toContain('.secret');
		expect(source).toContain('...client_asset("public.txt", asset_0, {"hash":"abc","mtime":0})');
	});

	test('rejects route segments starting with a colon', async () => {
		const builder = create_builder({ client_files: [':tag.txt'] });

		await expect(adapter().adapt(builder)).rejects.toThrow('starts with `:`');
		expect(bun_build).not.toHaveBeenCalled();
	});

	test('embedded assets with the same relative path keep distinct imports', async () => {
		mock_files({ client: ['page.html'], pages: ['page.html'] });

		await adapter({ buildOptions: { compile: true } }).adapt(
			create_builder({ prerendered_pages: [['/page/', { file: 'page.html' }]] })
		);

		const source = bun_build.mock.calls[0][0].files[routes_file];
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
		expect(bun_build).not.toHaveBeenCalled();
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

function mock_chunks(chunks_dir: string, sources: Record<string, string>) {
	read_dir.mockImplementation(((directory: unknown) =>
		String(directory) === chunks_dir
			? Object.keys(sources).map((name) => ({
					name,
					parentPath: chunks_dir,
					isFile: () => true
				}))
			: []) as unknown as typeof fs.readdirSync);
	read_file.mockImplementation(
		((file: unknown) => sources[path.basename(String(file))]) as unknown as typeof fs.readFileSync
	);
}

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
	read_dir.mockImplementation(((dir: unknown) => {
		const directory = String(dir);
		const files = directory.endsWith('/client')
			? client
			: directory.endsWith('/prerendered/pages')
				? pages
				: directory.endsWith('/prerendered/dependencies')
					? dependencies
					: data;

		return files.map((file) => {
			const segments = file.split('/');
			const name = segments.pop();
			return {
				name,
				parentPath: [directory, ...segments].join('/'),
				isFile: () => true
			};
		});
	}) as unknown as typeof fs.readdirSync);
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
		config: { outDir: '.svelte-kit', paths: { base, origin }, appDir: '_app' },
		routes,
		prerendered: {
			pages: new Map(prerendered_pages),
			redirects: new Map(prerendered_redirects)
		},
		log: {
			minor: mock((_message: string) => {}),
			error: mock((_message: string) => {}),
			warn: mock((_message: string) => {}),
			info: mock((_message: string) => {})
		},
		getAppPath: () => `${base}/_app`,
		writeServerEntrypoint: mock(() => {}),
		getBuildDirectory: (dir: string) => `.svelte-kit/output/${dir}`,
		getServerDirectory: () => '.svelte-kit/output/server',
		writeClient: mock(() => client_files),
		writePrerendered: mock(() => prerendered_files),
		compress: mock(async (_directory: string) => {}),
		findServerAssets: mock(() => server_assets),
		generateManifest: mock(() => '{"appDir":"_app"}'),
		hasServerInstrumentationFile: () => instrumentation,
		instrument: mock(() => {})
	} as any;
}
