import { URLSearchParams } from 'url';
import { render } from '@sveltejs/app-utils';

const manifest = require('./manifest.js');
const client = require('./client.json');
const App = require('./app.js');
const template = require('./template.js');

// TODO this is a generic AWS lambda handler, and could be
// reused by other adapters

export async function handler(event) {
	const {
		path,
		httpMethod,
		headers,
		queryStringParameters,
		body, // TODO pass this to renderer
		isBase64Encoded // TODO is this useful?
	} = event;

	const query = new URLSearchParams();
	for (const k in queryStringParameters) {
		const value = queryStringParameters[k];
		value.split(', ').forEach(v => {
			query.append(k, v);
		});
	}

	const rendered = await render({
		host: null, // TODO
		method: httpMethod,
		headers,
		path,
		query
	}, {
		static_dir: 'static',
		template,
		manifest,
		client,
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