import { randomBytes } from 'crypto';
// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js';

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
		rawBody,
		nonce: /* eslint-disable-line no-undef */ GENERATE_NONCES && randomBytes(16).toString('base64')
	});

	if (!rendered) {
		return {
			statusCode: 404,
			body: 'Not found'
		};
	}

	const partial_response = {
		statusCode: rendered.status,
		...split_headers(rendered.headers)
	};

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
		body: rendered.body
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
function split_headers(headers) {
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
