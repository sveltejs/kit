import { test, expect, vi } from 'vitest';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', true);
});

vi.mock('@opentelemetry/api', () => {
	throw new Error('Not available');
});

test('otel should throw an error when tracing is enabled but @opentelemetry/api is not available', async () => {
	await expect(import('./otel.js')).rejects.toThrow(
		'Tracing is enabled (see `config.kit.experimental.tracing.server` in your svelte.config.js), but `@opentelemetry/api` is not available. Have you installed it?'
	);
});
