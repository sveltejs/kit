import { afterEach, describe, expect, test, vi } from 'vitest';
import adapter from './index.js';

const { build, file } = vi.hoisted(() => {
	const build = vi.fn(async (_options: any) => ({ success: true, logs: [], outputs: [] }));
	const file = vi.fn((path: string) => ({
		json: async () => ({ dependencies: { dependency: '1.0.0' } }),
		type: path.endsWith('.html')
			? 'text/html;charset=utf-8'
			: path.endsWith('.json')
				? 'application/json;charset=utf-8'
				: 'text/plain;charset=utf-8'
	}));
	vi.stubGlobal('Bun', { build, file });
	return { build, file };
});

afterEach(() => {
	build.mockClear();
	file.mockClear();
});

describe('Bun build options', () => {
	test('reserves the runtime target and module format', async () => {
		await adapter().adapt(builder());

		const options = build.mock.calls[0][0];
		expect(options).toMatchObject({
			target: 'bun',
			format: 'esm',
			conditions: ['bun', 'node'],
			outdir: 'build',
			splitting: true
		});
		expect(options.entrypoints).toHaveLength(3);
		expect(options.plugins[0].name).toBe('adapter-bun');
	});

	test('generates the route map at build time', async () => {
		await adapter().adapt(
			builder({
				client_files: ['data.json', 'encoded name.txt', '_app/immutable/app.js', 'prerendered'],
				prerendered_files: ['prerendered/index.html', 'other/index.html'],
				prerendered_paths: ['/prerendered/', '/other/']
			})
		);

		const source = build.mock.calls[0][0].files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(source).toContain('"/data.json": Bun.file(asset_path("client/data.json"))');
		expect(source).toContain('"/encoded%20name.txt"');
		expect(source).toContain('public,max-age=31536000,immutable');
		expect(source).toContain('"/prerendered": Bun.file(asset_path("client/prerendered"))');
		expect(source).toContain('"/prerendered/": Bun.file');
		expect(source).toContain('"/other/": Bun.file');
		expect(source).toContain('"/other": { GET: redirect_0, HEAD: redirect_0 }');
		expect(source.match(/const redirect_/g)).toHaveLength(1);
		expect(source).not.toContain('client_files');
		expect(source).not.toContain('prerendered_files');
		expect(source).not.toContain('for (');
	});

	test('normalizes executable output and composes user configuration safely', async () => {
		const user_plugin = { name: 'user-plugin', setup() {} };
		await adapter({
			out: 'dist',
			compile: {
				compile: { target: 'bun-linux-x64' },
				conditions: ['custom', 'bun'],
				files: {
					'virtual:user': 'export default true',
					'.svelte-kit/output/server/adapter-bun-manifest.js': 'invalid manifest',
					'.svelte-kit/output/server/adapter-bun-routes.js': 'invalid routes'
				},
				plugins: [user_plugin],
				minify: true,
				bytecode: true,
				sourcemap: 'linked'
			}
		}).adapt(builder());

		const options = build.mock.calls[0][0];
		expect(options.compile).toEqual({ target: 'bun-linux-x64', outfile: 'dist/app' });
		expect(options.conditions).toEqual(['bun', 'node', 'custom']);
		expect(options.plugins.map((plugin: { name: string }) => plugin.name)).toEqual([
			'adapter-bun',
			'user-plugin'
		]);
		expect(options.files['virtual:user']).toBe('export default true');
		expect(options.files['.svelte-kit/output/server/adapter-bun-manifest.js']).not.toBe(
			'invalid manifest'
		);
		expect(options.files['.svelte-kit/output/server/adapter-bun-routes.js']).not.toBe(
			'invalid routes'
		);
		expect(options).toMatchObject({
			target: 'bun',
			format: 'esm',
			minify: true,
			bytecode: true,
			sourcemap: 'linked'
		});
		expect(options.entrypoints).toHaveLength(1);
	});

	test('embeds executable assets through the generated route map', async () => {
		await adapter({ compile: true }).adapt(
			builder({ client_files: ['data.json'], prerendered_files: ['prerendered/index.html'] })
		);

		const options = build.mock.calls[0][0];
		const source = options.files['.svelte-kit/output/server/adapter-bun-routes.js'];
		const entrypoint = options.files['build/adapter-bun-compile.js'];
		expect(source).toContain("with { type: 'file' }");
		expect(source).toContain('["client/data.json", asset_0]');
		expect(source).toContain('["prerendered/prerendered/index.html", asset_1]');
		expect(source).toContain(
			'"/data.json": new Response(Bun.file(asset_0), { headers: {"content-type":"application/json;charset=utf-8"} })'
		);
		expect(entrypoint).not.toContain("with { type: 'file' }");
		expect(entrypoint).not.toContain('sveltekit.adapter-bun.assets');
		expect(source).not.toContain('{ path:');
		expect(source).not.toContain('size');
		expect(source).not.toContain('lastModified');
		expect(source).not.toContain('etag');
		expect(source).not.toContain('sveltekit.adapter-bun.assets');
	});

	test('preserves an explicit outdir for split executables', async () => {
		await adapter({
			compile: {
				compile: true,
				outdir: 'dist/executable',
				splitting: true
			}
		}).adapt(builder());

		expect(build.mock.calls[0][0]).toMatchObject({
			compile: true,
			outdir: 'dist/executable',
			splitting: true
		});
	});

	test('rejects advanced options that disable executable compilation', async () => {
		const invalid = { compile: { compile: false } } as any;
		await expect(adapter(invalid).adapt(builder())).rejects.toThrow('must enable Bun executable');
		expect(build).not.toHaveBeenCalled();
	});

	test('reports serialization and build failures clearly', async () => {
		await expect(
			adapter({ serverOptions: { port: Infinity } as any }).adapt(builder())
		).rejects.toThrow('Could not serialize adapter-bun serverOptions');

		build.mockRejectedValueOnce(new AggregateError([], 'native failure'));
		await expect(adapter().adapt(builder())).rejects.toThrow('Bun server build failed');
	});
});

function builder({
	client_files = [],
	prerendered_files = [],
	prerendered_paths = [],
	app_path = '_app'
}: {
	client_files?: string[];
	prerendered_files?: string[];
	prerendered_paths?: string[];
	app_path?: string;
} = {}) {
	return {
		config: { kit: { paths: { base: '', origin: undefined } } },
		prerendered: { paths: prerendered_paths },
		log: { minor() {} },
		getBuildDirectory: () => '.svelte-kit/adapter-bun',
		getServerDirectory: () => '.svelte-kit/output/server',
		rimraf() {},
		mkdirp() {},
		writeClient: () => client_files,
		writePrerendered: () => prerendered_files,
		copy() {},
		generateManifest: () => '{}',
		getAppPath: () => app_path,
		hasServerInstrumentationFile: () => false
	} as any;
}
