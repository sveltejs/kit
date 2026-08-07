import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import adapter from './index.js';

vi.mock('node:fs/promises', async (import_original) => {
	const actual = await import_original<typeof import('node:fs/promises')>();
	return { ...actual, readdir: vi.fn() };
});

const { build, file } = vi.hoisted(() => {
	const build = vi.fn(async (_options: any) => ({ success: true, logs: [], outputs: [] }));
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
		expect(options.entrypoints).toHaveLength(1);
		expect(options.plugins[0].name).toBe('adapter-bun');
	});

	test('shares Bun files between directory routes and server reads', async () => {
		await adapter().adapt(
			builder({
				client_files: ['data.json', 'encoded name.txt', '_app/immutable/assets/read.txt'],
				prerendered_files: ['prerendered/index.html'],
				prerendered_pages: [['/prerendered/', { file: 'prerendered/index.html' }]]
			})
		);

		const source = build.mock.calls[0][0].files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(source).toContain(
			'["client/data.json", Bun.file(resolve(import.meta.dir, "client/data.json"))]'
		);
		expect(source).toContain('"/data.json": files.get("client/data.json")');
		expect(source).toContain(
			'new Response(files.get("client/_app/immutable/assets/read.txt"), { headers:'
		);
		expect(source).toContain(
			'["prerendered/prerendered/index.html", Bun.file(resolve(import.meta.dir, "prerendered/prerendered/index.html"))]'
		);
		expect(source).not.toContain('asset_path');
	});

	test('maps logical paths to embedded Bun files for executables', async () => {
		mock_embedded_files({
			client: ['data.json', '_app/immutable/assets/read.txt'],
			pages: ['prerendered/index.html']
		});

		await adapter({ buildOptions: { compile: true } }).adapt(
			builder({
				prerendered_pages: [['/prerendered/', { file: 'prerendered/index.html' }]]
			})
		);

		const options = build.mock.calls[0][0];
		const source = options.files['.svelte-kit/output/server/adapter-bun-routes.js'];
		expect(options.compile).toEqual({ outfile: 'server' });
		expect(source).toContain("with { type: 'file' }");
		expect(source).toContain('["client/data.json", Bun.file(asset_0)]');
		expect(source).toContain('["client/_app/immutable/assets/read.txt", Bun.file(asset_1)]');
		expect(source).toContain('"/data.json": new Response(files.get("client/data.json")');
		expect(source).not.toContain('asset_path');
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
});

test('the runtime reader reuses the generated Bun file', () => {
	const source = readFileSync(new URL('./src/handler.js', import.meta.url), 'utf8');
	expect(source).toContain('const asset = files.get(`client/${file}`)');
	expect(source).toContain('return asset.stream()');
	expect(source).not.toContain('Bun.file(');
	expect(source).not.toContain('asset_path');
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
	vi.mocked(readdir).mockImplementation(async (path) => {
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
	app_path = '_app'
}: {
	client_files?: string[];
	prerendered_files?: string[];
	prerendered_pages?: Array<[string, { file: string }]>;
	app_path?: string;
} = {}) {
	return {
		config: { kit: { outDir: '.svelte-kit', paths: { base: '', origin: undefined } } },
		prerendered: { pages: new Map(prerendered_pages) },
		log: { minor() {}, error() {}, warn() {}, info() {} },
		getServerDirectory: () => '.svelte-kit/output/server',
		rimraf() {},
		writeClient: () => client_files,
		writePrerendered: () => prerendered_files,
		generateManifest: () => '{}',
		getAppPath: () => app_path,
		hasServerInstrumentationFile: () => false
	} as any;
}
