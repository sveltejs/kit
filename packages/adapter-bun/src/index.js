import process from 'node:process';
import server_options from 'SERVER_OPTIONS';
import { routes } from 'ROUTES';
import { handler } from './handler.js';
import { boolean_env, bytes_env, env, number_env } from './env.js';

const options = /** @type {import('bun').Serve.Options<undefined>} */ ({ ...server_options });

const unix = env('SOCKET_PATH', options.unix);

if (unix) {
	options.unix = unix;
	delete options.hostname;
	delete options.port;
	delete options.reusePort;
	delete options.ipv6Only;
} else {
	delete options.unix;
	options.hostname = env('HOST', options.hostname);
	options.port = env('PORT', options.port !== undefined ? String(options.port) : undefined);
	options.reusePort = boolean_env('REUSE_PORT', options.reusePort);
	options.ipv6Only = boolean_env('IPV6_ONLY', options.ipv6Only);
}

options.idleTimeout = number_env('IDLE_TIMEOUT', options.idleTimeout, { max: 255 });
const development = boolean_env('DEVELOPMENT');
if (development !== undefined) {
	options.development = development;
} else if (options.development === undefined) {
	options.development = false;
}

options.maxRequestBodySize = bytes_env('BODY_SIZE_LIMIT', options.maxRequestBodySize ?? 512 * 1024);

options.fetch = handler;
options.routes = routes;

const server = Bun.serve(options);

console.log(unix ? `Listening on ${unix}` : `Listening on ${server.url}`);

let shutting_down = false;

/** @param {'SIGINT' | 'SIGTERM'} reason */
async function graceful_shutdown(reason) {
	if (shutting_down) return process.exit(1);
	shutting_down = true;

	if (server.pendingRequests !== 0) {
		console.log(`Waiting for ${server.pendingRequests} requests to finish before shutting down...`);
		console.log('Press Ctrl+C again to force shutdown.');
	}
	await server.stop();

	// @ts-expect-error custom events cannot be typed
	process.emit('sveltekit:shutdown', reason);
}

process.on('SIGTERM', () => void graceful_shutdown('SIGTERM'));
process.on('SIGINT', () => void graceful_shutdown('SIGINT'));
