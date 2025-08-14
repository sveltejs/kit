import { test, expect, vi } from 'vitest';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', true);
});

vi.mock('@opentelemetry/api', () => {
	throw new Error('Not available');
});

test('otel should throw an error when tracing is enabled but @opentelemetry/api is not available', async () => {
	const { otel } = await import('./otel.js');
	await expect(otel).rejects.toThrow(
		'Tracing is enabled (see `config.kit.experimental.instrumentation.server` in your svelte.config.js), but `@opentelemetry/api` is not available. Have you installed it?'
	);
});
