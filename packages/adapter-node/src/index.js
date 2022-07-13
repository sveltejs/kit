/* global ENV_PREFIX */

import { handler } from './handler.js';
import { env } from './env.js';
import compression from 'compression';
import polka from 'polka';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');
export const compression_enabled = env('COMPRESSION_ENABLED', 'true') === 'true';
export const compression_threshold = parseInt(env('COMPRESSION_THRESHOLD', '0'), 10);

if (isNaN(compression_threshold) || compression_threshold < 0) {
	throw Error(`${ENV_PREFIX}COMPRESSION_THRESHOLD should be a positve number`);
}

const compression_middleware = compression_enabled
	? compression({ threshold: compression_threshold })
	: undefined;

const middlewares = [compression_middleware, handler].filter(Boolean);

// https://github.com/lukeed/polka/issues/173
// @ts-ignore - nothing we can do about so just ignore it
const server = polka().use(...middlewares);

server.listen({ path, host, port }, () => {
	console.log(`Listening on ${path ? path : host + ':' + port}`);
});

export { server };
