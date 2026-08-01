import { trace } from '@opentelemetry/api';

/** @type {import('./$types').PageServerLoad} */
export async function load({ tracing }) {
	tracing.current.setAttribute('current_matches_otel', trace.getActiveSpan() === tracing.current);
	await Promise.resolve();
	tracing.current.setAttribute(
		'current_matches_otel_after_await',
		trace.getActiveSpan() === tracing.current
	);
	return { ok: true };
}
