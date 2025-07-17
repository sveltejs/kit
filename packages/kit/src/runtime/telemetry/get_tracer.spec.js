import { describe, test, expect, beforeEach, vi } from 'vitest';
import { disable_tracing, enable_tracing, get_tracer } from './get_tracer.js';
import { noop_tracer } from './noop.js';
import * as load_otel from './load_otel.js';

describe('get_tracer', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		disable_tracing();
	});

	test('returns noop tracer if tracing is disabled', async () => {
		const tracer = await get_tracer();
		expect(tracer).toBe(noop_tracer);
	});

	test('returns noop tracer if @opentelemetry/api is not installed, warning', async () => {
		enable_tracing();
		vi.spyOn(load_otel, 'load_otel').mockResolvedValue(null);
		const console_warn_spy = vi.spyOn(console, 'warn');

		const tracer = await get_tracer();
		expect(tracer).toBe(noop_tracer);
		expect(console_warn_spy).toHaveBeenCalledWith(
			'Tracing is enabled, but `@opentelemetry/api` is not available. Have you installed it?'
		);
	});

	test('returns otel tracer if @opentelemetry/api is installed', async () => {
		enable_tracing();
		const tracer = await get_tracer();
		expect(tracer).not.toBe(noop_tracer);
	});
});
