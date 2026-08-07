import { Server } from 'SERVER';
import { manifest } from 'MANIFEST';
import { files } from 'ROUTES';
import { env, env_prefix, number_env } from './env.js';

const server = new Server(manifest);
const origin = ORIGIN;

const address_header = env('ADDRESS_HEADER', '')?.toLowerCase();
const protocol_header = env('PROTOCOL_HEADER', '')?.toLowerCase();
const host_header = env('HOST_HEADER', '')?.toLowerCase();
const port_header = env('PORT_HEADER', '')?.toLowerCase();
const xff_depth = number_env('XFF_DEPTH', 1, { min: 1 }) ?? 1;

await server.init({
	env: Bun.env,
	read: (file) => {
		const asset = files.get(`client/${file}`);
		if (!asset) throw new Error(`Could not find server asset ${file}`);
		return asset.stream();
	}
});

/**
 * The Bun-native SvelteKit request handler. Import it from `build/handler.js`
 * when an application needs to construct `Bun.serve` itself.
 * @param {Request} request
 * @param {import('bun').Server<undefined>} bun_server
 * @returns {Promise<Response>}
 */
export async function handler(request, bun_server) {
	const url = new URL(request.url);

	let request_origin = origin;
	try {
		request_origin ||= get_origin(request, url);
	} catch (error) {
		console.error(
			`Could not determine request origin: ${error instanceof Error ? error.message : String(error)}`
		);
		return new Response('Bad Request', { status: 400 });
	}

	let normalized_request = request;
	if (request_origin !== url.origin) {
		const normalized_url = new URL(url.pathname + url.search, request_origin);
		normalized_request = new Request(normalized_url, request);
	}

	const response = await server.respond(normalized_request, {
		platform: {
			request,
			server: bun_server
		},
		getClientAddress: () => get_client_address(request, bun_server)
	});

	if (response.headers.get('content-type')?.startsWith('text/event-stream')) {
		bun_server.timeout(request, 0);
		response.headers.set('x-accel-buffering', 'no');
	}

	return response;
}

/**
 * @param {Request} request
 * @param {URL} url
 * @returns {string}
 */
function get_origin(request, url) {
	const protocol = decodeURIComponent(
		(protocol_header ? request.headers.get(protocol_header) : null) ?? url.protocol.slice(0, -1)
	);
	if (protocol.includes(':')) {
		throw new Error(
			`The ${protocol_header} header specified ${protocol} which is an invalid because it includes \`:\`. It should only contain the protocol scheme (e.g. \`https\`)`
		);
	}

	const host =
		(host_header ? request.headers.get(host_header) : null) ??
		request.headers.get('host') ??
		url.host;
	if (!host) {
		const header_names = host_header ? `${host_header} or host headers` : 'host header';
		throw new Error(
			`Could not determine host. The request must have a value provided by the ${header_names}`
		);
	}

	const port = port_header ? request.headers.get(port_header) : null;
	if (port && isNaN(+port)) {
		throw new Error(
			`The ${port_header} header specified ${port} which is an invalid port because it is not a number. The value should only contain the port number (e.g. 443)`
		);
	}

	const value = port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
	return new URL(value).origin;
}

/**
 * @param {Request} request
 * @param {import('bun').Server<undefined>} bun_server
 * @returns {string}
 */
function get_client_address(request, bun_server) {
	if (address_header) {
		const value = request.headers.get(address_header);
		if (value === null) {
			throw new Error(
				`Address header was specified with ${env_prefix}ADDRESS_HEADER=${address_header} but is absent from request`
			);
		}

		if (address_header === 'x-forwarded-for') {
			const addresses = value.split(',');

			if (xff_depth < 1) {
				throw new Error(`${env_prefix}XFF_DEPTH must be a positive integer`);
			}

			if (xff_depth > addresses.length) {
				throw new Error(
					`${env_prefix}XFF_DEPTH is ${xff_depth}, but only found ${addresses.length} addresses`
				);
			}
			return addresses[addresses.length - xff_depth].trim();
		}

		return value;
	}

	const address = bun_server.requestIP(request)?.address;
	if (!address) throw new Error('Could not determine client address');
	return address;
}
