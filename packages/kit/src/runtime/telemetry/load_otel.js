/** @import { Tracer, SpanStatusCode } from '@opentelemetry/api' */

/** @type {Promise<{ tracer: Tracer, SpanStatusCode: typeof SpanStatusCode } | null> | null} */
let otel_result = null;

export function load_otel() {
	if (otel_result) return otel_result;
	otel_result = import('@opentelemetry/api')
		.then((module) => {
			const { trace, SpanStatusCode } = module;
			return {
				tracer: trace.getTracer('sveltekit'),
				SpanStatusCode
			};
		})
		.catch(() => null);
	return otel_result;
}
