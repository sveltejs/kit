import { test, expect, vi } from 'vitest';

vi.mock('@opentelemetry/api', () => {
	throw new Error('Not available');
});

test('otel throws an error when tracing is enabled but @opentelemetry/api is not available', async () => {
	const telemetry = await import('./telemetry.js');
	telemetry.init_tracing();

	await expect(telemetry.otel).rejects.toThrow(
		'Tracing is enabled (see the SvelteKit plugin `tracing.server` option in your vite.config.js), but `@opentelemetry/api` is not available. This error will likely resolve itself when you set up your tracing instrumentation in `instrumentation.server.js`. For more information, see https://svelte.dev/docs/kit/observability#opentelemetry-api'
	);
});
