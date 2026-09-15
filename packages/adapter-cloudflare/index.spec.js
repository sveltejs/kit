import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import adapter from './index.js';

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(),
	unstable_readConfig: vi.fn()
}));

/** @type {Awaited<ReturnType<typeof getPlatformProxy>> | undefined} */
let proxy;

beforeEach(() => {
	const value = /** @type {Awaited<ReturnType<typeof getPlatformProxy>>} */ (
		/** @type {unknown} */ ({
			env: {},
			ctx: {},
			caches: {},
			cf: {},
			dispose: vi.fn()
		})
	);
	proxy = value;
	vi.mocked(getPlatformProxy).mockResolvedValue(value);
});

afterEach(() => {
	// @ts-expect-error reset the global populated by the plugin
	globalThis.__sveltekit_cloudflare_platform = undefined;
});

describe('virtual workers module', () => {
	test('disposes the platform proxy when the dev server closes', async () => {
		const plugin = adapter().vite?.plugins?.pre?.[0];
		const configure_server = /** @type {Function} */ (plugin?.configureServer);
		const close_bundle = /** @type {Function} */ (plugin?.closeBundle);

		await configure_server({});
		await close_bundle();
		await close_bundle();

		expect(proxy?.dispose).toHaveBeenCalledOnce();
		expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
	});

	test('disposes the platform proxy when the preview server closes', async () => {
		const plugin = adapter().vite?.plugins?.pre?.[0];
		const configure_preview_server = /** @type {Function} */ (plugin?.configurePreviewServer);
		const close = vi.fn();
		const server = { close };

		await configure_preview_server(server);
		await server.close();

		expect(close).toHaveBeenCalledOnce();
		expect(proxy?.dispose).toHaveBeenCalledOnce();
		expect(globalThis.__sveltekit_cloudflare_platform).toBeUndefined();
	});
});
