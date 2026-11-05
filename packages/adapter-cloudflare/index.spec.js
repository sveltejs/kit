/** @import { Plugin } from 'vite' */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, expect, test, vi } from 'vitest';
import { createServer } from 'vite';
import { getPlatformProxy } from '@cloudflare/platform-proxy';
import adapter from './index.js';

const dispose = vi.fn(() => Promise.resolve());

vi.mock('@cloudflare/platform-proxy', () => ({
	getPlatformProxy: vi.fn(() => Promise.resolve({ caches: {}, dispose }))
}));

/**
 * A Vite root with a `cloudflare.config.ts` so that the adapter starts a platform proxy
 */
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-')));
fs.writeFileSync(
	path.join(root, 'cloudflare.config.ts'),
	"export default { worker: { name: 'app', compatibilityDate: '2026-08-06' } };"
);

beforeEach(() => {
	vi.clearAllMocks();
});

afterAll(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

/**
 * @param {import('@sveltejs/kit').Adapter} [instance]
 * @param {string} [assets]
 */
function get_vite_config(instance = adapter(), assets = '') {
	if (typeof instance.vite !== 'function') throw new Error('Expected an adapter config function');
	return /** @type {{ plugins: Plugin[] }} */ (
		instance.vite({
			config: /** @type {Parameters<typeof instance.vite>[0]['config']} */ ({ paths: { assets } })
		})
	);
}

test.each(['https://cdn.example.com', '/assets'])(
	'rejects paths.assets=%s when configuring the adapter',
	(assets) => {
		expect(() => get_vite_config(adapter(), assets)).toThrow(
			'@sveltejs/adapter-cloudflare does not support paths.assets'
		);
	}
);

function create_server() {
	const { plugins } = get_vite_config();
	return createServer({
		root,
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
		const { plugins } = get_vite_config();
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

test('starts the platform proxy with the Vite mode and the root `cloudflare.config.ts`', async () => {
	const { plugins } = get_vite_config();
	const server = await createServer({
		root,
		mode: 'staging',
		configFile: false,
		logLevel: 'silent',
		plugins,
		server: { middlewareMode: true }
	});

	expect(getPlatformProxy).toHaveBeenCalledWith({
		configPath: path.join(root, 'cloudflare.config.ts'),
		mode: 'staging'
	});

	await server.close();
});

test('starts an empty platform proxy without a `cloudflare.config.ts`', async () => {
	const empty_root = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-cloudflare-'));
	try {
		const { plugins } = get_vite_config();
		const server = await createServer({
			root: empty_root,
			configFile: false,
			logLevel: 'silent',
			plugins,
			server: { middlewareMode: true }
		});

		expect(getPlatformProxy).not.toHaveBeenCalled();
		expect(globalThis.__sveltekit_cloudflare_platform?.env).toEqual({});

		await server.close();
	} finally {
		fs.rmSync(empty_root, { recursive: true, force: true });
	}
});
