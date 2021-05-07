import '@sveltejs/kit/install-fetch'; // eslint-disable-line import/no-unresolved

// TODO hardcoding the relative location makes this brittle
import { render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved

export async function handler(event) {
	const { path, httpMethod, headers, queryStringParameters, body, isBase64Encoded } = event;

	const query = new URLSearchParams();
	for (const k in queryStringParameters) {
		const value = queryStringParameters[k];
		value.split(', ').forEach((v) => {
			query.append(k, v);
		});
	}

	const rawBody =
		headers['content-type'] === 'application/octet-stream'
			? new TextEncoder('base64').encode(body)
			: isBase64Encoded
			? Buffer.from(body, 'base64').toString()
			: body;

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
			headers: rendered.headers,
			body: rendered.body
		};
	}

	return {
		statusCode: 404,
		body: 'Not found'
	};
}
