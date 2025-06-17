/** @import { Tracer } from '@opentelemetry/api' */
import { DEV } from 'esm-env';
import { noop_tracer } from './noop.js';
import { load_otel } from './load_otel.js';

/**
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.is_enabled=false] - Whether tracing is enabled
 * @returns {Promise<Tracer>} The tracer instance
 */
export async function get_tracer({ is_enabled = false } = {}) {
	if (!is_enabled) {
		return noop_tracer;
	}

	const otel = await load_otel();
	if (otel === null) {
		if (DEV) {
			console.warn(
				'Tracing is enabled, but `@opentelemetry/api` is not available. Have you installed it?'
			);
		}
		return noop_tracer;
	}

	return otel.tracer;
}
