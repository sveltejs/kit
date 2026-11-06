import { bindings, defineConfig, exports } from '@cloudflare/config';

export default defineConfig({
	worker: {
		name: 'test-cloudflare-custom-worker',
		compatibilityDate: '2026-08-06',
		entrypoint: './src/worker.ts',
		exports: {
			Counter: exports.durableObject({ storage: 'sqlite' })
		},
		env: {
			FOO: bindings.text('from cloudflare.config.ts'),
			COUNTER: bindings.durableObject({
				worker: 'test-cloudflare-custom-worker',
				exportName: 'Counter'
			})
		}
	}
});
