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

const socket_activation = listen_pid === process.pid && listen_fds === 1;

let requests = 0;
/** @type {NodeJS.Timeout | void} */
let shutdown_timeout_id;
/** @type {NodeJS.Timeout | void} */
let idle_timeout_id;

const server = polka().use(handler);

function shutdown() {
	if (shutdown_timeout_id) return;

	// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
	server.server.closeIdleConnections();

	server.server.close(() => {
		if (shutdown_timeout_id) {
			shutdown_timeout_id = clearTimeout(shutdown_timeout_id);
		}
		if (idle_timeout_id) {
			idle_timeout_id = clearTimeout(idle_timeout_id);
		}
	});

	shutdown_timeout_id = setTimeout(
		// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
		() => server.server.closeAllConnections(),
		shutdown_timeout * 1000
	);
}

/** @param {import('node:http').IncomingMessage} req */
function on_request(req) {
	requests++;

	if (socket_activation && idle_timeout_id) {
		idle_timeout_id = clearTimeout(idle_timeout_id);
	}

	req.on('close', on_request_close);
}

function on_request_close() {
	requests--;

	if (shutdown_timeout_id) {
		// when the request is done, close the connection, so the app shuts down without delay
		// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
		server.closeIdleConnections();
	}
	if (socket_activation && idle_timeout && requests === 0) {
		idle_timeout_id = setTimeout(shutdown, idle_timeout * 1000);
	}
}

server.server.on('request', on_request);

if (socket_activation) {
	server.listen({ fd: SD_LISTEN_FDS_START }, () => {
		console.log(`Listening on file descriptor ${SD_LISTEN_FDS_START}`);
	});
} else {
	server.listen({ path, host, port }, () => {
		console.log(`Listening on ${path ? path : host + ':' + port}`);
	});
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { server };
