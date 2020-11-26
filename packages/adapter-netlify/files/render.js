'use strict';

const url = require('url');
const app = require('./app.js');

exports.handler = async (event) => {
	const {
		path,
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