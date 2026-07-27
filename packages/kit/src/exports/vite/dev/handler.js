/** @import { SSRHandler } from '@sveltejs/kit' */
import { createReadableStream } from '@sveltejs/kit/node';

/**
 * The handler used when the adapter doesn't provide a `customHandler`.
 * @type {SSRHandler}
 */
export default async function (server, env) {
	await server.init({
		env,
		read: (file) => createReadableStream(file)
	});

	return (request, address) => {
		return server.respond(request, {
			getClientAddress() {
				if (!address) throw new Error('Could not determine clientAddress');
				return address;
			}
		});
	};
}
