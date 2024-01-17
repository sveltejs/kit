import { handler } from 'HANDLER';
import { env } from 'ENV';
import polka from 'polka';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');

const listen_pid = parseInt(env('LISTEN_PID', false));
const listen_fds = parseInt(env('LISTEN_FDS', false));
const timeout = parseInt(env('TIMEOUT', false));

const server = polka().use(handler);

if (process.pid === listen_pid && listen_fds === 1) {
	// systemd socket activation
	server.listen({ fd: 3 }, () => {
		console.log('Listening on file descriptor 3');
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
				timeout_id = setTimeout(() => server.server.close(), timeout * 1000);
			}
		}

		server.server.on('request', on_request);
	}
} else {
	server.listen({ path, host, port }, () => {
		console.log(`Listening on ${path ? path : host + ':' + port}`);
	});
}

export { server };
