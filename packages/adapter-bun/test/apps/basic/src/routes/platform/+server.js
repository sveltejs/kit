import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ getClientAddress, platform }) {
	return json({
		address: getClientAddress(),
		request: platform?.request instanceof Request,
		server: typeof platform?.server?.requestIP === 'function',
		id: platform?.server.id,
		protocol: platform?.server.protocol,
		pendingRequests: platform?.server.pendingRequests,
		pendingWebSockets: platform?.server.pendingWebSockets,
		subscribers: platform?.server.subscriberCount('adapter-bun-test')
	});
}
