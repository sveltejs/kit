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

const serve_client = sirv(path.join(__dirname, '/client'), {
	etag: true,
	maxAge: 31536000,
	immutable: true,
	gzip: true,
	brotli: true
});

const serve_static = sirv(path.join(__dirname, '/static'), {
	etag: true,
	maxAge: 31536000,
	immutable: true,
	gzip: true,
	brotli: true
});

const serve_prerendered = sirv(path.join(__dirname, '/prerendered'), {
	etag: true,
	maxAge: 0,
	gzip: true,
	brotli: true
});

/** @type {import('polka').Middleware} */
const ssr = async (req, res) => {
	let parsed;
	try {
		parsed = new URL(req.url || '', 'http://localhost');
	} catch (e) {
		res.statusCode = 400;
		return res.end('Invalid URL');
	}

	let body;

	try {
		body = await getRawBody(req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	const rendered = await app.render({
		method: req.method,
		headers: req.headers, // TODO: what about repeated headers, i.e. string[]
		path: parsed.pathname,
		query: parsed.searchParams,
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

export const handler = sequence([serve_client, serve_static, serve_prerendered, ssr]);
