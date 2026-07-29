/** @import { SSRHandler } from '@sveltejs/kit' */

/** @type {SSRHandler} */
export default function (server) {
	return (request) => {
		return server.respond(request, {});
	};
}
