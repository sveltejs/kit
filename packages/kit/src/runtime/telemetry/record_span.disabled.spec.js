import { test, expect, vi } from 'vitest';
import { record_span } from './record_span.js';
import { noop_span } from './noop.js';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', false);
});

test('it runs function with noop span if @opentelemetry/api is not available', async () => {
	const fn = vi.fn().mockResolvedValue('result');

	const result = await record_span({ name: 'test', attributes: {}, fn });
	expect(result).toBe('result');
	expect(fn).toHaveBeenCalledWith(noop_span);
});
