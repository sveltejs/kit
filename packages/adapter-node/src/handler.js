/** @import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'node:http' */
import process from 'node:process';
import { getRequest, setResponse, createReadableStream } from '@sveltejs/kit/node';
import { server } from 'SERVER';
import { dir } from './dir.js';
import { env, env_prefix } from './env.js';
import { parse_as_bytes } from './utils.js';
import { serve_static } from './static.js';

/** @typedef {(req: IncomingMessage, res: ServerResponse, next: () => void | Promise<void>) => void | Promise<void>} Middleware */

const origin = ORIGIN;
const mime_types = MIME_TYPES;
const assets = ASSETS;
const prerendered_assets = PRERENDERED_ASSETS;

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

const asset_dir = `${dir}/client${BASE_PATH}`;

await server.init({
	env: process.env,
	read: (file) => createReadableStream(`${asset_dir}/${file}`)
});

/** @type {Middleware} */
const ssr = async (req, res) => {
	/** @type {Request} */
	let request;
	let request_origin = origin;

	if (!request_origin) {
		try {
			request_origin = get_origin(req.headers);
		} catch (error) {
			console.error(
				`Could not determine request origin: ${error instanceof Error ? error.message : String(error)}`
			);
			res.statusCode = 400;
			res.end('Bad Request');
			return;
		}
	}

	try {
		request = getRequest({
			base: request_origin,
			request: req,
			response: res,
			bodySizeLimit: body_size_limit
		});
	} catch {
		res.statusCode = 400;
		res.end('Bad Request');
		return;
	}

	const response = await server.respond(request, {
		platform: { req },
		getClientAddress: () => {
			if (address_header) {
				if (!(address_header in req.headers)) {
					throw new Error(
						`Address header was specified with ${
							env_prefix + 'ADDRESS_HEADER'
						}=${address_header} but is absent from request`
					);
				}

				const value = /** @type {string} */ (req.headers[address_header]) || '';

				if (address_header === 'x-forwarded-for') {
					const addresses = value.split(',');

					if (xff_depth < 1) {
						throw new Error(`${env_prefix + 'XFF_DEPTH'} must be a positive integer`);
					}

					if (xff_depth > addresses.length) {
						throw new Error(
							`${env_prefix + 'XFF_DEPTH'} is ${xff_depth}, but only found ${
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
	});

	// Reverse proxies such as nginx buffer responses by default (ignoring
	// `cache-control`), which breaks streaming responses like server-sent events.
	// `X-Accel-Buffering: no` opts out of that buffering and is a no-op on proxies
	// that don't recognise it. See https://github.com/sveltejs/kit/issues/15790
	if (response.headers.get('content-type') === 'text/event-stream') {
		response.headers.set('x-accel-buffering', 'no');
	}

	setResponse(res, response);
};

/** @param {Middleware[]} handlers */
function sequence(handlers) {
	/** @type {Middleware} */
	return (req, res, next) => {
		/**
		 * @param {number} i
		 * @returns {ReturnType<Middleware>}
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
 * @param {string} name
 * @param {string | string[] | undefined} value
 * @returns {string | undefined}
 */
function normalise_header(name, value) {
	if (!name) return undefined;
	if (Array.isArray(value)) {
		if (value.length === 0) return undefined;
		if (value.length === 1) return value[0];
		throw new Error(
			`Multiple values provided for ${name} header where only one expected: ${value}`
		);
	}
	return value;
}

/**
 * @param {IncomingHttpHeaders} headers
 * @returns {string}
 */
function get_origin(headers) {
	const protocol = decodeURIComponent(
		normalise_header(protocol_header, headers[protocol_header]) || 'https'
	);

	// this helps us avoid host injections through the protocol header
	if (protocol.includes(':')) {
		throw new Error(
			`The ${protocol_header} header specified ${protocol} which is an invalid because it includes \`:\`. It should only contain the protocol scheme (e.g. \`https\`)`
		);
	}

	const host =
		normalise_header(host_header, headers[host_header]) ||
		normalise_header('host', headers['host']);
	if (!host) {
		const header_names = host_header ? `${host_header} or host headers` : 'host header';
		throw new Error(
			`Could not determine host. The request must have a value provided by the ${header_names}`
		);
	}

	const port = normalise_header(port_header, headers[port_header]);
	if (port && isNaN(+port)) {
		throw new Error(
			`The ${port_header} header specified ${port} which is an invalid port because it is not a number. The value should only contain the port number (e.g. 443)`
		);
	}

	return port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
}

export const handler = sequence([
	serve_static(asset_dir, assets, {
		mime_types,
		immutable_prefix: `/${APP_PATH}/immutable/`
	}),
	serve_static(`${dir}/prerendered${BASE_PATH}`, prerendered_assets, {
		mime_types,
		redirect_trailing_slash: true
	}),
	ssr
]);
