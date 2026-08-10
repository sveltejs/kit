import { test, expect } from 'vitest';
import { init_tracing, otel } from './telemetry.js';

test('otel throws an error when tracing is enabled but @opentelemetry/api is not available', async () => {
	init_tracing(Promise.reject(new Error('Not available')));

	await expect(otel).rejects.toThrow(
		'Tracing is enabled (see the SvelteKit plugin `tracing.server` option in your vite.config.js), but `@opentelemetry/api` is not available. This error will likely resolve itself when you set up your tracing instrumentation in `instrumentation.server.js`. For more information, see https://svelte.dev/docs/kit/observability#opentelemetry-api'
	);
});
