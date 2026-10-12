import { expect, test, vi } from 'vitest';
import { createServer } from 'vite';
import adapter from './index.js';

const dispose = vi.fn(() => Promise.resolve());

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(() => Promise.resolve({ caches: {}, dispose })),
	unstable_readConfig: vi.fn()
}));

test('disposes the platform proxy when the dev server closes, not when it restarts', async () => {
	const { plugins } = /** @type {{ plugins: import('vite').Plugin[] }} */ (adapter().vite);
	const server = await createServer({
		configFile: false,
		logLevel: 'silent',
		plugins,
		server: { middlewareMode: true }
	});
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.restart();
	expect(dispose).not.toHaveBeenCalled();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.close();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
});
