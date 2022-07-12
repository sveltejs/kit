import './shims';
import fs from 'fs';
import path from 'path';
import sirv from 'sirv';
import { fileURLToPath } from 'url';
import { getRequest, setResponse } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { env } from './env.js';

/* global ENV_PREFIX */

const server = new Server(manifest);
const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));

const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', 'host').toLowerCase();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} path
 * @param {boolean} client
 */
function serve(path, client = false) {
	return (
		fs.existsSync(path) &&
		sirv(path, {
			etag: true,
			gzip: true,
			brotli: true,
			setHeaders:
				client &&
				((res, pathname) => {
					// only apply to build directory, not e.g. version.json
					if (pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
						res.setHeader('cache-control', 'public,max-age=31536000,immutable');
					}
				})
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
		res.end(err.reason || 'Invalid request body');
		return;
	}

	if (address_header && !(address_header in req.headers)) {
		throw new Error(
			`Address header was specified with ${
				ENV_PREFIX + 'ADDRESS_HEADER'
			}=${address_header} but is absent from request`
		);
	}

	setResponse(
		res,
		await server.respond(request, {
			getClientAddress: () => {
				if (address_header) {
					const value = /** @type {string} */ (req.headers[address_header]) || '';

					if (address_header === 'x-forwarded-for') {
						const addresses = value.split(',');

						if (xff_depth < 1) {
							throw new Error(`${ENV_PREFIX + 'XFF_DEPTH'} must be a positive integer`);
						}

						if (xff_depth > addresses.length) {
							throw new Error(
								`${ENV_PREFIX + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
									addresses.length
								} addresses`
							);
						}
						return addresses[addresses.length - xff_depth].trim();
					}

					return value;
				}

				return (
					req.connection?.remoteAddress ||
					// @ts-expect-error
					req.connection?.socket?.remoteAddress ||
					req.socket?.remoteAddress ||
					// @ts-expect-error
					req.info?.remoteAddress
				);
			}
		})
	);
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
		serve(path.join(__dirname, '/client'), true),
		serve(path.join(__dirname, '/static')),
		serve(path.join(__dirname, '/prerendered')),
		ssr
	].filter(Boolean)
);
