import './shims';
import { Server } from '0SERVER';
import { split_headers } from './headers';

/**
 * @param {import('@sveltejs/kit').SSRManifest} manifest
 * @returns {import('@netlify/functions').Handler}
 */
export function init(manifest) {
	const server = new Server(manifest);

	return async (event, context) => {
		const response = await server.respond(to_request(event), {
			platform: { context },
			getClientAddress() {
				return event.headers['x-nf-client-connection-ip'];
			}
		});

		const partial_response = {
			statusCode: response.status,
			...split_headers(response.headers)
		};

		if (!is_text(response.headers.get('content-type'))) {
			// Function responses should be strings (or undefined), and responses with binary
			// content should be base64 encoded and set isBase64Encoded to true.
			// https://github.com/netlify/functions/blob/main/src/function/response.ts
			return {
				...partial_response,
				isBase64Encoded: true,
				body: Buffer.from(await response.arrayBuffer()).toString('base64')
			};
		}

		return {
			...partial_response,
			body: await response.text()
		};
	};
}

/**
 * @param {import('@netlify/functions').HandlerEvent} event
 * @returns {Request}
 */
function to_request(event) {
	const { httpMethod, headers, rawUrl, body, isBase64Encoded } = event;

	/** @type {RequestInit} */
	const init = {
		method: httpMethod,
		headers: new Headers(headers)
	};

	if (httpMethod !== 'GET' && httpMethod !== 'HEAD') {
		const encoding = isBase64Encoded ? 'base64' : 'utf-8';
		init.body = typeof body === 'string' ? Buffer.from(body, encoding) : body;
	}

	return new Request(rawUrl, init);
}

const text_types = new Set([
	'application/xml',
	'application/json',
	'application/x-www-form-urlencoded',
	'multipart/form-data'
]);

/**
 * Decides how the body should be parsed based on its mime type
 *
 * @param {string | undefined | null} content_type The `content-type` header of a request/response.
 * @returns {boolean}
 */
function is_text(content_type) {
	if (!content_type) return true; // defaults to json
	const type = content_type.split(';')[0].toLowerCase(); // get the mime type

	return type.startsWith('text/') || type.endsWith('+xml') || text_types.has(type);
}
