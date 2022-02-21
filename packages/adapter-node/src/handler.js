import './shims';
import fs from 'fs';
import path from 'path';
import sirv from 'sirv';
import { fileURLToPath } from 'url';
import { getRequest, setResponse } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';

/* global ORIGIN, PROTOCOL_HEADER, HOST_HEADER */

const server = new Server(manifest);
const origin = ORIGIN;
const protocol_header = PROTOCOL_HEADER && process.env[PROTOCOL_HEADER];
const host_header = (HOST_HEADER && process.env[HOST_HEADER]) || 'host';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 * @param {number} max_age
 * @param {boolean} immutable
 */
function serve(path, max_age, immutable = false) {
	return (
		fs.existsSync(path) &&
		sirv(path, {
			etag: true,
			maxAge: max_age,
			immutable,
			gzip: true,
			brotli: true
		})
	);
}

/** @type {import('polka').Middleware} */
const ssr = async (req, res) => {
	let request;

	try {
		request = await getRequest(origin || get_origin(req.headers), req);
	} catch (err) {
		res.statusCode = err.status || 400;
		return res.end(err.reason || 'Invalid request body');
	}

	setResponse(res, await server.respond(request));
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

/**
 * @param {import('http').IncomingHttpHeaders} headers
 * @returns
 */
function get_origin(headers) {
	const protocol = (protocol_header && headers[protocol_header]) || 'https';
	const host = headers[host_header];
	return `${protocol}://${host}`;
}

export const handler = sequence(
	[
		serve(path.join(__dirname, '/client'), 31536000, true),
		serve(path.join(__dirname, '/static'), 0),
		serve(path.join(__dirname, '/prerendered'), 0),
		ssr
	].filter(Boolean)
);
