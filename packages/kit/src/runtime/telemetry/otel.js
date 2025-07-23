/** @import { Tracer, SpanStatusCode } from '@opentelemetry/api' */

/** @type {{ tracer: Tracer, SpanStatusCode: typeof SpanStatusCode } | null} */
export let otel = null;

if (__SVELTEKIT_SERVER_TRACING_ENABLED__) {
	try {
		const module = await import('@opentelemetry/api');
		otel = {
			tracer: module.trace.getTracer('sveltekit'),
			SpanStatusCode: module.SpanStatusCode
		};
	} catch {
		throw new Error(
			'Tracing is enabled (see `config.kit.experimental.tracing.server` in your svelte.config.js), but `@opentelemetry/api` is not available. Have you installed it?'
		);
	}
}
