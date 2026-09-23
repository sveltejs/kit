import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import adapter from './index.js';

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(),
	unstable_readConfig: vi.fn()
}));

/** @typedef {Awaited<ReturnType<typeof getPlatformProxy>>} PlatformProxy */

/** @type {PlatformProxy} */
let proxy;

beforeEach(() => {
	vi.mocked(getPlatformProxy).mockReset();
	proxy = /** @type {PlatformProxy} */ (
		/** @type {unknown} */ ({
			env: {},
			ctx: {},
			caches: {},
			cf: {},
			dispose: vi.fn()
		})
	);
	vi.mocked(getPlatformProxy).mockResolvedValue(proxy);
});

describe('emulate', () => {
	test('lazily creates and disposes one platform proxy', async () => {
		const emulator = await adapter().emulate?.();
		expect(getPlatformProxy).not.toHaveBeenCalled();

		await emulator?.platform?.({ config: {}, prerender: false });
		await emulator?.platform?.({ config: {}, prerender: true });
		expect(getPlatformProxy).toHaveBeenCalledOnce();

		await emulator?.dispose?.();
		await emulator?.dispose?.();
		expect(proxy.dispose).toHaveBeenCalledOnce();
	});

	test('does not create a platform proxy solely to dispose it', async () => {
		const emulator = await adapter().emulate?.();
		await emulator?.dispose?.();

		expect(getPlatformProxy).not.toHaveBeenCalled();
		expect(proxy.dispose).not.toHaveBeenCalled();
	});

	test('disposes an in-flight platform proxy once during concurrent cleanup', async () => {
		/** @type {(proxy: PlatformProxy) => void} */
		let resolve_proxy = () => {};
		/** @type {Promise<PlatformProxy>} */
		const pending_proxy = new Promise((resolve) => {
			resolve_proxy = resolve;
		});
		vi.mocked(getPlatformProxy).mockReturnValue(pending_proxy);

		const emulator = await adapter().emulate?.();
		const platform = emulator?.platform?.({ config: {}, prerender: false });
		const disposal = Promise.all([emulator?.dispose?.(), emulator?.dispose?.()]);

		expect(proxy.dispose).not.toHaveBeenCalled();
		resolve_proxy(proxy);
		await Promise.all([platform, disposal]);
		expect(proxy.dispose).toHaveBeenCalledOnce();
	});
});
