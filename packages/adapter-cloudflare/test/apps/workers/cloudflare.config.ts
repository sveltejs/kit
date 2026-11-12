import { bindings, defineConfig } from '@cloudflare/config';

export default defineConfig({
	worker: {
		name: 'test-cloudflare-workers',
		compatibilityDate: '2026-08-06',
		env: {
			FOO: bindings.text('from cloudflare.config.ts'),
			JSON: bindings.json({ from: 'cloudflare.config.ts' }),
			SECRET: bindings.secret(),
			KV: bindings.kv()
		}
	}
});
