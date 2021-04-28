// import type { ServerRequest } from 'https://deno.land/std@0.95.0/http/server.ts';

/**
 * Converts request headers from Headers to a plain key-value object, as used in node
 * @param {Headers} headers Browser/Deno Headers object
 * @returns {object} Plain key-value headers object
 */
export const headers_to_object = (headers) => Object.fromEntries(headers.entries());

/**
 * @param {ServerRequest} req Deno server request object
 * @returns {Promise<string>} Resolves with the request body decoded to a string
 */
export async function getRawBody(req) {
	const { headers } = req;
	// take the first content-type header
	// TODO: is split(',') enough?
	const type = headers.get('content-type')?.split(/,;\s*/)?.[0];
	if (type === null) {
		return null;
	}

	const data = await Deno.readAll(req.body);

	// return raw buffer for octet-stream content-type
	if (type === 'application/octet-stream') {
		return data.buffer;
	}

	// decode the raw buffer into a string
	const decoder = new TextDecoder(req.headers.get('content-encoding') ?? 'utf-8');
	return decoder.decode(data);
}
