import 'SHIMS';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sirv from 'sirv';
import { fileURLToPath } from 'node:url';
import { parse as polka_url_parser } from '@polka/url';
import { getRequest, setResponse, createReadableStream } from '@sveltejs/kit/node';
import { Server } from 'SERVER';
import { manifest, prerendered, base } from 'MANIFEST';
import { env } from 'ENV';
import { parse_as_bytes } from '../utils.js';

/* global ENV_PREFIX */

const server = new Server(manifest);

const origin = env('ORIGIN', undefined);
const xff_depth = parseInt(env('XFF_DEPTH', '1'));
const address_header = env('ADDRESS_HEADER', '').toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '').toLowerCase();
const host_header = env('HOST_HEADER', '').toLowerCase();
const port_header = env('PORT_HEADER', '').toLowerCase();

const body_size_limit = parse_as_bytes(env('BODY_SIZE_LIMIT', '512K'));

if (isNaN(body_size_limit)) {
	throw new Error(
		`Invalid BODY_SIZE_LIMIT: '${env('BODY_SIZE_LIMIT')}'. Please provide a numeric value.`
	);
}

const dir = path.dirname(fileURLToPath(import.meta.url));

const asset_dir = `${dir}/client${base}`;

await server.init({
	env: /** @type {Record<string, string>} */ (process.env),
	read: (file) => createReadableStream(`${asset_dir}/${file}`)
});

/**
 * @param {string} path
 * @param {boolean} client
 */
function serve(path, client = false) {
	return fs.existsSync(path)
		? sirv(path, {
				etag: true,
				gzip: true,
				brotli: true,
				setHeaders: client
					? (res, pathname) => {
							// only apply to build directory, not e.g. version.json
							if (
								pathname.startsWith(`/${manifest.appPath}/immutable/`) &&
								res.statusCode === 200
							) {
								res.setHeader('cache-control', 'public,max-age=31536000,immutable');
							}
						}
					: undefined
			})
		: undefined;
}

// required because the static file server ignores trailing slashes
/** @returns {import('polka').Middleware} */
function serve_prerendered() {
	const handler = serve(path.join(dir, 'prerendered'));

	return (req, res, next) => {
		let { pathname, search, query } = polka_url_parser(req);

		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// ignore invalid URI
		}

		if (prerendered.has(pathname)) {
			return handler?.(req, res, next);
		}

		// remove or add trailing slash as appropriate
		let location = pathname.at(-1) === '/' ? pathname.slice(0, -1) : pathname + '/';
		if (prerendered.has(location)) {
			if (query) location += search;
			res.writeHead(308, { location }).end();
		} else {
			void next();
		}
	};
}

/** @type {import('polka').Middleware} */
const ssr = async (req, res) => {
	/** @type {Request} */
	let request;

	try {
		request = await getRequest({
			base: origin || get_origin(req.headers),
			request: req,
			bodySizeLimit: body_size_limit
		});
	} catch {
		res.statusCode = 400;
		res.end('Bad Request');
		return;
	}

	await setResponse(
		res,
		await server.respond(request, {
			platform: { req },
			getClientAddress: () => {
				if (address_header) {
					if (!(address_header in req.headers)) {
						throw new Error(
							`Address header was specified with ${
								ENV_PREFIX + 'ADDRESS_HEADER'
							}=${address_header} but is absent from request`
						);
					}

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
		/**
		 * @param {number} i
		 * @returns {ReturnType<import('polka').Middleware>}
		 */
		function handle(i) {
			if (i < handlers.length) {
				return handlers[i](req, res, () => handle(i + 1));
			} else {
				return next();
			}
		}

		return handle(0);
	};
}

/**
 * @param {import('http').IncomingHttpHeaders} headers
 * @returns
 */
function get_origin(headers) {
	const protocol = (protocol_header && headers[protocol_header]) || 'https';
	const host = (host_header && headers[host_header]) || headers['host'];
	const port = port_header && headers[port_header];

	return port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
}

export const handler = sequence(
	/** @type {(import('sirv').RequestHandler | import('polka').Middleware)[]} */
	([serve(path.join(dir, 'client'), true), serve_prerendered(), ssr].filter(Boolean))
);
