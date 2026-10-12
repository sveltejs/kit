import { try_get_event } from './event.js';

export function get_origin() {
	// `request.url` rather than `event.url`, which throws inside queries
	const request = try_get_event()?.request;
	return request && new URL(request.url).origin;
}

export {
	with_event,
	getRequestEvent,
	get_event,
	try_get_event,
	RequestEvent,
	QUERY,
	PRERENDER,
	FORM,
	COMMAND,
	RENDER
} from './event.js';

export { init_remote_functions } from './remote-functions.js';

export { init_tracing, otel, record_span } from './telemetry.js';

export * from '../shared.js';
