import { afterEach, expect, test, vi } from 'vitest';
import { sync_bindings } from '../utils.js';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

/** @param {Record<string, { type: string; value?: unknown }>} env */
async function import_stub(env) {
	sync_bindings(/** @type {any} */ ({ env }));
	return await import('./virtual-cloudflare-workers.js');
}

test('env returns the values of text, JSON and secret bindings', async () => {
	vi.stubEnv('STUB_SECRET', 'from process.env');

	const { env } = await import_stub({
		STUB_TEXT: { type: 'text', value: 'text' },
		STUB_JSON: { type: 'json', value: { a: 1 } },
		STUB_SECRET: { type: 'secret' },
		STUB_MISSING_SECRET: { type: 'secret' }
	});

	expect(env).toEqual({
		STUB_TEXT: 'text',
		STUB_JSON: { a: 1 },
		STUB_SECRET: 'from process.env',
		STUB_MISSING_SECRET: undefined
	});
});

test('other bindings can be passed around but not used', async () => {
	const { env } = await import_stub({ DB: { type: 'd1' } });
	const db = /** @type {any} */ (env.DB);

	expect(await Promise.resolve(db)).toBe(db);
	expect(() => db.prepare('select 1')).toThrow(
		'Cannot access `prepare` on the `DB` binding outside the Workers runtime'
	);
});
