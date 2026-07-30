/** @import { SSRHandler } from '@sveltejs/kit' */

/** @type {SSRHandler} */
export default function (server) {
	return (request) => server.respond(request);
}
