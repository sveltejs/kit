/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { Span } from '@opentelemetry/api' */
/** @import { RecordSpan, RequestState } from 'types' */
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { merge_tracing, with_request_store } from '@sveltejs/kit/internal/server';
import { noop_span } from './noop.js';
import { otel } from './otel.js';

/** @type {RecordSpan} */
export async function record_span({ name, attributes, fn }) {
	if (otel === null) {
		return fn(noop_span);
	}

	const { SpanStatusCode, tracer } = await otel;

	return tracer.startActiveSpan(name, { attributes }, async (span) => {
		try {
			return await fn(span);
		} catch (error) {
			if (error instanceof HttpError) {
				span.setAttributes({
					[`${name}.result.type`]: 'known_error',
					[`${name}.result.status`]: error.status,
					[`${name}.result.message`]: error.body.message
				});
				if (error.status >= 500) {
					span.recordException({
						name: 'HttpError',
						message: error.body.message
					});
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: error.body.message
					});
				}
			} else if (error instanceof Redirect) {
				span.setAttributes({
					[`${name}.result.type`]: 'redirect',
					[`${name}.result.status`]: error.status,
					[`${name}.result.location`]: error.location
				});
			} else if (error instanceof Error) {
				span.setAttributes({
					[`${name}.result.type`]: 'unknown_error'
				});
				span.recordException({
					name: error.name,
					message: error.message,
					stack: error.stack
				});
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error.message
				});
			} else {
				span.setAttributes({
					[`${name}.result.type`]: 'unknown_error'
				});
				span.setStatus({ code: SpanStatusCode.ERROR });
			}

			throw error;
		} finally {
			span.end();
		}
	});
}

/**
 * @template T
 * @param {{
 *   name: string;
 *   attributes: Parameters<RecordSpan>[0]['attributes'];
 *   event: RequestEvent;
 *   state: RequestState;
 *   fn: (event: RequestEvent, current: Span) => Promise<T>;
 * }} options
 * @returns {Promise<T>}
 */
export function record_traced_span({ name, attributes, event, state, fn }) {
	return record_span({
		name,
		attributes,
		fn: (current) => {
			const traced_event = merge_tracing(event, current);
			return with_request_store({ event: traced_event, state }, () => fn(traced_event, current));
		}
	});
}
