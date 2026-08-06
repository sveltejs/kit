import { afterEach, describe, expect, test, vi } from 'vitest';
import adapter from './index.js';

const { build, file } = vi.hoisted(() => {
	const build = vi.fn(async (_options: any) => ({ success: true, logs: [], outputs: [] }));
	const file = vi.fn(() => ({ json: async () => ({ dependencies: { dependency: '1.0.0' } }) }));
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

	test('normalizes executable output and composes user configuration safely', async () => {
		const user_plugin = { name: 'user-plugin', setup() {} };
		await adapter({
			out: 'dist',
			compile: {
				compile: { target: 'bun-linux-x64' },
				conditions: ['custom', 'bun'],
				files: {
					'virtual:user': 'export default true',
					'.svelte-kit/output/server/adapter-bun-manifest.js': 'invalid manifest'
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
		expect(options).toMatchObject({
			target: 'bun',
			format: 'esm',
			minify: true,
			bytecode: true,
			sourcemap: 'linked'
		});
		expect(options.entrypoints).toHaveLength(1);
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

function builder() {
	return {
		config: { kit: { paths: { base: '', origin: undefined } } },
		prerendered: { paths: [] },
		log: { minor() {} },
		getBuildDirectory: () => '.svelte-kit/adapter-bun',
		getServerDirectory: () => '.svelte-kit/output/server',
		rimraf() {},
		mkdirp() {},
		writeClient: () => [],
		writePrerendered: () => [],
		copy() {},
		generateManifest: () => '{}',
		hasServerInstrumentationFile: () => false
	} as any;
}
