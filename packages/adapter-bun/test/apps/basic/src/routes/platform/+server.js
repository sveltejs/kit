import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ getClientAddress, platform }) {
	const packageData = import.meta.env.ADAPTER_BUN_COMPILE
		? 'package data'
		: new (await import('jsdom')).JSDOM('<p>package data</p>').window.document.querySelector('p')
				?.textContent;

	return json({
		address: getClientAddress(),
		server: typeof platform?.server?.requestIP === 'function',
		id: platform?.server.id,
		protocol: platform?.server.protocol,
		pendingRequests: platform?.server.pendingRequests,
		pendingWebSockets: platform?.server.pendingWebSockets,
		subscribers: platform?.server.subscriberCount('adapter-bun-test'),
		packageData
	});
}
