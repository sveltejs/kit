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
		const rendered = await server.respond(to_request(event), {
			platform: { context },
			getClientAddress() {
				return event.headers['x-nf-client-connection-ip'];
			}
		});

		const partial_response = {
			statusCode: rendered.status,
			...split_headers(rendered.headers)
		};

		// TODO this is probably wrong now?
		if (rendered.body instanceof Uint8Array) {
			// Function responses should be strings (or undefined), and responses with binary
			// content should be base64 encoded and set isBase64Encoded to true.
			// https://github.com/netlify/functions/blob/main/src/function/response.ts
			return {
				...partial_response,
				isBase64Encoded: true,
				body: Buffer.from(rendered.body).toString('base64')
			};
		}

		return {
			...partial_response,
			body: await rendered.text()
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
