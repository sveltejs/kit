/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { HandleServerError, Transport } from '@sveltejs/kit/hooks' */
/** @import { SSRManifest } from 'types' */
import { get_request_store } from '@sveltejs/kit/internal/server';
import { init_transport } from '#app/internal/transport';
import { noop } from '../../utils/functions.js';
import { default_handle_error } from './errors.js';
import { set_hooks, set_manifest } from './internal.js';
import { get_remote_id, handle_remote_call } from './remote-functions.js';

// The server versions of the remote functions, for tools that create remote functions
// in a page where `$app/server` is not available
export { command, form, prerender, query, requested } from '../app/server/remote/index.js';

export { get_remote_id };

/**
 * Sets up SvelteKit's server runtime to answer remote function requests without a SvelteKit
 * server, for tools that run components and their remote functions in one page, such as a
 * component test runner. `remotes` maps the hash of each remote file to its module, whose
 * exports went through `init_remote_functions`
 * @param {{
 *   remotes: Record<string, () => Promise<{ default: Record<string, any> }>>;
 *   handleError?: HandleServerError;
 *   transport?: Transport;
 * }} options
 */
export function init_remote_server({
	remotes,
	handleError = default_handle_error,
	transport = {}
}) {
	set_hooks({
		handle: ({ event, resolve }) => resolve(event),
		handleError,
		handleFetch: ({ request, fetch }) => fetch(request),
		reroute: noop
	});

	init_transport(transport);

	set_manifest(/** @type {SSRManifest} */ ({ remotes }));
}

/**
 * Answers a request for a remote function (`/_app/remote/...`) with the modules passed to
 * `init_remote_server`. Like SvelteKit's server, it reads the request state from the request
 * store of `event`, so call it inside one, for example in the `resolve` of a `handle` hook
 * @param {RequestEvent} event
 * @returns {Promise<Response>}
 */
export function handle_remote_request(event) {
	const { state } = get_request_store();
	const id = get_remote_id(new URL(event.request.url)) || '';

	return handle_remote_call(event, state, id);
}
