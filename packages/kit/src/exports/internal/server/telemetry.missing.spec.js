import { test, expect } from 'vitest';
import { init_tracing, otel } from './telemetry.js';

test('otel throws an error when tracing is enabled but @opentelemetry/api is not available', async () => {
	init_tracing(Promise.reject(new Error('Not available')));

	await expect(otel).rejects.toThrowKitError('tracing_api_missing');
});
