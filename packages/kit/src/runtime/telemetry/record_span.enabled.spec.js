/** @import { Span, Tracer } from '@opentelemetry/api' */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { record_span } from './record_span.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';

vi.hoisted(() => {
	vi.stubGlobal('__SVELTEKIT_SERVER_TRACING_ENABLED__', true);
});

const { tracer, span } = vi.hoisted(() => {
	const mock_span = /** @type {Span} */ (
		/** @type {unknown} */ ({
			end: vi.fn(),
			setAttributes: vi.fn(),
			setStatus: vi.fn(),
			recordException: vi.fn()
		})
	);

	const mock_tracer = /** @type {Tracer} */ ({
		startActiveSpan: vi.fn((_name, _options, fn) => {
			return fn(span);
		}),
		startSpan: vi.fn((_name, _options, fn) => {
			return fn(span);
		})
	});

	return { tracer: mock_tracer, span: mock_span };
});

vi.mock(import('./otel.js'), async (original) => {
	const { otel: unresolved_otel } = await original();
	const otel = await unresolved_otel;

	if (otel === null) {
		throw new Error('Problem setting up tests; otel is null');
	}

	return {
		otel: Promise.resolve({
			tracer,
			SpanStatusCode: otel.SpanStatusCode,
			propagation: otel.propagation,
			context: otel.context
		})
	};
});

describe('record_span', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('successful function returns result, attaching correct attributes', async () => {
		const fn = vi.fn(() => Promise.resolve('result'));
		const result = await record_span({
			name: 'test',
			attributes: { 'test-attribute': true },
			fn
		});
		expect(result).toBe('result');
		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'test',
			{ attributes: { 'test-attribute': true } },
			expect.any(Function)
		);
		expect(span.end).toHaveBeenCalled();
	});

	test('HttpError sets correct attributes and re-throw, does set status for >=500', async () => {
		const error = new HttpError(500, 'Found but badly');
		const error_fn = vi.fn(() => Promise.reject(error));

		await expect(
			record_span({
				name: 'test',
				attributes: {},
				fn: error_fn
			})
		).rejects.toBe(error);

		expect(span.setAttributes).toHaveBeenCalledWith({
			'test.result.type': 'known_error',
			'test.result.status': 500,
			'test.result.message': 'Found but badly'
		});
		expect(span.recordException).toHaveBeenCalledWith({
			name: 'HttpError',
			message: 'Found but badly'
		});
		expect(span.setStatus).toHaveBeenCalledWith({
			code: expect.any(Number),
			message: 'Found but badly'
		});
		expect(span.end).toHaveBeenCalled();
	});

	test('HttpError sets correct attributes and re-throws, does not set status for <500', async () => {
		const error = new HttpError(404, 'Not found');
		const error_fn = vi.fn(() => Promise.reject(error));

		await expect(
			record_span({
				name: 'test',
				attributes: {},
				fn: error_fn
			})
		).rejects.toBe(error);

		expect(span.setAttributes).toHaveBeenCalledWith({
			'test.result.type': 'known_error',
			'test.result.status': 404,
			'test.result.message': 'Not found'
		});
		expect(span.end).toHaveBeenCalled();
	});

	test('Redirect sets correct attributes and re-throws', async () => {
		const error = new Redirect(302, '/redirect-location');
		const error_fn = vi.fn(() => Promise.reject(error));

		await expect(
			record_span({
				name: 'test',
				attributes: {},
				fn: error_fn
			})
		).rejects.toBe(error);

		expect(span.setAttributes).toHaveBeenCalledWith({
			'test.result.type': 'redirect',
			'test.result.status': 302,
			'test.result.location': '/redirect-location'
		});
		expect(span.setStatus).not.toHaveBeenCalled();
		expect(span.end).toHaveBeenCalled();
	});

	test('Generic Error sets correct attributes and re-throws', async () => {
		const error = new Error('Something went wrong');
		const error_fn = vi.fn(() => Promise.reject(error));

		await expect(
			record_span({
				name: 'test',
				attributes: {},
				fn: error_fn
			})
		).rejects.toThrow(error);

		expect(span.setAttributes).toHaveBeenCalledWith({
			'test.result.type': 'unknown_error'
		});
		expect(span.recordException).toHaveBeenCalledWith({
			name: 'Error',
			message: 'Something went wrong',
			stack: error.stack
		});
		expect(span.setStatus).toHaveBeenCalledWith({
			code: expect.any(Number),
			message: 'Something went wrong'
		});
		expect(span.end).toHaveBeenCalled();
	});

	test('Non-Error object sets correct attributes and re-throws', async () => {
		const error = 'string error';
		const error_fn = vi.fn(() => Promise.reject(error));

		await expect(
			record_span({
				name: 'test',
				attributes: {},
				fn: error_fn
			})
		).rejects.toThrow(error);

		expect(span.setAttributes).toHaveBeenCalledWith({
			'test.result.type': 'unknown_error'
		});
		expect(span.setStatus).toHaveBeenCalledWith({
			code: expect.any(Number)
		});
		expect(span.end).toHaveBeenCalled();
	});
});
