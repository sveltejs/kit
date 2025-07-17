/** @import { Tracer } from '@opentelemetry/api' */
import { DEV } from 'esm-env';
import { noop_tracer } from './noop.js';
import { load_otel } from './load_otel.js';

// this is controlled via a global flag because we need to access it in locations where we don't have access to the config
// (specifically, in `sequence`-d handle functions)
// since this is a global flag with a static value, it's safe to set it during server initialization
let is_enabled = false;

export function enable_tracing() {
	is_enabled = true;
}

export function disable_tracing() {
	is_enabled = false;
}

/**
 * @returns {Promise<Tracer>} The tracer instance
 */
export async function get_tracer() {
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
