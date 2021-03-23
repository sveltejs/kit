'use strict';

import { URLSearchParams } from 'url';
import { render } from './app.mjs'; // eslint-disable-line import/no-unresolved

export async function handler(event) {
	const {
		path,
		httpMethod,
		headers,
		queryStringParameters
		// body, // TODO pass this to renderer
		// isBase64Encoded // TODO is this useful?
	} = event;

	const query = new URLSearchParams();
	for (const k in queryStringParameters) {
		const value = queryStringParameters[k];
		value.split(', ').forEach((v) => {
			query.append(k, v);
		});
	}

	const rendered = await render({
		method: httpMethod,
		headers,
		path,
		query
	});

	if (rendered) {
		return {
			isBase64Encoded: false,
			statusCode: rendered.status,
			headers: rendered.headers,
			body: rendered.body
		};
	}

	return {
		statusCode: 404,
		body: 'Not found'
	};
}
