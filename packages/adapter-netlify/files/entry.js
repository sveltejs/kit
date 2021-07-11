// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js'; // eslint-disable-line import/no-unresolved

init();

export async function handler(event) {
	const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;

	const query = new URLSearchParams(rawQuery);

	const type = headers['content-type'];
	const rawBody =
		type.startsWith('image') ||
		type.startsWith('audio') ||
		type.startsWith('video') ||
		type.includes('application/octet-stream')
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
