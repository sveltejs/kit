import { init, render } from '@sveltejs/kit/app';

init();

export async function handler(event) {
	const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;

	const query = new URLSearchParams(rawQuery);

	const encoding = isBase64Encoded ? 'base64' : headers['content-encoding'] || 'utf-8';
	const rawBody = typeof body === 'string' ? Buffer.from(body, encoding) : body;

	const rendered = await render({
		method: httpMethod,
		headers,
		path,
		query,
		rawBody
	});

	if (rendered) {
		return {
			isBase64Encoded: false,
			statusCode: rendered.status,
			...splitHeaders(rendered.headers),
			body: rendered.body
		};
	}

	return {
		statusCode: 404,
		body: 'Not found'
	};
}

/**
 * Splits headers into two categories: single value and multi value
 * @param {Record<string, string | string[]>} headers
 * @returns {{
 * headers: Record<string, string>,
 * multiValueHeaders: Record<string, string[]>
 * }}
 */
function splitHeaders(headers) {
	const h = {};
	const m = {};
	for (const key in headers) {
		const value = headers[key];
		const target = Array.isArray(value) ? m : h;
		target[key] = value;
	}
	return {
		headers: h,
		multiValueHeaders: m
	};
}
