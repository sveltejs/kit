import { afterEach, expect, test, vi } from 'vitest';
import { createServer } from 'vite';

const dispose = vi.fn(async () => {});

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(() =>
		Promise.resolve({
			caches: {},
			dispose
		})
	),
	unstable_readConfig: vi.fn()
}));

const { default: adapter } = await import('./index.js');

const get_plugin = () =>
	/** @type {import('vite').Plugin} */ (/** @type {any} */ (adapter().vite).plugins[0]);

afterEach(() => {
	Reflect.deleteProperty(globalThis, '__sveltekit_cloudflare_platform');
	dispose.mockClear();
});

test('disposes the platform proxy when the Vite dev server closes', async () => {
	const server = await createServer({
		configFile: false,
		logLevel: 'silent',
		plugins: [get_plugin()],
		server: { middlewareMode: true }
	});

	expect(globalThis.__sveltekit_cloudflare_platform).toBeDefined();

	await server.close();
	await server.close();

	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
});

test('disposes the platform proxy when the Vite preview server closes', async () => {
	const plugin = get_plugin();
	const close = vi.fn();
	const server = { close };

	await /** @type {Function} */ (plugin.configurePreviewServer)(server);
	await server.close();

	expect(close).toHaveBeenCalledOnce();
	expect(dispose).toHaveBeenCalledOnce();
	expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
});

test('closes concurrently and does not clear a replacement platform proxy', async () => {
	const plugin = get_plugin();
	const close = vi.fn();
	const server = { close };
	/** @type {PromiseWithResolvers<void>} */
	const disposal = Promise.withResolvers();
	dispose.mockImplementationOnce(() => disposal.promise);

	await /** @type {Function} */ (plugin.configurePreviewServer)(server);
	const closing = server.close();

	expect(close).toHaveBeenCalledOnce();
	expect(dispose).toHaveBeenCalledOnce();

	const replacement = /** @type {import('wrangler').PlatformProxy} */ ({});
	globalThis.__sveltekit_cloudflare_platform = replacement;
	disposal.resolve();
	await closing;

	expect(globalThis.__sveltekit_cloudflare_platform).toBe(replacement);
});
