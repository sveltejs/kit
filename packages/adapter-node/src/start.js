import process from 'node:process';
import { handler } from 'HANDLER';
import { env } from 'ENV';
import polka from 'polka';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');

const shutdown_timeout = parseInt(env('SHUTDOWN_TIMEOUT', '30'));
const idle_timeout = parseInt(env('IDLE_TIMEOUT', '0'));
const listen_pid = parseInt(env('LISTEN_PID', '0'));
const listen_fds = parseInt(env('LISTEN_FDS', '0'));
// https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html
const SD_LISTEN_FDS_START = 3;

if (listen_pid !== 0 && listen_pid !== process.pid) {
	throw new Error(`received LISTEN_PID ${listen_pid} but current process id is ${process.pid}`);
}
if (listen_fds > 1) {
	throw new Error(
		`only one socket is allowed for socket activation, but LISTEN_FDS was set to ${listen_fds}`
	);
}

const socket_activation = listen_pid === process.pid && listen_fds === 1;

let requests = 0;
/** @type {NodeJS.Timeout | void} */
let shutdown_timeout_id;
/** @type {NodeJS.Timeout | void} */
let idle_timeout_id;

const server = polka().use(handler);

if (socket_activation) {
	server.listen({ fd: SD_LISTEN_FDS_START }, () => {
		console.log(`Listening on file descriptor ${SD_LISTEN_FDS_START}`);
	});
} else {
	server.listen({ path, host, port }, () => {
		console.log(`Listening on ${path || `http://${host}:${port}`}`);
	});
}

/** @param {'SIGINT' | 'SIGTERM' | 'IDLE'} reason */
function graceful_shutdown(reason) {
	if (shutdown_timeout_id) return;

	// If a connection was opened with a keep-alive header close() will wait for the connection to
	// time out rather than close it even if it is not handling any requests, so call this first
	// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
	server.server.closeIdleConnections();

	server.server.close((error) => {
		// occurs if the server is already closed
		if (error) return;

		if (shutdown_timeout_id) {
			clearTimeout(shutdown_timeout_id);
		}
		if (idle_timeout_id) {
			clearTimeout(idle_timeout_id);
		}

		// @ts-expect-error custom events cannot be typed
		process.emit('sveltekit:shutdown', reason);
	});

	shutdown_timeout_id = setTimeout(
		// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
		() => server.server.closeAllConnections(),
		shutdown_timeout * 1000
	);
}

server.server.on(
	'request',
	/** @param {import('node:http').IncomingMessage} req */
	(req) => {
		requests++;

		if (socket_activation && idle_timeout_id) {
			idle_timeout_id = clearTimeout(idle_timeout_id);
		}

		req.on('close', () => {
			requests--;

			if (shutdown_timeout_id) {
				// close connections as soon as they become idle, so they don't accept new requests
				// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
				server.server.closeIdleConnections();
			}
			if (requests === 0 && socket_activation && idle_timeout) {
				idle_timeout_id = setTimeout(() => graceful_shutdown('IDLE'), idle_timeout * 1000);
			}
		});
	}
);

process.on('SIGTERM', graceful_shutdown);
process.on('SIGINT', graceful_shutdown);

export { server };
