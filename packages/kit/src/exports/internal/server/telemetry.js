/** @import { Tracer, SpanStatusCode, PropagationAPI, ContextAPI } from '@opentelemetry/api' */
/** @import { RecordSpan } from 'types' */
import { HttpError, Redirect } from '@sveltejs/kit/internal';
import { noop_span } from '../../../runtime/telemetry/noop.js';

// Import this module by its bare specifier so bundled and external code share its state.

/** @type {Promise<{ tracer: Tracer, SpanStatusCode: typeof SpanStatusCode, propagation: PropagationAPI, context: ContextAPI }> | null} */
export let otel = null;

/**
 * @param {boolean} enabled
 * @returns {void}
 */
export function init_tracing(enabled) {
	if (!enabled) {
		otel = null;
		return;
	}

	otel = import('@opentelemetry/api')
		.then((module) => {
			return {
				tracer: module.trace.getTracer('sveltekit'),
				propagation: module.propagation,
				context: module.context,
				SpanStatusCode: module.SpanStatusCode
			};
		})
		.catch(() => {
			throw new Error(
				'Tracing is enabled (see the SvelteKit plugin `tracing.server` option in your vite.config.js), but `@opentelemetry/api` is not available. This error will likely resolve itself when you set up your tracing instrumentation in `instrumentation.server.js`. For more information, see https://svelte.dev/docs/kit/observability#opentelemetry-api'
			);
		});
}

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
