// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved
import { isContentTypeTextual } from '@sveltejs/kit/adapter-utils'; // eslint-disable-line import/no-unresolved

init();

export async function handler(event) {
	const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;

	const query = new URLSearchParams(rawQuery);

	const type = headers['content-type'];
	const rawBody =
		type && isContentTypeTextual(type)
			? isBase64Encoded
				? Buffer.from(body, 'base64').toString()
				: body
			: new TextEncoder('base64').encode(body);

	const rendered = await render({
		method: httpMethod,
		headers,
		path,
		query,
		rawBody
	});

	if (rendered) {
		const multiValueHeaders = getMultivalueHeaders(rendered.headers, 'set-cookie');

		return {
			isBase64Encoded: false,
			statusCode: rendered.status,
			headers: rendered.headers,
			multiValueHeaders,
			body: rendered.body
		};
	}

	return {
		statusCode: 404,
		body: 'Not found'
	};
}

/**
 * Separates headers that hold arrays from the others, and removes them from the original headers
 *
 * @param {Record<string, string | string[]>} headers
 * @param  {...string} fields
 * @returns {Record<string, string[]>}
 */
function getMultivalueHeaders(headers, ...fields) {
	const res = {};
	for (const field of fields) {
		if (Array.isArray(headers[field])) {
			res[field] = headers[field];
			delete headers[field];
		}
	}
	return res;
}
