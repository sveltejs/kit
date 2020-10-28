'use strict';

const { render } = require('@sveltejs/app-utils/renderer');
const client = require('@architect/shared/client.json');
const manifest = require('@architect/shared/manifest.js');
const App = require('@architect/shared/root.js');
const template = require('@architect/shared/template.js');
const static_assets = require('@architect/shared/static_assets.js');

exports.handler = async function http(req) {
	const {
		rawPath: path,
		requestContext,
		headers,
		queryStringParameters: query
	} = req;

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
			query
		},
		{
			static_dir: '_static',
			template,
			manifest,
			client,
			root: App,
			load: (route) => require(`@architect/shared/routes/${route.name}.js`),
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
		body: 'Not Found'
	};
};
