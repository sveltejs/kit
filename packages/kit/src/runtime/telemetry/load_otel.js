/**
 * @returns {Promise<import('@opentelemetry/api').Tracer | null>}
 */
export async function load_tracer() {
	try {
		const { trace } = await import('@opentelemetry/api');
		return trace.getTracer('sveltekit');
	} catch {
		return null;
	}
}

/**
 * @returns {Promise<typeof import('@opentelemetry/api').SpanStatusCode | null>}
 */
export async function load_status_code() {
	try {
		const { SpanStatusCode } = await import('@opentelemetry/api');
		return SpanStatusCode;
	} catch {
		return null;
	}
}
