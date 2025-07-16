import { describe, test, expect, vi } from 'vitest';
import { record_span } from './record_span.js';
import { noop_span, noop_tracer } from './noop.js';
import * as load_otel from './load_otel.js';
import { HttpError, Redirect } from '@sveltejs/kit/internal';

const create_mock_span = () =>
	/** @type {import('@opentelemetry/api').Span} */ (
		/** @type {unknown} */ ({
			end: vi.fn(),
			setAttributes: vi.fn(),
			setStatus: vi.fn(),
			recordException: vi.fn()
		})
	);

/** @type {() => { tracer: import('@opentelemetry/api').Tracer, span: import('@opentelemetry/api').Span } } */
const create_mock_tracer = () => {
	const span = create_mock_span();
	const tracer = {
		startActiveSpan: vi.fn().mockImplementation((_name, _options, fn) => {
			return fn(span);
		}),
		startSpan: vi.fn().mockImplementation((_name, _options, fn) => {
			return fn(span);
		})
	};
	return { tracer, span };
};

describe('record_span', () => {
	test('runs function with noop span if @opentelemetry/api is not available', async () => {
		const spy = vi.spyOn(load_otel, 'load_otel').mockResolvedValue(null);
		const fn = vi.fn().mockResolvedValue('result');

		const result = await record_span({ name: 'test', tracer: noop_tracer, attributes: {}, fn });
		expect(result).toBe('result');
		expect(fn).toHaveBeenCalledWith(noop_span);
		spy.mockRestore();
	});

	test('runs function with span if @opentelemetry/api is available', async () => {
		const fn = vi.fn().mockResolvedValue('result');
		const result = await record_span({
			name: 'test',
			tracer: create_mock_tracer().tracer,
			attributes: {},
			fn
		});
		expect(result).toBe('result');
		expect(fn).not.toHaveBeenCalledWith(noop_span);
	});

	test('successful function returns result, attaching correct attributes', async () => {
		const { tracer, span } = create_mock_tracer();
		const fn = vi.fn().mockResolvedValue('result');
		const result = await record_span({
			name: 'test',
			tracer,
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
		const { tracer, span } = create_mock_tracer();
		const error = new HttpError(500, 'Found but badly');
		const error_fn = vi.fn().mockRejectedValue(error);

		await expect(
			record_span({
				name: 'test',
				tracer,
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
		const { tracer, span } = create_mock_tracer();
		const error = new HttpError(404, 'Not found');
		const error_fn = vi.fn().mockRejectedValue(error);

		await expect(
			record_span({
				name: 'test',
				tracer,
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
		const { tracer, span } = create_mock_tracer();
		const error = new Redirect(302, '/redirect-location');
		const error_fn = vi.fn().mockRejectedValue(error);

		await expect(
			record_span({
				name: 'test',
				tracer,
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
		const { tracer, span } = create_mock_tracer();
		const error = new Error('Something went wrong');
		const error_fn = vi.fn().mockRejectedValue(error);

		await expect(
			record_span({
				name: 'test',
				tracer,
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
		const { tracer, span } = create_mock_tracer();
		const error = 'string error';
		const error_fn = vi.fn().mockRejectedValue(error);

		await expect(
			record_span({
				name: 'test',
				tracer,
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
