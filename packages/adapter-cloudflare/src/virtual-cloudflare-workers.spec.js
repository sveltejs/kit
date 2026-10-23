import { afterEach, beforeEach, expect, test, vi } from 'vitest';

/** @type {typeof import('./virtual-cloudflare-workers.js')} */
let workers;
/** @type {{ proxy: { FOO: string }; revoke: () => void }} */
let previous;

beforeEach(async () => {
	vi.resetModules();
	previous = Proxy.revocable({ FOO: 'original' }, {});
	vi.stubGlobal('__sveltekit_cloudflare_platform', { env: previous.proxy });
	workers = await import('./virtual-cloudflare-workers.js');
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('forwards every env operation to the replacement platform proxy', () => {
	const { env } = workers;
	expect(Reflect.get(env, 'FOO')).toBe('original');

	const next = { FOO: 'updated', removable: true };
	vi.stubGlobal('__sveltekit_cloudflare_platform', { env: next });
	// Simulate the previous Miniflare instance being disposed.
	previous.revoke();

	expect(Reflect.get(env, 'FOO')).toBe('updated');
	expect('removable' in env).toBe(true);
	expect(Reflect.ownKeys(env)).toEqual(['FOO', 'removable']);
	expect(Reflect.set(env, 'FOO', 'written')).toBe(true);
	expect(next.FOO).toBe('written');
	expect(Reflect.deleteProperty(env, 'removable')).toBe(true);
	expect(next).not.toHaveProperty('removable');
	expect(Reflect.defineProperty(env, 'defined', { value: 42, configurable: true })).toBe(true);
	expect(next).toHaveProperty('defined', 42);
	expect(Reflect.getOwnPropertyDescriptor(env, 'FOO')).toEqual(
		Reflect.getOwnPropertyDescriptor(next, 'FOO')
	);
});

test('preserves nested async env overrides across platform proxy replacements', async () => {
	const { env, withEnv, withEnvAndExports } = workers;
	await withEnv({ FOO: 'override' }, async () => {
		vi.stubGlobal('__sveltekit_cloudflare_platform', { env: { FOO: 'updated' } });
		await Promise.resolve();
		expect(Reflect.get(env, 'FOO')).toBe('override');
		await withEnvAndExports({ FOO: 'nested' }, {}, async () => {
			await Promise.resolve();
			expect(Reflect.get(env, 'FOO')).toBe('nested');
		});
		expect(Reflect.get(env, 'FOO')).toBe('override');
	});
	expect(Reflect.get(env, 'FOO')).toBe('updated');
});

test('rejects env access and overrides when the current platform proxy is absent', () => {
	vi.stubGlobal('__sveltekit_cloudflare_platform', undefined);
	const { env, withEnv, withEnvAndExports } = workers;
	const operations = [
		() => Reflect.get(env, 'FOO'),
		() => Reflect.set(env, 'FOO', 'updated'),
		() => 'FOO' in env,
		() => Reflect.ownKeys(env),
		() => Reflect.deleteProperty(env, 'FOO'),
		() => Reflect.defineProperty(env, 'FOO', { value: 'updated', configurable: true }),
		() => Reflect.getOwnPropertyDescriptor(env, 'FOO'),
		() => withEnv({ FOO: 'override' }, () => {}),
		() => withEnvAndExports({ FOO: 'override' }, {}, () => {})
	];
	for (const operation of operations) {
		expect(operation).toThrow('Cannot access cloudflare:workers in a prerenderable route');
	}
});

test('uses a platform proxy created after the module was evaluated', async () => {
	vi.resetModules();
	vi.stubGlobal('__sveltekit_cloudflare_platform', undefined);
	const { env, withEnv, withEnvAndExports } = await import('./virtual-cloudflare-workers.js');
	vi.stubGlobal('__sveltekit_cloudflare_platform', { env: { FOO: 'created' } });

	expect(Reflect.get(env, 'FOO')).toBe('created');
	expect(withEnv({ FOO: 'override' }, () => Reflect.get(env, 'FOO'))).toBe('override');
	expect(withEnvAndExports({ FOO: 'override' }, {}, () => Reflect.get(env, 'FOO'))).toBe(
		'override'
	);
});
