import path from 'node:path';
import process from 'node:process';
import { beforeEach, expect, test, vi } from 'vitest';
import { createServer } from 'vite';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';
import adapter from './index.js';

const dispose = vi.fn(() => Promise.resolve());

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(() => Promise.resolve({ caches: {}, env: {}, dispose })),
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
		/** @type {any} */ ({ caches: next_caches, env: {}, dispose: next_dispose })
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
	let waiting = 0;
	vi.mocked(getPlatformProxy).mockReturnValueOnce(
		/** @type {any} */ ({
			/**
			 * @param {(value: any) => void} resolve
			 * @param {(reason: unknown) => void} reject
			 */
			then(resolve, reject) {
				waiting += 1;
				return promise.then(resolve, reject);
			}
		})
	);
	const pending = Promise.allSettled([create_server(), create_server()]);

	// Both servers must be awaiting the same proxy before it fails.
	try {
		await vi.waitFor(() => {
			expect(waiting).toBe(2);
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

test('copies the platform proxy variables into process.env before the config is resolved', async () => {
	vi.mocked(getPlatformProxy).mockResolvedValueOnce(
		/** @type {any} */ ({
			caches: {},
			env: { WRANGLER_VAR: 'from wrangler', BINDING: {} },
			dispose
		})
	);

	/** @type {Record<string, string | undefined>} */
	const seen = {};
	const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (adapter().vite);
	const server = await createServer({
		configFile: false,
		logLevel: 'silent',
		plugins: [
			...plugins,
			{
				name: 'read-env',
				configResolved() {
					seen.WRANGLER_VAR = process.env.WRANGLER_VAR;
					seen.BINDING = process.env.BINDING;
				}
			}
		],
		server: { middlewareMode: true }
	});

	expect(seen).toEqual({ WRANGLER_VAR: 'from wrangler', BINDING: undefined });

	await server.close();
	delete process.env.WRANGLER_VAR;
});

test('restarts the dev server when the wrangler variables change', async () => {
	const config_path = path.resolve('wrangler.toml');
	vi.mocked(unstable_readConfig).mockReturnValue(/** @type {any} */ ({ configPath: config_path }));
	vi.mocked(getPlatformProxy).mockResolvedValueOnce(
		/** @type {any} */ ({ caches: {}, env: { REMOVED_VAR: 'old' }, dispose })
	);

	const server = await create_server();
	expect(process.env.REMOVED_VAR).toBe('old');
	const restart = vi.spyOn(server, 'restart').mockResolvedValue();

	vi.mocked(getPlatformProxy).mockResolvedValueOnce(
		/** @type {any} */ ({ caches: {}, env: { ADDED_VAR: 'new' }, dispose })
	);
	server.watcher.emit('change', path.resolve('.dev.vars'));
	await vi.waitFor(() => {
		expect(restart).toHaveBeenCalledOnce();
	});
	expect(process.env.ADDED_VAR).toBe('new');
	expect('REMOVED_VAR' in process.env).toBe(false);

	// a binding-only change keeps the server running
	vi.mocked(getPlatformProxy).mockResolvedValueOnce(
		/** @type {any} */ ({ caches: {}, env: { ADDED_VAR: 'new', BINDING: {} }, dispose })
	);
	server.watcher.emit('change', config_path);
	await vi.waitFor(() => {
		expect(getPlatformProxy).toHaveBeenCalledTimes(3);
	});
	await vi.waitFor(() => {
		expect(dispose).toHaveBeenCalledTimes(2);
	});
	expect(restart).toHaveBeenCalledOnce();

	await server.close();
	vi.mocked(unstable_readConfig).mockReset();
	vi.mocked(unstable_readConfig).mockReturnValue(/** @type {any} */ ({ configPath: undefined }));
	delete process.env.ADDED_VAR;
});
