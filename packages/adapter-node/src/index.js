import { handler } from './handler.js';
import compression from 'compression';
import polka from 'polka';

export const path = process.env[PATH_ENV];
export const host = process.env[HOST_ENV];
export const port = process.env[PORT_ENV];

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
