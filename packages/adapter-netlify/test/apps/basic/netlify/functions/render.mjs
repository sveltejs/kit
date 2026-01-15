// This is a temporary workaround to be compatible with Netlify's new dev server
// TODO: remove this once we overhaul the Netlify adapter to use Netlify's new serverless function format

import { handler } from '../../.netlify/functions-internal/sveltekit-render.mjs';

/**
 * @param {Request} request
 * @param {import('@netlify/functions').HandlerContext} context
 */
export default async function (request, context) {
	const [rawUrl, rawQuery] = request.url.split('?');
	/** @type {import('@netlify/functions').HandlerEvent} */
	const event = {
		rawUrl,
		rawQuery: rawQuery || '',
		headers: Object.fromEntries(request.headers),
		httpMethod: request.method,
		isBase64Encoded: false,
		path: new URL(request.url).pathname,
		queryStringParameters: Object.fromEntries(new URL(request.url).searchParams),
		body: request.body && (await request.text()),
		multiValueHeaders: {},
		multiValueQueryStringParameters: null
	};
	const result = await handler(event, context);
	if (result) {
		return new Response(result.body, {
			status: result.statusCode,
			// @ts-ignore
			headers: result.headers
		});
	}

	return new Response('Not Found', { status: 404 });
}

export const config = {
	path: '/*'
};
