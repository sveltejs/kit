import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import sirv from 'sirv';
import app from '@sveltejs/kit/app';
import { create_kit_middleware } from './kit-middleware.js';

app.init();

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

export const kitMiddleware = create_kit_middleware(app);
