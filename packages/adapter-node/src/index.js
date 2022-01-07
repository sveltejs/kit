import { handler } from './handler.js';
import compression from 'compression';
import polka from 'polka';

/* global PATH_ENV, HOST_ENV, PORT_ENV */

export const path = process.env[PATH_ENV] || false;
export const host = process.env[HOST_ENV] || '0.0.0.0';
export const port = process.env[PORT_ENV] || (!path && '3000');

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
