import { handler } from './handler.js';
import compression from 'compression';
import polka from 'polka';

/* global SOCKET_PATH, HOST, PORT */

export const path = process.env[SOCKET_PATH] || false;
export const host = process.env[HOST] || '0.0.0.0';
export const port = process.env[PORT] || (!path && '3000');

const server = polka().use(
	// https://github.com/lukeed/polka/issues/173
	// @ts-ignore - nothing we can do about so just ignore it
	compression({ threshold: 0 }),
	handler
);

server.listen({ path, host, port }, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { server };
