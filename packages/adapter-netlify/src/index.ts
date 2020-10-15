import { render } from '@sveltejs/app-utils';

const manifest = require('./manifest.js');
const client = require('./client.json');
const App = require('./app.js');
const template = require('./template.js');

export async function handler(event) {
	const { path, httpMethod, headers, queryStringParameters, body, isBase64Encoded } = event; // TODO pass this to renderer

	const rendered = await render({
		static_dir: 'static',
		template,
		manifest,
		client,
		host: null, // TODO
		url: path,
		App,
		load: route => require(`./routes/${route.name}.js`),
		dev: false
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