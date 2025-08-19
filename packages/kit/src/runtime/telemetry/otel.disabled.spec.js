import { test, expect, vi } from 'vitest';
import { otel } from './otel.js';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', false);
});

test('otel should be null when tracing is disabled', () => {
	expect(otel).toBeNull();
});
