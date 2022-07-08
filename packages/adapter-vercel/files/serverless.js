import { installPolyfills } from '@sveltejs/kit/node/polyfills';
import { getRequest, setResponse } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

installPolyfills();

const server = new Server(manifest);

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async (req, res) => {
	/** @type {Request} */
	let request;

	try {
		request = await getRequest(`https://${req.headers.host}`, req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	setResponse(
		res,
		await server.respond(request, {
			getClientAddress() {
				return request.headers.get('x-forwarded-for');
			}
		})
	);
};
