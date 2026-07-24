import { env } from 'sveltekit:env';
import { Server } from 'sveltekit:server';
import { manifest } from 'sveltekit:server-manifest';
import { createReadableStream } from '@sveltejs/kit/node';
import { styleText } from 'node:util';
import { get_options_message } from '../utils.js';
import { set_prerendering } from '$app/env/internal';

set_prerendering(true);

/** @type {import('../../kit/src/types/internal.js').InternalServer} */
const server = new Server(manifest);

await server.init({
	env,
	read: (file) => createReadableStream(file)
});

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function fetch(request) {
	return await server.respond(request, {
		// simulate prerendering during development to surface errors earlier
		prerendering: {
			dependencies: new Map(),
			remote_responses: new Map(),
			fallback: __SVELTEKIT_ADAPTER_STATIC_FALLBACK__
		},
		getClientAddress() {
			throw new Error('Cannot read clientAddress on prerendered pages');
		},
		// @ts-expect-error this is only needed during actual prerendering
		read: undefined,
		before_handle: async (event, _config, prerender, handle) => {
			if (!event.isSubRequest && !event.isDataRequest && !event.isRemoteRequest && !prerender) {
				const error = new Error('Encountered dynamic routes');
				error.stack = '';

				console.error(
					styleText(
						['bold', 'red'],
						`@sveltejs/adapter-static: all routes must be fully prerenderable, but the ${event.url.pathname} route is dynamic\n`
					)
				);

				console.log(get_options_message(!!Object.keys(event.params).length, false));

				throw error;
			}
			return await handle();
		}
	});
}
