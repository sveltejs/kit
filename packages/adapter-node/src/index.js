import { path, host, port } from './env.js';
import { assetsMiddleware, kitMiddleware, prerenderedMiddleware } from './middlewares.js';
import compression from 'compression';
import polka from 'polka';

const server = polka().use(
	// https://github.com/lukeed/polka/issues/173
	// @ts-ignore - nothing we can do about so just ignore it
	compression({ threshold: 0 }),
	assetsMiddleware,
	kitMiddleware,
	prerenderedMiddleware
);

const listenOpts = { path, host, port };

server.listen(listenOpts, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { server };
