const { URLSearchParams } = require('url');
const { render } = require('@sveltejs/app-utils');
const client = require('./server/client.json');
const manifest = require('./server/manifest.js');
const App = require('./server/root.js');
const template = require('./server/template.js');

// TODO: This is the same as netlify's render function, and basically just builds an AWS lambda.
// We should extract it into some sort of lambda rendering package
exports.handler = async function(event) {
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

	const rendered = await render(
		{
			host: null, // TODO
			method: httpMethod,
			headers,
			path,
			query
		},
		{
			static_dir: 'static',
			template,
			manifest,
			client,
			root: App,
			load: route => require(`./server/routes/${route.name}.js`),
			dev: false
		}
	);

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
};
