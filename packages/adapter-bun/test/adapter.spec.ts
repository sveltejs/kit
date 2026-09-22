import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, mock, spyOn, test, type Mock } from 'bun:test';
import adapter from '../index.js';

const package_dir = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const src_dir = `${package_dir}/src`;
const server_dir = '.svelte-kit/output/server';
const handoff_file = `${process.cwd()}/.svelte-kit/output/adapter-bun.js`;
const entrypoint = `${server_dir}/adapter-index.js`;
const handoff = '#@sveltejs/adapter-bun';

let bun_build: Mock<(options: any) => Promise<any>>;
let read_file: Mock<typeof fs.readFileSync>;
let write_file: Mock<typeof fs.writeFileSync>;

// the real Bun.build would bundle and the real hashers would read assets off
// disk, so the build APIs stay test doubles even under Bun
beforeEach(() => {
	bun_build = spyOn(Bun, 'build').mockImplementation((async (_options: any): Promise<any> => ({
		success: true,
		logs: [],
		outputs: []
	})) as any) as any;
	spyOn(Bun, 'file').mockImplementation(((_path: string) => ({
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

	spyOn(fs, 'existsSync').mockReturnValue(true);
	spyOn(fs, 'rmSync').mockImplementation(() => {});
	read_file = spyOn(fs, 'readFileSync').mockImplementation((() => undefined) as any) as any;
	write_file = spyOn(fs, 'writeFileSync').mockImplementation(() => {});
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

describe('Vite build configuration', () => {
	test('bundles the server source with the app and keeps production dependencies external', () => {
		read_file.mockReturnValue(JSON.stringify({ dependencies: { jsdom: '1.0.0' } }));

		const options = vite_config().environments.ssr.build.rolldownOptions;

		expect(read_file).toHaveBeenCalledWith('package.json', 'utf8');
		expect(options.input).toEqual({ 'adapter-index': `${src_dir}/index.js` });
		expect(options.external).toEqual([handoff, /^jsdom(\/.*)?$/]);
		expect('jsdom/lib/api.js').toMatch(options.external[1]);
		expect('jsdom-global').not.toMatch(options.external[1]);
		expect(options.output.paths).toEqual({ [handoff]: '../adapter-bun.js' });
	});

	test('keeps adapter chunks at the output root so the hand-off path resolves', () => {
		read_file.mockReturnValue('{}');

		const { chunkFileNames } = vite_config().environments.ssr.build.rolldownOptions.output;

		expect(chunkFileNames({ moduleIds: [`${src_dir}/handler.js`, '/app/src/hooks.js'] })).toBe(
			'adapter-bun-[name].js'
		);
		expect(chunkFileNames({ moduleIds: ['/app/src/hooks.js'] })).toBe('chunks/[name].js');
	});
});

describe('build output', () => {
	test('cleans the output and copies the Vite build next to the hand-off module', async () => {
		const builder = create_builder();
		await adapter().adapt(builder);

		expect(fs.rmSync).toHaveBeenCalledWith('build', { recursive: true, force: true });
		expect(builder.log.minor).toHaveBeenCalledWith('Building server');
		expect(builder.generateServerInstance).toHaveBeenCalledWith(`${server_dir}/server.js`);
		expect(builder.copy).toHaveBeenCalledWith(server_dir, 'build/server');
		expect(builder.copy).toHaveBeenCalledWith(handoff_file, 'build/adapter-bun.js');
		expect(write_file).toHaveBeenCalledWith(
			'build/index.js',
			"import './server/adapter-index.js';\n"
		);
		expect(bun_build).not.toHaveBeenCalled();
		expect(builder.instrument).not.toHaveBeenCalled();
		expect(builder.compress).not.toHaveBeenCalled();
	});

	test('hands the configured values to the server', async () => {
		await adapter({
			envPrefix: 'APP_',
			serverOptions: { hostname: '127.0.0.1', port: 4000, development: true }
		}).adapt(
			create_builder({
				base: '/docs',
				origin: 'https://example.com',
				prerendered_files: ['page/index.html'],
				prerendered_pages: [['/docs/page/', { file: 'page/index.html' }]]
			})
		);

		expect(handoff_source()).toContain(
			"import { dirname } from 'node:path';\n" +
				"import { fileURLToPath } from 'node:url';\n" +
				"export { server } from './server/server.js';\n" +
				'export const dir = dirname(fileURLToPath(import.meta.url));\n' +
				'export const app_dir = "_app";\n' +
				'export const base = "/docs";\n' +
				'export const embed = false;\n' +
				'export const env_prefix = "APP_";\n' +
				'export const origin = "https://example.com";\n' +
				'export const server_options = {"hostname":"127.0.0.1","port":4000,"development":true};\n'
		);
		// prerendered paths already contain the base
		expect(handoff_source()).toContain('["prerendered_page", "/docs/page/", "page/index.html", ');
	});

	test('defaults the base to the root and leaves the origin undefined', async () => {
		await adapter().adapt(create_builder());

		expect(handoff_source()).toContain('export const base = "/";\n');
		expect(handoff_source()).toContain('export const origin = undefined;\n');
		expect(handoff_source()).toContain('export const server_options = {};\n');
	});

	test('loads instrumentation before the generated server entrypoint', async () => {
		const builder = create_builder({ instrumentation: true });
		await adapter().adapt(builder);

		expect(builder.createInstrumentationInitializer).toHaveBeenCalledWith({
			outputDirectory: server_dir
		});
		expect(builder.instrument).toHaveBeenCalledWith({
			entrypoint,
			instrumentation: `${server_dir}/instrumentation.server.js`,
			initializer: `${server_dir}/__sveltekit_env_init.js`,
			module: { exports: [] }
		});
	});

	test('compiles an executable from the Vite build instead of copying it', async () => {
		const builder = create_builder();
		await adapter({ buildOptions: { compile: true } }).adapt(builder);

		expect(builder.copy).not.toHaveBeenCalled();
		expect(write_file).not.toHaveBeenCalledWith('build/index.js', expect.anything());
		expect(bun_build.mock.calls[0][0]).toEqual({
			entrypoints: [entrypoint],
			outdir: 'build',
			target: 'bun',
			format: 'esm',
			sourcemap: 'external',
			conditions: ['bun', 'node'],
			throw: false,
			compile: { outfile: 'server' }
		});
		expect(handoff_source()).toContain('export const embed = true;\n');
	});

	test('passes supported advanced options while retaining reserved options', async () => {
		await adapter({
			out: 'dist',
			buildOptions: {
				compile: { outfile: 'application', target: 'bun-linux-x64' },
				minify: true,
				bytecode: true,
				sourcemap: 'linked',
				drop: ['debugger'],
				external: ['sharp']
			}
		}).adapt(create_builder());

		expect(bun_build.mock.calls[0][0]).toMatchObject({
			entrypoints: [entrypoint],
			outdir: 'dist',
			target: 'bun',
			format: 'esm',
			minify: true,
			bytecode: true,
			sourcemap: 'linked',
			drop: ['debugger'],
			external: ['sharp'],
			compile: { outfile: 'application', target: 'bun-linux-x64' }
		});
	});

	test.each([
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

		await expect(
			adapter({ buildOptions: { compile: true } }).adapt(builder)
		).rejects.toBeInstanceOf(AggregateError);
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
			client_files: ['.env', 'data.json', '.well-known/security.txt', '_app/immutable/read.txt'],
			prerendered_files: ['page/index.html', 'icon.png'],
			prerendered_pages: [['/page/', { file: 'page/index.html' }]],
			prerendered_redirects: [['/old', { status: 301, location: '/new' }]],
			routes: [dynamic, prerendered],
			server_assets: ['_app/immutable/read.txt']
		});

		await adapter().adapt(builder);

		expect(builder.writeClient).toHaveBeenCalledWith('build/client');
		expect(builder.writePrerendered).toHaveBeenCalledWith('build/prerendered');
		expect(builder.findServerAssets).toHaveBeenCalledWith([dynamic]);
		const source = handoff_source();
		expect(source).toContain(
			'["client_asset", "data.json", "data.json", {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain(
			'["client_asset", "_app/immutable/read.txt", "_app/immutable/read.txt", {"hash":"abc","mtime":0}]'
		);
		// like sirv, dotfiles are not served, apart from .well-known
		expect(source).not.toContain('.env');
		expect(source).toContain(
			'["client_asset", ".well-known/security.txt", ".well-known/security.txt", {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain(
			'["prerendered_page", "/page/", "page/index.html", {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain(
			'["prerendered_asset", "icon.png", "icon.png", {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain('export const redirects = [["/old",301,"/new"]];');
		expect(source).toContain('export const server_assets = [\n["_app/immutable/read.txt"]\n];');
		expect(source).not.toContain("with { type: 'file' }");
	});

	test('embeds assets in compiled executables from a staging directory', async () => {
		const builder = create_builder({
			client_files: [
				'.secret',
				'data.json',
				'.well-known/asset.txt',
				'_app/read.txt',
				'page/index.html'
			],
			prerendered_files: ['page/index.html', 'favicon.ico', 'dependency.json', 'page/__data.json'],
			prerendered_pages: [['/page/', { file: 'page/index.html' }]],
			server_assets: ['_app/read.txt']
		});

		await adapter({ buildOptions: { compile: true } }).adapt(builder);

		expect(builder.writeClient).toHaveBeenCalledWith('.svelte-kit/adapter-bun/client');
		expect(builder.writePrerendered).toHaveBeenCalledWith('.svelte-kit/adapter-bun/prerendered');
		const source = handoff_source();
		expect(source).toContain(
			`import asset_0 from ${JSON.stringify(`${process.cwd()}/.svelte-kit/adapter-bun/client/data.json`)} with { type: 'file' };`
		);
		expect(source).toContain('["client_asset", "data.json", asset_0, {"hash":"abc","mtime":0}]');
		expect(source).toContain(
			'["client_asset", ".well-known/asset.txt", asset_1, {"hash":"abc","mtime":0}]'
		);
		// a skipped dotfile takes no import, and the same relative path in the client
		// and prerendered output stays two imports
		expect(source).not.toContain('.secret');
		expect(source).toContain(
			'["client_asset", "page/index.html", asset_3, {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain('["prerendered_page", "/page/", asset_4, {"hash":"abc","mtime":0}]');
		expect(source).toContain(
			'["prerendered_asset", "favicon.ico", asset_5, {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain(
			'["prerendered_asset", "dependency.json", asset_6, {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain(
			'["prerendered_asset", "page/__data.json", asset_7, {"hash":"abc","mtime":0}]'
		);
		expect(source).toContain('["_app/read.txt", asset_2]');
	});

	test.each([false, true])('rejects wildcard filenames when compile is %s', async (compile) => {
		const builder = create_builder({ client_files: ['literal*.txt'] });

		await expect(adapter({ buildOptions: { compile } }).adapt(builder)).rejects.toThrow(
			'Bun treats literal `*` characters in route paths as wildcards'
		);
		expect(write_file).not.toHaveBeenCalled();
	});

	test('precompresses assets and marks the variants in the generated routes', async () => {
		const builder = create_builder({ client_files: ['app.js'] });

		await adapter({ precompress: true }).adapt(builder);

		expect(builder.compress).toHaveBeenCalledWith('build/client');
		expect(builder.compress).toHaveBeenCalledWith('build/prerendered');
		expect(handoff_source()).toContain(
			'["client_asset", "app.js", "app.js", {"hash":"abc","mtime":0,"br":true,"gz":true}]'
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

	test('rejects route segments starting with a colon', async () => {
		const builder = create_builder({ client_files: [':tag.txt'] });

		await expect(adapter().adapt(builder)).rejects.toThrow('starts with `:`');
		expect(write_file).not.toHaveBeenCalled();
	});

	test('rejects wildcard characters in prerendered redirect sources', async () => {
		const builder = create_builder({
			prerendered_redirects: [['/docs/*', { status: 308, location: '/new' }]]
		});

		await expect(adapter().adapt(builder)).rejects.toThrow(
			'Bun treats literal `*` characters in route paths as wildcards'
		);
		expect(write_file).not.toHaveBeenCalled();
	});

	test('fails when a server-readable asset is absent from compiled build output', async () => {
		await expect(
			adapter({ buildOptions: { compile: true } }).adapt(
				create_builder({ server_assets: ['missing.txt'] })
			)
		).rejects.toThrow('Could not find server asset missing.txt');
	});
});

function vite_config() {
	return (adapter() as any).vite.plugins.post[0].config();
}

function handoff_source() {
	const call = write_file.mock.calls.find(([file]) => file === handoff_file);
	if (!call) throw new Error('the hand-off module was not written');
	return String(call[1]);
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
		generateServerInstance: mock(() => {}),
		getServerDirectory: () => server_dir,
		getBuildDirectory: (name: string) => `.svelte-kit/${name}`,
		writeClient: mock(() => client_files),
		writePrerendered: mock(() => prerendered_files),
		copy: mock(() => []),
		compress: mock(async (_directory: string) => {}),
		findServerAssets: mock(() => server_assets),
		hasServerInstrumentationFile: () => instrumentation,
		createInstrumentationInitializer: mock(() => `${server_dir}/__sveltekit_env_init.js`),
		instrument: mock(() => {})
	} as any;
}
