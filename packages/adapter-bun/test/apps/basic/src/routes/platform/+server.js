import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export function GET({ getClientAddress, platform }) {
	return json({
		address: getClientAddress(),
		request: platform?.request instanceof Request,
		server: typeof platform?.server?.requestIP === 'function'
	});
}
