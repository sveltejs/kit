'use strict';

<<<<<<< HEAD
const { render } = require('@sveltejs/app-utils/renderer');
const client = require('@architect/shared/client.json');
const manifest = require('@architect/shared/manifest.js');
const App = require('@architect/shared/root.js');
const template = require('@architect/shared/template.js');
const static_assets = require('@architect/shared/static_assets.js');
const setup = require('@architect/shared/setup.js');

exports.handler = async function http(req) {
	const { rawPath: path, requestContext, headers, queryStringParameters: query } = req;

	const { method, domainName } = requestContext.http;

	// TODO: We should handle static assets better than this
	if (static_assets.includes(path)) {
		return {
			statusCode: 308,
			headers: { location: `/_static${path}` }
		};
	}

	const rendered = await render(
		{
			host: domainName,
			method,
			headers,
			path,
			// body, TODO: convert this file to typescript and utilize the body once we know what type it is and whether it first needs some conversion
			query
		},
		{
			template,
			manifest,
			client,
			root: App,
			setup,
			load: (route) => require(`@architect/shared/routes/${route.name}.js`),
			dev: false
		}
	);
=======
const url = require('url');
const app = require('@architect/shared/app.js');

exports.handler = async (event) => {

	const {
		rawPath: path,
		httpMethod,
		headers,
		queryStringParameters
		// body, // TODO pass this to renderer
		// isBase64Encoded // TODO is this useful?
	} = event;

	const query = new url.URLSearchParams();
	for (const k in queryStringParameters) {
		const value = queryStringParameters[k];
		value.split(', ').forEach((v) => {
			query.append(k, v);
		});
	}

	const rendered = await app.render({
		host: null, // TODO
		method: httpMethod,
		headers,
		path,
		query
	});
>>>>>>> build the lambda

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
<<<<<<< HEAD
		body: 'Not Found'
=======
		body: 'Not found'
>>>>>>> build the lambda
	};
};
