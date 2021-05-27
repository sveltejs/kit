'use strict';

import url from 'url';
import app from '@architect/shared/app.js'; // eslint-disable-line import/no-unresolved

async function handler(event) {
	const { host, rawPath: path, httpMethod, rawQueryString, headers, body } = event;

	const query = new url.URLSearchParams(rawQueryString);

	const rendered = await app.render({
		host,
		method: httpMethod,
		headers,
		path,
		body,
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
		body: 'Not Found'
	};
}

export { handler };
