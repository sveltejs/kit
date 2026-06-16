/** @import { Span, Tracer } from '@opentelemetry/api' */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { handle_remote_call } from './call.js';
import { handle_remote_form_post } from './form-post.js';
import { BINARY_FORM_CONTENT_TYPE, serialize_binary_form } from '../../form-utils.js';
import {
	create_mock_event,
	create_mock_internals,
	create_mock_manifest,
	create_mock_options,
	create_mock_remote,
	create_mock_request,
	create_mock_state
} from '../../../../test/mocks/server.js';

// turn on tracing and swap in a mock tracer/span so we can assert on what the
// handlers emit (mirrors `runtime/telemetry/record_span.enabled.spec.js`)
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

	const mock_tracer = /** @type {Tracer} */ (
		/** @type {unknown} */ ({
			startActiveSpan: vi.fn((_name, _options, fn) => fn(mock_span)),
			startSpan: vi.fn((_name, _options, fn) => fn(mock_span))
		})
	);

	return { tracer: mock_tracer, span: mock_span };
});

vi.mock(import('../../telemetry/otel.js'), async (original) => {
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

describe('remote function tracing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('handle_remote_call emits a span with the call id, type and name', async () => {
		const internals = create_mock_internals({ type: 'query', id: 'h/myquery', name: 'myquery' });
		const fn = create_mock_remote(() => 'result', internals);
		const manifest = create_mock_manifest({ h: { myquery: fn } });
		const event = create_mock_event({
			request: create_mock_request({ url: 'http://localhost/_app/remote/h/myquery?payload=' })
		});

		await handle_remote_call(
			event,
			create_mock_state(),
			create_mock_options(),
			manifest,
			'h/myquery'
		);

		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'sveltekit.remote.call',
			{ attributes: { 'sveltekit.remote.call.id': 'h/myquery' } },
			expect.any(Function)
		);
		expect(span.setAttributes).toHaveBeenCalledWith({
			'sveltekit.remote.call.type': 'query',
			'sveltekit.remote.call.name': 'myquery'
		});
		expect(span.end).toHaveBeenCalled();
	});

	test('records an error that escapes the handler on the span', async () => {
		const event = create_mock_event();

		await expect(
			handle_remote_call(
				event,
				create_mock_state(),
				create_mock_options(),
				create_mock_manifest({}),
				'missing/fn'
			)
		).rejects.toMatchObject({ status: 404 });

		// the 404 is thrown before the handler's try/catch, so it propagates through
		// `record_span`, which records it on the span
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({
				'sveltekit.remote.call.result.type': 'known_error',
				'sveltekit.remote.call.result.status': 404
			})
		);
		expect(span.end).toHaveBeenCalled();
	});

	test('handle_remote_form_post emits a span with the form post id', async () => {
		const { blob } = serialize_binary_form({}, {});
		const form = create_mock_remote(
			() => {},
			create_mock_internals({ type: 'form', fn: () => Promise.resolve() })
		);
		const manifest = create_mock_manifest({ h: { myform: form } });
		const event = create_mock_event({
			request: create_mock_request({
				method: 'POST',
				headers: {
					'content-type': BINARY_FORM_CONTENT_TYPE,
					'content-length': blob.size.toString()
				},
				body: blob
			})
		});

		await handle_remote_form_post(event, create_mock_state(), manifest, 'h/myform');

		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'sveltekit.remote.form.post',
			{ attributes: { 'sveltekit.remote.form.post.id': 'h/myform' } },
			expect.any(Function)
		);
		expect(span.end).toHaveBeenCalled();
	});
});
