/** @import { SpanAttributes, Span, Tracer } from '@opentelemetry/api' */
import { SpanStatusCode } from '@opentelemetry/api';
import { HttpError, Redirect } from '../../control.js';

/**
 * @template T
 * @param {Object} options
 * @param {string} options.name
 * @param {Tracer} options.tracer
 * @param {SpanAttributes} options.attributes
 * @param {function(Span): Promise<T>} options.fn
 * @returns {Promise<T>}
 */
export function record_span({ name, tracer, attributes, fn }) {
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
				span.recordException({
					name: 'HttpError',
					message: error.body.message
				});
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error.body.message
				});
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
