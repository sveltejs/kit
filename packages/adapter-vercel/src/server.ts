import { URLSearchParams } from 'url';
import { render } from '@sveltejs/app-utils/renderer';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import type { PageComponentManifest, EndpointManifest, Method } from '@sveltejs/app-utils';

const client = require('./server/client.json');
const manifest = require('./server/manifest.js');
const root = require('./server/root.js');
const setup = require('./server/setup.js');
const template = require('./server/template.js');

// TODO: This is the same as netlify's render function, and basically just builds an AWS lambda.
// We should extract it into some sort of lambda rendering package
export const handler: APIGatewayProxyHandler = async (event) => {
	const {
		path,
		httpMethod,
		headers,
		queryStringParameters,
		body
		// isBase64Encoded // TODO is this useful?
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
			method: httpMethod as Method,
			headers,
			path,
			body,
			query
		},
		{
			static_dir: 'static',
			template,
			manifest,
			client,
			root,
			setup,
			load: (route: PageComponentManifest | EndpointManifest) => require(`./server/routes/${route.name}.js`),
			dev: false,
			only_prerender: false
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
