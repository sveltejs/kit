'use strict';

const app = require('./app.js');

module.exports = async (req, res) => {
	const {
		path,
		method,
		headers,
		query
		// body, // TODO pass this to renderer
		// isBase64Encoded // TODO is this useful?
	} = req;

	const rendered = await app.render({
		host: null, // TODO
		method,
		headers,
		path,
		query
	});

	if (rendered) {
    res.headers(rendered.headers);
    res.status(rendered.status);
    return res.send(rendered.body);
	}

	return res.status(404);
};
