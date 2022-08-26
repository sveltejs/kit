import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

const server = new Server(manifest);

/**
 * @param {Request} request
 */
export default async (request) => {
	await server.init({
		env: process.env
	});

	return server.respond(request, {
		getClientAddress() {
			return request.headers.get('x-forwarded-for');
		}
	});
};
