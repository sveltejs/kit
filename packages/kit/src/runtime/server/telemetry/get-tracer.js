/** @import { Tracer } from '@opentelemetry/api' */
import { trace } from '@opentelemetry/api';
import { noop_tracer } from './noop-tracer.js';

/**
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.is_enabled=false] - Whether tracing is enabled
 * @param {Tracer} [options.tracer] - Custom tracer instance
 * @returns {Tracer} The tracer instance
 */
export function get_tracer({ is_enabled = false, tracer } = {}) {
	if (!is_enabled) {
		return noop_tracer;
	}

	if (tracer) {
		return tracer;
	}

	return trace.getTracer('sveltekit');
}
