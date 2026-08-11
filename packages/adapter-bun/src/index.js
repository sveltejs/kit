/** @import { Serve } from 'bun' */
import fs from 'node:fs';
import process from 'node:process';
import server_options from 'SERVER_OPTIONS';
import { routes } from 'ROUTES';
import { handler } from './handler.js';
import { boolean_env, bytes_env, env, number_env } from './env.js';

const options = /** @type {Serve.Options<undefined>} */ ({ ...server_options });

const unix = env('SOCKET_PATH', options.unix);

if (unix) {
	options.unix = unix;
	delete options.hostname;
	delete options.port;
	delete options.reusePort;
	delete options.ipv6Only;

	// an unclean shutdown leaves the socket file behind and the next listen would
	// fail with EADDRINUSE; the zero-size check (same heuristic as adapter-node)
	// avoids deleting a regular file that happens to sit at this path
	try {
		if (fs.statSync(unix).size === 0) fs.rmSync(unix);
	} catch {
		// ignore
	}
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

const shutdown_timeout = number_env('SHUTDOWN_TIMEOUT', 30) ?? 30;

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

	// stop() waits forever on idle connections such as open event streams, and once it
	// is pending its promise never settles even after a force-close, so race it instead
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let deadline;
	const drained = await Promise.race([
		server.stop().then(() => true),
		new Promise((resolve) => {
			deadline = setTimeout(() => resolve(false), shutdown_timeout * 1000);
		})
	]);
	clearTimeout(deadline);

	if (!drained) {
		// give the force-close a moment to abort in-flight handlers, so shutdown
		// listeners do not tear down resources those handlers still hold; the stop
		// promise may never settle, so the timer bounds the wait
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let grace;
		await Promise.race([
			server.stop(true),
			new Promise((resolve) => {
				grace = setTimeout(resolve, 1000);
			})
		]);
		clearTimeout(grace);
	}

	// @ts-expect-error custom events cannot be typed
	process.emit('sveltekit:shutdown', reason);
}

process.on('SIGTERM', () => graceful_shutdown('SIGTERM'));
process.on('SIGINT', () => graceful_shutdown('SIGINT'));
