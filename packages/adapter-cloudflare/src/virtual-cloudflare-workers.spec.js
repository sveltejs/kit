import { afterEach, expect, test, vi } from 'vitest';
import { sync_bindings } from '../utils.js';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

test('env returns the values of vars and secrets during the build', async () => {
	vi.stubEnv('STUB_SECRET', 'from process.env');
	sync_bindings(
		{
			STUB_TEXT: { type: 'plain_text', value: 'text' },
			STUB_JSON: { type: 'json', value: { a: 1 } }
		},
		['STUB_SECRET', 'STUB_MISSING_SECRET']
	);

	const { env } = await import('./virtual-cloudflare-workers.js');

	expect({ ...env }).toEqual({
		STUB_TEXT: 'text',
		STUB_JSON: { a: 1 },
		STUB_SECRET: 'from process.env',
		STUB_MISSING_SECRET: undefined
	});
});

test('other bindings can be passed around but not used during the build', async () => {
	sync_bindings({ DB: { type: 'd1' } }, []);

	const { env } = await import('./virtual-cloudflare-workers.js');
	const db = /** @type {Record<string, any>} */ (env).DB;

	expect(await Promise.resolve(db)).toBe(db);
	expect(() => db.prepare('select 1')).toThrow(
		'Cannot access `prepare` on the `DB` binding during the build'
	);
});
