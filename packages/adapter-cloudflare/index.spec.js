import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, expect, test, vi } from 'vitest';
import { createBuilder, createServer } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';
import adapter from './index.js';

const dispose = vi.fn(() => Promise.resolve());

vi.mock('@cloudflare/vite-plugin', () => ({
	cloudflare: vi.fn(() => [
		{ name: 'vite-plugin-cloudflare' },
		{
			name: 'vite-plugin-cloudflare:config',
			config: () => ({ environments: { ssr: { resolve: {}, build: {} } } }),
			configResolved: () => {}
		},
		{ name: 'vite-plugin-cloudflare:output-config' }
	])
}));

vi.mock('vite', async (importOriginal) => ({
	...(await importOriginal()),
	createBuilder: vi.fn(() => Promise.resolve({ buildApp: vi.fn() }))
}));

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(() => Promise.resolve({ caches: {}, dispose })),
	unstable_readConfig: vi.fn(() => ({ configPath: undefined }))
}));

beforeEach(() => {
	vi.clearAllMocks();
	// the adapter also reads the Wrangler config when creating its Vite config
	vi.mocked(unstable_readConfig)
		.mockReset()
		.mockReturnValue(/** @type {any} */ ({ configPath: undefined }));
});

/**
 * @param {import('@sveltejs/kit').Adapter} [instance]
 */
function get_vite_config(instance = adapter()) {
	if (typeof instance.vite === 'function') throw new Error('Expected an adapter config object');
	return instance.vite;
}

function create_server() {
	const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (get_vite_config());
	return createServer({
		configFile: false,
		logLevel: 'silent',
		plugins,
		server: { middlewareMode: true }
	});
}

test.each([
	{ not_found_handling: undefined, fallback: 'plaintext', generated: undefined },
	{ not_found_handling: '404-page', fallback: 'plaintext', generated: undefined },
	{ not_found_handling: '404-page', fallback: 'spa', generated: '404.html' },
	{ not_found_handling: 'single-page-application', fallback: 'plaintext', generated: 'index.html' }
])(
	'builds Workers assets with $not_found_handling and $fallback',
	async ({ not_found_handling, fallback, generated }) => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-'));
		const tmp = `${path.join(root, 'cloudflare')}/worker`;
		const dest = `${path.join(root, 'cloudflare')}/client`;
		const server = path.join(root, 'server');
		const generateFallback = vi.fn();
		const copy = vi.fn();
		fs.mkdirSync(server);
		fs.writeFileSync(
			path.join(server, 'wrangler.json'),
			JSON.stringify({
				main: 'index.js',
				no_bundle: true,
				assets: { binding: 'CUSTOM_ASSETS', directory: '../client' },
				vars: { FOO: 'from wrangler.jsonc' }
			})
		);
		const deploy_config = path.join(root, '.wrangler/deploy/config.json');
		fs.mkdirSync(path.dirname(deploy_config), { recursive: true });
		fs.writeFileSync(
			deploy_config,
			JSON.stringify({ configPath: '../../server/wrangler.json', auxiliaryWorkers: [] })
		);

		vi.mocked(unstable_readConfig).mockReturnValue(
			/** @type {import('wrangler').Unstable_Config} */ ({
				configPath: path.join(root, 'config/wrangler.jsonc'),
				assets: {
					binding: 'CUSTOM_ASSETS',
					not_found_handling
				}
			})
		);

		const builder = /** @type {import('@sveltejs/kit').Builder} */ (
			/** @type {unknown} */ ({
				config: { files: { assets: path.join(root, 'static') }, paths: { base: '/base' } },
				getBuildDirectory: (/** @type {string} */ name) => path.join(root, name),
				getServerDirectory: () => server,
				getAppPath: () => 'base/_app',
				manifest: { assets: [] },
				prerendered: {
					paths: [],
					redirects: new Map([['/old', { location: '/new', status: 301 }]])
				},
				generateFallback,
				generateServerInstance: vi.fn(),
				writeClient: vi.fn(),
				writePrerendered: vi.fn(),
				writeServer: vi.fn((/** @type {string} */ dest) => {
					fs.cpSync(server, dest, { recursive: true });
				}),
				copy,
				hasServerInstrumentationFile: () => false
			})
		);

		try {
			vi.stubEnv('CLOUDFLARE_ENV', 'staging');
			const instance = adapter({ fallback: /** @type {'plaintext' | 'spa'} */ (fallback) });
			const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (
				get_vite_config(instance)
			);
			const configure =
				/** @type {(config: import('vite').UserConfig, env: import('vite').ConfigEnv) => unknown} */ (
					plugins[0].config
				);
			configure(
				{
					root,
					environments: {
						ssr: { build: { rolldownOptions: { input: { index: `${server}/index.js` } } } }
					}
				},
				{ command: 'build', mode: 'production' }
			);
			{
				const config_resolved = /** @type {(config: unknown) => void} */ (
					plugins[0].configResolved
				);
				config_resolved({
					root,
					mode: 'production',
					logLevel: 'silent',
					resolve: { alias: [] },
					define: {},
					build: { minify: false, sourcemap: true }
				});
			}
			const proxy = plugins.find((plugin) => plugin.name.endsWith('-virtual-workers-module'));
			if (!proxy) throw new Error('Expected a virtual workers module plugin');
			const stub = /** @type {{ handler: () => { id: string } }} */ (proxy.resolveId).handler().id;
			const code = `import { env } from ${JSON.stringify(stub)};\nexport const value = env.FOO;\n`;
			fs.writeFileSync(path.join(server, 'env.js'), code);
			const sourcemap = JSON.stringify({ version: 3, sources: ['env.js'], sourcesContent: [code] });
			fs.writeFileSync(path.join(server, 'env.js.map'), sourcemap);
			fs.writeFileSync(path.join(server, 'asset.bin'), Buffer.from([0, 255, 128]));
			await instance.adapt(builder);
			const deployed_code = fs.readFileSync(`${tmp}/server/env.js`, 'utf8');
			expect(deployed_code).toContain('"cloudflare:workers"');
			expect(deployed_code).not.toContain(stub);
			expect(deployed_code.length).toBe(code.length);
			expect(deployed_code.indexOf('export const')).toBe(code.indexOf('export const'));
			expect(fs.readFileSync(`${tmp}/server/env.js.map`, 'utf8')).toBe(sourcemap);
			expect(fs.readFileSync(`${tmp}/server/asset.bin`)).toEqual(Buffer.from([0, 255, 128]));
			expect(fs.readFileSync(path.join(server, 'env.js'), 'utf8')).toBe(code);
			expect(unstable_readConfig).toHaveBeenCalledWith({ config: undefined, env: 'staging' });

			const customize = vi.mocked(cloudflare).mock.calls.at(-1)?.[0]?.config;
			if (typeof customize !== 'function') throw new Error('Expected a config customizer');
			for (const flag of [undefined, 'nodejs_compat', 'nodejs_als']) {
				const config = /** @type {Parameters<typeof customize>[0]} */ ({
					compatibility_flags: flag ? [flag] : [],
					assets: { binding: 'CUSTOM_ASSETS' }
				});
				customize(config);
				expect(config).toMatchObject({
					// a stand-in since the Worker entry is generated after the build
					main: fileURLToPath(new URL('./files/worker.js', import.meta.url)),
					assets: { binding: 'CUSTOM_ASSETS' },
					compatibility_flags: [flag ?? 'nodejs_als']
				});
			}

			expect(createBuilder).not.toHaveBeenCalled();
			expect(builder.writeServer).toHaveBeenCalledExactlyOnceWith(`${tmp}/server`);
			expect(builder.generateServerInstance).toHaveBeenCalledWith(`${tmp}/server.js`, {
				serverDirectory: `${tmp}/server`
			});
			expect(JSON.parse(fs.readFileSync(`${tmp}/wrangler.json`, 'utf8'))).toEqual({
				main: 'index.js',
				no_bundle: true,
				assets: { binding: 'CUSTOM_ASSETS', directory: '../client' },
				vars: { FOO: 'from wrangler.jsonc' }
			});
			const deployed = JSON.parse(fs.readFileSync(deploy_config, 'utf8'));
			expect(deployed.auxiliaryWorkers).toEqual([]);
			expect(path.resolve(path.dirname(deploy_config), deployed.configPath)).toBe(
				path.join(tmp, 'wrangler.json')
			);
			expect(fs.existsSync(`${tmp}/server/wrangler.json`)).toBe(false);
			expect(cloudflare).toHaveBeenCalledWith(
				expect.objectContaining({
					viteEnvironment: { name: 'ssr' },
					config: expect.any(Function)
				})
			);

			expect(builder.writeClient).toHaveBeenCalledWith(`${dest}/base`);
			expect(builder.writePrerendered).toHaveBeenCalledWith(`${dest}/base`);
			expect(copy).toHaveBeenCalledWith(expect.any(String), `${tmp}/index.js`, {
				replace: expect.objectContaining({ ASSETS_BINDING: 'CUSTOM_ASSETS' })
			});
			expect(fs.existsSync(`${dest}/_routes.json`)).toBe(false);
			expect(fs.readFileSync(`${dest}/.assetsignore`, 'utf8')).toContain('_worker.js');
			expect(fs.readFileSync(`${dest}/_headers`, 'utf8')).toContain('/base/_app/immutable/*');
			expect(fs.readFileSync(`${dest}/_redirects`, 'utf8')).toContain('/old /new 301');

			if (generated) {
				expect(generateFallback).toHaveBeenCalledExactlyOnceWith(
					path.join(dest, 'base', generated)
				);
			} else {
				expect(generateFallback).not.toHaveBeenCalled();
				if (not_found_handling === '404-page') {
					expect(fs.readFileSync(`${dest}/base/404.html`, 'utf8')).toBe('Not Found');
				} else {
					expect(fs.existsSync(`${dest}/base/404.html`)).toBe(false);
				}
			}
		} finally {
			vi.unstubAllEnvs();
			fs.rmSync(root, { recursive: true, force: true });
		}
	}
);

test('selects Wrangler configuration and named environments from Vite env files', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-env-'));
	try {
		vi.stubEnv('CLOUDFLARE_ENV', undefined);
		vi.stubEnv('CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH', undefined);
		fs.writeFileSync(
			path.join(root, '.env.production'),
			'CLOUDFLARE_ENV=staging\nCLOUDFLARE_VITE_WRANGLER_CONFIG_PATH=config/wrangler.jsonc\n'
		);
		const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (get_vite_config());
		const configure =
			/** @type {(config: import('vite').UserConfig, env: import('vite').ConfigEnv) => unknown} */ (
				plugins[0].config
			);
		configure({ root }, { command: 'build', mode: 'production' });
		expect(unstable_readConfig).toHaveBeenCalledWith({
			config: path.join(root, 'config/wrangler.jsonc'),
			env: 'staging'
		});
	} finally {
		vi.unstubAllEnvs();
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test('bundles the dependencies that Kit externalizes for Workers', () => {
	const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (get_vite_config());
	const hook = plugins.find(
		(plugin) => plugin.name === 'vite-plugin-sveltekit-adapter-cloudflare-workers'
	)?.configEnvironment;
	if (typeof hook !== 'object') throw new Error('Expected a post environment hook');
	const configure_environment =
		/** @type {(name: string, config: import('vite').EnvironmentOptions) => void} */ (hook.handler);
	const ssr = { resolve: { external: ['@opentelemetry/api'] } };
	configure_environment('ssr', ssr);
	expect(ssr.resolve.external).toEqual([]);
	const client = { resolve: { external: ['foo'] } };
	configure_environment('client', client);
	expect(client.resolve.external).toEqual(['foo']);
});

test.each([
	{ config: {}, workers_ci: '' },
	{
		config: { main: 'dist/index.js', assets: { directory: 'dist', binding: 'ASSETS' } },
		workers_ci: '1'
	}
])(
	'rejects Pages CI before writing build output with $config and WORKERS_CI=$workers_ci',
	async ({ config, workers_ci }) => {
		vi.mocked(unstable_readConfig).mockReturnValue(
			/** @type {import('wrangler').Unstable_Config} */ (config)
		);
		const getBuildDirectory = vi.fn();
		const builder = /** @type {import('@sveltejs/kit').Builder} */ (
			/** @type {unknown} */ ({
				config: { files: { assets: 'static' } },
				getBuildDirectory
			})
		);

		try {
			vi.stubEnv('CF_PAGES', '1');
			vi.stubEnv('WORKERS_CI', workers_ci);
			await expect(adapter().adapt(builder)).rejects.toThrow(
				'Cloudflare Pages is no longer supported. Deploy with Cloudflare Workers instead. Consult https://svelte.dev/docs/kit/adapter-cloudflare#Migrating-from-Cloudflare-Pages'
			);
			expect(getBuildDirectory).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllEnvs();
		}
	}
);

test('disposes the platform proxy when the dev server closes, not when it restarts', async () => {
	const server = await create_server();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.restart();
	expect(dispose).not.toHaveBeenCalled();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
});

test('exposes the platform caches when the runtime defines `caches` as a getter', async () => {
	const global = /** @type {Record<string, any>} */ (globalThis);
	const original = Object.getOwnPropertyDescriptor(global, 'caches');
	// Deno defines `caches` on its global with a getter and no setter
	Object.defineProperty(global, 'caches', {
		get: () => 'runtime caches',
		enumerable: true,
		configurable: true
	});

	try {
		const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (get_vite_config());
		const server = await createServer({
			configFile: false,
			logLevel: 'silent',
			plugins,
			server: { middlewareMode: true }
		});

		expect(global.caches).toBe(globalThis.__sveltekit_cloudflare_platform?.caches);

		await server.close();
	} finally {
		if (original) {
			Object.defineProperty(global, 'caches', original);
		} else {
			delete global.caches;
		}
	}
});

test('keeps the platform proxy alive while another dev server is still open', async () => {
	const server = await create_server();
	const proxy = globalThis.__sveltekit_cloudflare_platform;

	const nested = await create_server();
	await nested.close();
	expect(dispose).not.toHaveBeenCalled();
	expect(globalThis.__sveltekit_cloudflare_platform).toBe(proxy);

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
});

test('starts one platform proxy for dev servers created concurrently', async () => {
	const servers = await Promise.all([create_server(), create_server()]);
	expect(getPlatformProxy).toHaveBeenCalledOnce();

	await servers[0].close();
	expect(dispose).not.toHaveBeenCalled();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await servers[1].close();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
});

test('retries the platform proxy after it fails to start', async () => {
	vi.mocked(getPlatformProxy).mockRejectedValueOnce(new Error('failed to start'));
	await expect(create_server()).rejects.toThrow('failed to start');
	expect(globalThis.__sveltekit_cloudflare_platform_setup).toBeUndefined();

	const server = await create_server();
	expect(getPlatformProxy).toHaveBeenCalledTimes(2);
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform_setup).toBeUndefined();
});

test('swaps the shared platform proxy in place when wrangler config changes', async () => {
	const config_path = path.resolve('wrangler.toml');
	vi.mocked(unstable_readConfig).mockReturnValue(/** @type {any} */ ({ configPath: config_path }));

	const server = await create_server();
	expect(server.watcher.listeners('change').length).toBeGreaterThan(0);

	const previous = globalThis.__sveltekit_cloudflare_platform;
	const previous_dispose = /** @type {any} */ (previous).dispose;
	const previous_proxy = globalThis.__sveltekit_cloudflare_platform_setup?.proxy;
	expect(previous).toBeDefined();

	// Prime the mock so the SECOND getPlatformProxy call (the config-change reload)
	// returns a fresh proxy, distinguishable from the first.
	const next_dispose = vi.fn(() => Promise.resolve());
	const next_caches = /** @type {any} */ ({});
	vi.mocked(getPlatformProxy).mockResolvedValueOnce(
		/** @type {any} */ ({ caches: next_caches, dispose: next_dispose })
	);

	server.watcher.emit('change', config_path);
	await vi.waitFor(() => {
		expect(globalThis.__sveltekit_cloudflare_platform).not.toBe(previous);
	});
	expect(previous_dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform_setup?.proxy).not.toBe(previous_proxy);

	// Unrelated file changes do not swap or dispose again.
	previous_dispose.mockClear();
	next_dispose.mockClear();
	server.watcher.emit('change', path.resolve('src/routes/+page.svelte'));
	expect(previous_dispose).not.toHaveBeenCalled();
	expect(next_dispose).not.toHaveBeenCalled();

	await server.close();
	expect(next_dispose).toHaveBeenCalledOnce();
});

test('does not install a config watcher when wrangler cannot resolve a config path', async () => {
	// `unstable_readConfig` returns `{ configPath: undefined }` from the default mock
	const server = await create_server();

	const starting_proxy = globalThis.__sveltekit_cloudflare_platform;
	server.watcher.emit('change', path.resolve('wrangler.toml'));
	// No swap even if a file-change event sneaks in — the handler was never wired.
	expect(globalThis.__sveltekit_cloudflare_platform).toBe(starting_proxy);

	await server.close();
});

test('swallows a rejection from the config-reload path and warns, keeping the previous proxy', async () => {
	const config_path = path.resolve('wrangler.toml');
	vi.mocked(unstable_readConfig).mockReturnValue(/** @type {any} */ ({ configPath: config_path }));
	const server = await create_server();
	const previous = globalThis.__sveltekit_cloudflare_platform;
	const warn = vi.spyOn(server.config.logger, 'warn').mockImplementation(() => {});

	// The SECOND getPlatformProxy call — the reload — rejects.
	vi.mocked(getPlatformProxy).mockRejectedValueOnce(new Error('nope'));

	server.watcher.emit('change', config_path);
	// Wait for the microtask queue to drain so the catch handler runs.
	await vi.waitFor(() => {
		expect(warn).toHaveBeenCalledOnce();
	});
	const first_call = /** @type {any[]} */ (warn.mock.calls[0]);
	expect(first_call[0]).toMatch(/adapter-cloudflare.*wrangler config change.*nope/);
	// Previous proxy is still in place since the swap aborted before dispose.
	expect(globalThis.__sveltekit_cloudflare_platform).toBe(previous);
	expect(dispose).not.toHaveBeenCalled();

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
});

test('rejects concurrent servers sharing a failed platform proxy and allows a retry', async () => {
	const { promise, reject } = Promise.withResolvers();
	vi.mocked(getPlatformProxy).mockReturnValueOnce(promise);
	const pending = Promise.allSettled([create_server(), create_server()]);

	// Both servers must be awaiting the same proxy before it fails.
	try {
		await vi.waitFor(() => {
			expect(globalThis.__sveltekit_cloudflare_platform_setup?.servers).toBe(2);
		});
	} finally {
		reject(new Error('failed to start'));
	}

	const failed = await pending;
	expect(failed.map((result) => result.status)).toEqual(['rejected', 'rejected']);
	for (const result of failed) {
		expect(result).toMatchObject({ reason: new Error('failed to start') });
	}
	expect(getPlatformProxy).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform_setup).toBeUndefined();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
	expect(dispose).not.toHaveBeenCalled();

	const server = await create_server();
	expect(getPlatformProxy).toHaveBeenCalledTimes(2);
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform_setup).toBeUndefined();
});
