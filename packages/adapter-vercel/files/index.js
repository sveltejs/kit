'use strict';

const { parse, URLSearchParams } = require('url');
const { get_body } = require('@sveltejs/app-utils/http');
const app = require('./server/app.js');

module.exports = async (req, res) => {
  const { pathname, query = '' } = parse(req.url || '');
  
	const rendered = await app.render({
		host: null, // TODO
		method: req.method,
		headers: req.headers,
		path: pathname,
    query: new URLSearchParams(query),
    body: await get_body(req)
	});

	if (rendered) {
    const { status, headers, body } = rendered;
    return res.writeHead(status, headers).end(body);
	}

	return res.writeHead(404).end();
};
