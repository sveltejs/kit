import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, expect, test, vi } from 'vitest';
import { createServer } from 'vite';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';
import adapter from './index.js';

const dispose = vi.fn(() => Promise.resolve());

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(() => Promise.resolve({ caches: {}, dispose })),
	unstable_readConfig: vi.fn(() => ({ configPath: undefined }))
}));

beforeEach(() => {
	vi.clearAllMocks();
});

function create_server() {
	const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (adapter().vite);
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
		const dest = path.join(root, 'dist/public');
		const server = path.join(root, 'server');
		const generateFallback = vi.fn();
		const copy = vi.fn();
		fs.mkdirSync(server);

		vi.mocked(unstable_readConfig).mockReturnValue(
			/** @type {import('wrangler').Unstable_Config} */ ({
				configPath: path.join(root, 'config/wrangler.jsonc'),
				main: path.join(root, 'dist/index.js'),
				assets: {
					directory: '../dist/public',
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
				copy,
				hasServerInstrumentationFile: () => false
			})
		);

		try {
			await adapter({ fallback: /** @type {'plaintext' | 'spa'} */ (fallback) }).adapt(builder);

			expect(builder.writeClient).toHaveBeenCalledWith(`${dest}/base`);
			expect(builder.writePrerendered).toHaveBeenCalledWith(`${dest}/base`);
			expect(copy).toHaveBeenCalledWith(expect.any(String), path.join(root, 'dist/index.js'), {
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
		const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (adapter().vite);
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
	vi.mocked(unstable_readConfig).mockReturnValueOnce(
		/** @type {any} */ ({ configPath: config_path })
	);

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
	vi.mocked(unstable_readConfig).mockReturnValueOnce(
		/** @type {any} */ ({ configPath: config_path })
	);
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
