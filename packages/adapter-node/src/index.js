import { handler } from 'HANDLER';
import { env } from 'ENV';
import polka from 'polka';
import process from 'process';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');

const server = polka().use(handler);

// systemd socket activation
const listen_pid = env('LISTEN_PID', false);
const listen_fds = env('LISTEN_FDS', false);
const sd_listen_fds_start = 3;

if (listen_pid && listen_fds && process.pid === parseInt(listen_pid)) {
	const fd = sd_listen_fds_start + parseInt(listen_fds) - 1;
	server.listen({ fd }, () => {
		console.log(`Listening on fd ${fd}`);
	});
} else {
	server.listen({ path, host, port }, () => {
		console.log(`Listening on ${path ? path : host + ':' + port}`);
	});
}

export { server };
