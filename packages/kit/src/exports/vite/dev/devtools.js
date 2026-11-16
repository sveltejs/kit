/** @import { NormalizedHotChannel, NormalizedHotChannelClient, WebSocketServer } from 'vite' */
/** @import { IncomingMessage } from 'node:http' */
/** @import { DevtoolsChannel } from 'types' */
import { formatWithOptions } from 'node:util';

/**
 * events go only to clients that sent sveltekit:devtools:subscribe, so nothing is recorded without one
 * @param {NormalizedHotChannel} hot hmr channel of the client environment
 * @param {Pick<WebSocketServer, 'on'>} ws
 * @returns {DevtoolsChannel}
 */
export function create_devtools_channel(hot, ws) {
	/** @type {Set<NormalizedHotChannelClient>} */
	const clients = new Set();

	// subscribers see requests and logs from every visitor, so only this machine may subscribe
	/** @type {WeakSet<object>} */
	const local_sockets = new WeakSet();

	ws.on('connection', (/** @type {object} */ socket, /** @type {IncomingMessage} */ req) => {
		if (is_loopback(req.socket.remoteAddress)) local_sockets.add(socket);
	});

	hot.on('sveltekit:devtools:subscribe', (_data, client) => {
		const socket = /** @type {{ socket?: object }} */ (client).socket;

		if (!socket || !local_sockets.has(socket)) {
			client.send('sveltekit:devtools:refused', {
				reason: 'devtools can only subscribe from the machine running the dev server'
			});
			return;
		}

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

/**
 * @param {string | undefined} address
 */
export function is_loopback(address) {
	if (!address) return false;
	if (address.startsWith('::ffff:')) address = address.slice(7);
	return address === '::1' || address.startsWith('127.');
}
