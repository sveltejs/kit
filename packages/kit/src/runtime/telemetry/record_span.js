/** @import { Attributes, Span, Tracer } from '@opentelemetry/api' */
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { load_otel } from './load_otel.js';
import { noop_span } from './noop.js';

/**
 * @template T
 * @param {Object} options
 * @param {string} options.name
 * @param {Tracer} options.tracer
 * @param {Attributes} options.attributes
 * @param {function(Span): Promise<T>} options.fn
 * @returns {Promise<T>}
 */
export async function record_span({ name, tracer, attributes, fn }) {
	const otel = await load_otel();
	if (otel === null) {
		return fn(noop_span);
	}

	const { SpanStatusCode } = otel;

	return tracer.startActiveSpan(name, { attributes }, async (span) => {
		try {
			const result = await fn(span);
			span.end();
			return result;
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
			span.end();

			throw error;
		}
	});
}
