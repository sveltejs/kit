import '@sveltejs/kit/install-fetch';
import { assetsMiddleware, kitMiddleware, prerenderedMiddleware } from './middlewares';
import compression from 'compression';
import polka from 'polka';

// options
const path = process.env['SOCKET_PATH'] || false;
const host = process.env['HOST'] || '0.0.0.0';
const port = process.env['PORT'] || (!path && 3000);

const server = polka().use(
	// https://github.com/lukeed/polka/issues/173
	// @ts-expect-error - nothing we can do about so just ignore it
	compression({ threshold: 0 }),
	assetsMiddleware,
	kitMiddleware,
	prerenderedMiddleware
);

server.listen({ path, host, port }, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { server };
