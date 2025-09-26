import { test, expect, vi } from 'vitest';
import { otel } from './otel.js';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', true);
});

test('otel should be defined when tracing is enabled', () => {
	expect(otel).not.toBeNull();
});
