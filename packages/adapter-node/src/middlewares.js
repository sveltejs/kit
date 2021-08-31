// TODO hardcoding the relative location makes this brittle
// Also, we need most of the logic in another file for testing because
// ../output/server/app.js doesn't exist when we run the tests
// @ts-ignore
import { init, render } from '../output/server/app.js';
import { create_kit_middleware } from './kit-middleware.js';

import fs from 'fs';
import { dirname, join } from 'path';
import sirv from 'sirv';
import { fileURLToPath } from 'url';

// App is a dynamic file built from the application layer.

const __dirname = dirname(fileURLToPath(import.meta.url));
/** @type {import('polka').Middleware} */
const noop_handler = (_req, _res, next) => next();
const paths = {
	assets: join(__dirname, '/assets'),
	prerendered: join(__dirname, '/prerendered')
};

export const prerenderedMiddleware = fs.existsSync(paths.prerendered)
	? sirv(paths.prerendered, {
			etag: true,
			maxAge: 0,
			gzip: true,
			brotli: true
	  })
	: noop_handler;

export const assetsMiddleware = fs.existsSync(paths.assets)
	? sirv(paths.assets, {
			setHeaders: (res, pathname) => {
				// @ts-expect-error - dynamically replaced with define
				if (pathname.startsWith(/* eslint-disable-line no-undef */ APP_DIR)) {
					res.setHeader('cache-control', 'public, max-age=31536000, immutable');
				}
			},
			gzip: true,
			brotli: true
	  })
	: noop_handler;

export const kitMiddleware = (function () {
	init();
	return create_kit_middleware({ render });
})();
