/** @import { Tracer, SpanStatusCode, PropagationAPI, ContextAPI } from '@opentelemetry/api' */

/** @type {Promise<{ tracer: Tracer, SpanStatusCode: typeof SpanStatusCode, propagation: PropagationAPI, context: ContextAPI }> | null} */
export let otel = null;

if (__SVELTEKIT_SERVER_TRACING_ENABLED__) {
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
				'Tracing is enabled (see `config.kit.experimental.instrumentation.server` in your svelte.config.js), but `@opentelemetry/api` is not available. Have you installed it?'
			);
		});
}
