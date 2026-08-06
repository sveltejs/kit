import process from 'node:process';
import server_options from 'SERVER_OPTIONS';
import { handler } from './handler.js';
import { boolean_env, env, number_env } from './env.js';
import { routes } from './static.js';
import { get_tls_options } from './tls.js';
import { parse_as_bytes } from './utils.js';

const options = { ...server_options };
delete options.fetch;

export const unix = env('SOCKET_PATH', /** @type {string | undefined} */ (options.unix));
export const hostname = env(
	'HOST',
	/** @type {string | undefined} */ (options.hostname) ?? '0.0.0.0'
);
export const port = env('PORT', options.port === undefined ? '3000' : String(options.port));

if (unix) {
	options.unix = unix;
	delete options.hostname;
	delete options.port;
	delete options.reusePort;
	delete options.ipv6Only;
} else {
	delete options.unix;
	options.hostname = hostname;
	options.port = port;
	options.reusePort = boolean_env(
		'REUSE_PORT',
		/** @type {boolean | undefined} */ (options.reusePort)
	);
	options.ipv6Only = boolean_env(
		'IPV6_ONLY',
		/** @type {boolean | undefined} */ (options.ipv6Only)
	);
}

options.idleTimeout = number_env(
	'IDLE_TIMEOUT',
	/** @type {number | undefined} */ (options.idleTimeout),
	{ max: 255 }
);
const development = boolean_env('DEVELOPMENT');
if (development !== undefined) {
	options.development = development;
} else if (options.development === undefined) {
	options.development = false;
}

const body_size_limit = parse_as_bytes(
	env('BODY_SIZE_LIMIT', String(options.maxRequestBodySize ?? '512K')) || ''
);
if (!Number.isSafeInteger(body_size_limit) || body_size_limit < 0) {
	throw new Error(
		`Invalid BODY_SIZE_LIMIT: ${JSON.stringify(env('BODY_SIZE_LIMIT'))}. Please provide a non-negative integer with an optional K, M, or G suffix.`
	);
}
options.maxRequestBodySize = body_size_limit;

const http3 = boolean_env('HTTP3', /** @type {boolean | undefined} */ (options.http3));
const http1 = boolean_env('HTTP1', /** @type {boolean | undefined} */ (options.http1));
if (http3 !== undefined) options.http3 = http3;
if (http1 !== undefined) options.http1 = http1;

const tls = get_tls_options(options.tls);
if (tls) options.tls = tls;

if (options.http3 && !options.tls) {
	throw new Error('HTTP3 requires TLS_CERT and TLS_KEY or TLS server options');
}
if (options.http1 === false && !options.http3) {
	throw new Error('HTTP1=false requires HTTP3=true');
}
if (unix && options.http3) {
	throw new Error('HTTP3 cannot be used with SOCKET_PATH');
}

options.fetch = handler;
options.routes = routes;

export const server = Bun.serve(
	/** @type {import('bun').Serve.Options<undefined>} */ (/** @type {unknown} */ (options))
);

console.log(unix ? `Listening on ${unix}` : `Listening on ${server.url}`);

const shutdown_timeout = number_env('SHUTDOWN_TIMEOUT', 30) ?? 30;
let shutting_down = false;

/** @param {'SIGINT' | 'SIGTERM'} reason */
async function graceful_shutdown(reason) {
	if (shutting_down) return;
	shutting_down = true;

	let forced = false;
	const timeout = setTimeout(() => {
		forced = true;
		void server.stop(true);
	}, shutdown_timeout * 1000);

	await server.stop(false);
	clearTimeout(timeout);
	// @ts-expect-error custom events cannot be typed
	process.emit('sveltekit:shutdown', reason);

	if (forced) console.warn(`Forced shutdown after ${shutdown_timeout} seconds`);
}

process.on('SIGTERM', () => void graceful_shutdown('SIGTERM'));
process.on('SIGINT', () => void graceful_shutdown('SIGINT'));
