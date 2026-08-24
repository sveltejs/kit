import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import adapter from './index.js';

vi.mock('wrangler', () => ({
	getPlatformProxy: vi.fn(),
	unstable_readConfig: vi.fn()
}));

/**
 * @returns {any}
 */
function create_proxy() {
	return {
		env: { SECRET: 's3cret' },
		ctx: { waitUntil: vi.fn() },
		context: undefined,
		caches: {},
		cf: {},
		dispose: vi.fn(async () => {})
	};
}

describe('emulate', () => {
	beforeEach(() => {
		vi.mocked(getPlatformProxy).mockReset();
	});

	test('lazily starts and reuses a single platform proxy', async () => {
		const p = create_proxy();
		vi.mocked(getPlatformProxy).mockResolvedValue(p);

		const emulator = await adapter().emulate();

		expect(getPlatformProxy).not.toHaveBeenCalled();

		const platform = await emulator.platform({ config: {}, prerender: false });
		expect(platform.env).toEqual(p.env);
		expect(platform.caches).toEqual(p.caches);
		await emulator.platform({ config: {}, prerender: true });

		expect(getPlatformProxy).toHaveBeenCalledTimes(1);
	});

	test('dispose terminates the underlying platform proxy', async () => {
		const p = create_proxy();
		vi.mocked(getPlatformProxy).mockResolvedValue(p);

		const emulator = await adapter().emulate();
		await emulator.platform({ config: {}, prerender: false });
		await emulator.dispose();

		expect(p.dispose).toHaveBeenCalledTimes(1);
	});

	test('dispose without an active platform proxy is a no-op', async () => {
		vi.mocked(getPlatformProxy).mockResolvedValue(create_proxy());

		const emulator = await adapter().emulate();
		await emulator.dispose();

		expect(getPlatformProxy).not.toHaveBeenCalled();
	});

	test('dispose is idempotent', async () => {
		const p = create_proxy();
		vi.mocked(getPlatformProxy).mockResolvedValue(p);

		const emulator = await adapter().emulate();
		await emulator.platform({ config: {}, prerender: false });
		await emulator.dispose();
		await emulator.dispose();

		expect(p.dispose).toHaveBeenCalledTimes(1);
	});
});
