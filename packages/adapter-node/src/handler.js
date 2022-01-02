import fs from 'fs';
import path from 'path';
import sirv from 'sirv';
import { fileURLToPath } from 'url';
import { getRawBody } from '@sveltejs/kit/node';
import { __fetch_polyfill } from '@sveltejs/kit/install-fetch';

// @ts-ignore
import { App } from 'APP';
import { manifest } from 'MANIFEST';

__fetch_polyfill();

const app = new App(manifest);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 * @param {number} max_age
 */
function serve(path, max_age) {
	return (
		fs.existsSync(path) &&
		sirv(path, {
			etag: true,
			maxAge: max_age,
			immutable: true,
			gzip: true,
			brotli: true
		})
	);
}

/** @type {import('polka').Middleware} */
const ssr = async (req, res) => {
	let body;

	try {
		body = await getRawBody(req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	const rendered = await app.render({
		url: req.url,
		method: req.method,
		headers: req.headers, // TODO: what about repeated headers, i.e. string[]
		rawBody: body
	});

	if (rendered) {
		res.writeHead(rendered.status, rendered.headers);
		if (rendered.body) {
			res.write(rendered.body);
		}
		res.end();
	} else {
		res.statusCode = 404;
		res.end('Not found');
	}
};

/** @param {import('polka').Middleware[]} handlers */
function sequence(handlers) {
	/** @type {import('polka').Middleware} */
	return (req, res, next) => {
		/** @param {number} i */
		function handle(i) {
			handlers[i](req, res, () => {
				if (i < handlers.length) handle(i + 1);
				else next();
			});
		}

		handle(0);
	};
}

export const handler = sequence(
	[
		serve(path.join(__dirname, '/client'), 31536000),
		serve(path.join(__dirname, '/static'), 31536000),
		serve(path.join(__dirname, '/prerendered'), 0),
		ssr
	].filter(Boolean)
);
