import { beforeEach, expect, test, vi } from 'vitest';
import { createServer } from 'vite';
import { getPlatformProxy } from 'wrangler';
import adapter from './index.js';

const dispose = vi.fn(() => Promise.resolve());

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(() => Promise.resolve({ caches: {}, dispose })),
	unstable_readConfig: vi.fn()
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
	const failed = await Promise.allSettled([create_server(), create_server()]);
	expect(failed.map((result) => result.status)).toEqual(['rejected', 'rejected']);
	expect(getPlatformProxy).toHaveBeenCalledOnce();

	const server = await create_server();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
});
