import { handler } from 'HANDLER';
import { env } from 'ENV';
import polka from 'polka';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');

const listen_pid = parseInt(env('LISTEN_PID', '-1'));
const listen_fds = parseInt(env('LISTEN_FDS', '-1'));
const timeout = parseInt(env('TIMEOUT', '-1'));
const listen_fd = 3;

const server = polka().use(handler);

function close() {
	// @ts-expect-error this was added in 18.2.0 but is not reflected in the types
	server.server.closeIdleConnections();
	server.server.close();
}

if (listen_pid === process.pid && listen_fds === 1) {
	server.listen({ fd: listen_fd }, () => {
		console.log(`Listening on file descriptor ${listen_fd}`);
	});

	if (timeout) {
		/** @type {NodeJS.Timeout | void} */
		let timeout_id;
		let requests = 0;

		/** @param {import('node:http').IncomingMessage} req */
		function on_request(req) {
			requests++;

			if (timeout_id) {
				timeout_id = clearTimeout(timeout_id);
			}

			req.on('close', on_request_close);
		}

		function on_request_close() {
			requests--;

			if (requests === 0) {
				timeout_id = setTimeout(close, timeout * 1000);
			}
		}

		server.server.on('request', on_request);
	}
} else {
	server.listen({ path, host, port }, () => {
		console.log(`Listening on ${path ? path : host + ':' + port}`);
	});
}

process.on('SIGTERM', close);
process.on('SIGINT', close);

export { server };
