/** @import { Tracer, Span, SpanStatusCode, PropagationAPI, ContextAPI } from '@opentelemetry/api' */
/** @import { RecordSpan } from 'types' */
import { HttpError, Redirect } from '../shared.js';
import { noop_span } from '../../../telemetry.js';
import * as e from '../../../messages/server-errors.js';
import { start_devtools_span } from './devtools.js';

// Import this module by its bare specifier so bundled and external code share its state.

/** @type {Promise<{ tracer: Tracer, SpanStatusCode: typeof SpanStatusCode, propagation: PropagationAPI, context: ContextAPI }> | null} */
export let otel = null;

/**
 * The caller passes in `import('@opentelemetry/api')` so the import lives behind
 * `__SVELTEKIT_SERVER_TRACING_ENABLED__` in the bundled runtime and is eliminated
 * from builds with tracing disabled, where the package may not be installed.
 * @param {Promise<typeof import('@opentelemetry/api')>} api
 * @returns {void}
 */
export function init_tracing(api) {
	otel ??= api
		.then((module) => {
			return {
				tracer: module.trace.getTracer('sveltekit'),
				propagation: module.propagation,
				context: module.context,
				SpanStatusCode: module.SpanStatusCode
			};
		})
		.catch(() => e.tracing_api_missing());
}

/** @type {RecordSpan} */
export async function record_span({ name, attributes, fn }) {
	const dev_span = start_devtools_span(name, attributes);

	if (otel === null) {
		if (dev_span === null) return fn(noop_span);

		// without opentelemetry the devtools span is the one kit and user code see
		return dev_span.run(async () => {
			try {
				return await fn(dev_span);
			} catch (error) {
				// SpanStatusCode.ERROR, which cannot be imported without opentelemetry
				record_error(dev_span, name, error, /** @type {SpanStatusCode} */ (2));
				throw error;
			} finally {
				dev_span.end();
			}
		});
	}

	const { SpanStatusCode, tracer } = await otel;

	return tracer.startActiveSpan(name, { attributes }, async (span) => {
		const run = async () => {
			try {
				return await fn(span);
			} catch (error) {
				record_error(span, name, error, SpanStatusCode.ERROR);
				if (dev_span) record_error(dev_span, name, error, SpanStatusCode.ERROR);
				throw error;
			} finally {
				span.end();
				dev_span?.end();
			}
		};

		// with opentelemetry the devtools span only shadows the real one
		return dev_span ? dev_span.run(run) : run();
	});
}

/**
 * @param {Span} span
 * @param {string} name
 * @param {unknown} error
 * @param {SpanStatusCode} ERROR
 */
function record_error(span, name, error, ERROR) {
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
				code: ERROR,
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
			// conditional so this compiles under consumers' `exactOptionalPropertyTypes`
			...(error.stack !== undefined && { stack: error.stack })
		});
		span.setStatus({
			code: ERROR,
			message: error.message
		});
	} else {
		span.setAttributes({
			[`${name}.result.type`]: 'unknown_error'
		});
		span.setStatus({ code: ERROR });
	}
}
