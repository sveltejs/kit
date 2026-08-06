import { test, expect, vi } from 'vitest';
import { init_tracing, otel, record_span } from './telemetry.js';
import { noop_span } from '../../../runtime/telemetry/noop.js';

test('record_span uses the noop span before tracing is initialized', async () => {
	const fn = vi.fn().mockResolvedValue('result');

	const result = await record_span({ name: 'test', attributes: {}, fn });
	expect(result).toBe('result');
	expect(fn).toHaveBeenCalledWith(noop_span);
});

test('tracing is disabled', async () => {
	init_tracing(false);
	expect(otel).toBeNull();

	const fn = vi.fn().mockResolvedValue('result');
	const result = await record_span({ name: 'test', attributes: {}, fn });
	expect(result).toBe('result');
	expect(fn).toHaveBeenCalledWith(noop_span);
});
