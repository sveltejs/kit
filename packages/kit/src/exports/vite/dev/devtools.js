/** @import { NormalizedHotChannel, NormalizedHotChannelClient } from 'vite' */
/** @import { DevtoolsChannel } from 'types' */
import { formatWithOptions } from 'node:util';

/**
 * events go only to clients that sent sveltekit:devtools:subscribe, so nothing is recorded without one
 * @param {NormalizedHotChannel} hot hmr channel of the client environment
 * @returns {DevtoolsChannel}
 */
export function create_devtools_channel(hot) {
	/** @type {Set<NormalizedHotChannelClient>} */
	const clients = new Set();

	hot.on('sveltekit:devtools:subscribe', (_data, client) => {
		clients.add(client);
		client.send('sveltekit:devtools:subscribed', { version: 1 });
	});

	hot.on('sveltekit:devtools:unsubscribe', (_data, client) => {
		clients.delete(client);
	});

	hot.on('vite:client:disconnect', (_data, client) => {
		clients.delete(client);
	});

	return {
		get active() {
			return clients.size > 0;
		},
		send(event) {
			for (const client of clients) {
				client.send('sveltekit:devtools', event);
			}
		},
		format(args) {
			return formatWithOptions({ colors: false }, ...args);
		}
	};
}
