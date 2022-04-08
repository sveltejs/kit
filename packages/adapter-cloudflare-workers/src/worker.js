import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import * as Cache from 'worktop/cfw.cache';
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';

// Note: This does not get bundled
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const ASSET_MANIFEST = JSON.parse(manifestJSON);
ASSET_MANIFEST['index.html'] = 'index.special.html';

const server = new Server(manifest);

const prefix = `/${manifest.appDir}/`;

/** @type {import('worktop/cfw').Module.Worker<{ __STATIC_CONTENT: unknown }>} */
const worker = {
	async fetch(req, env, context) {
		try {
			let res = await Cache.lookup(req);
			if (res) return res;

			const url = new URL(req.url);
			let { pathname } = url;

			// static assets
			if (pathname.startsWith(prefix)) {
				res = await getAssetFromKV(
					{
						request: req,
						waitUntil(promise) {
							return context.waitUntil(promise);
						}
					},
					{
						ASSET_NAMESPACE: env.__STATIC_CONTENT,
						ASSET_MANIFEST,
						mapRequestToAsset(request, options) {
							if (prerendered.has(pathname || '/')) {
								url.pathname = '/' + prerendered.get(pathname || '/').file;
								return new Request(url.toString(), request);
							}
							return mapRequestToAsset(request, options);
						}
					}
				);

				res = new Response(res.body, {
					headers: {
						// include original cache headers, minus cache-control which
						// is overridden, and etag which is no longer useful
						'cache-control': 'public, immutable, max-age=31536000',
						'content-type': res.headers.get('content-type'),
						'x-robots-tag': 'noindex'
					}
				});
			} else {
				// prerendered pages and index.html files
				pathname = pathname.replace(/\/$/, '') || '/';

				let file = pathname.substring(1);

				try {
					file = decodeURIComponent(file);
				} catch (err) {
					// ignore
				}

				if (
					manifest.assets.has(file) ||
					manifest.assets.has(file + '/index.html') ||
					prerendered.has(pathname)
				) {
					res = await getAssetFromKV(
						{
							request: req,
							waitUntil(promise) {
								return context.waitUntil(promise);
							}
						},
						{
							ASSET_NAMESPACE: env.__STATIC_CONTENT,
							ASSET_MANIFEST
						}
					);
				} else {
					// dynamically-generated pages
					res = await server.respond(req, {
						platform: { env, context },
						getClientAddress() {
							return req.headers.get('cf-connecting-ip');
						}
					});
				}
			}

			// Writes to Cache only if allowed
			return Cache.save(req, res, context);
		} catch (e) {
			return new Response('Error rendering route: ' + (e.message || e.toString()), { status: 500 });
		}
	}
};

export default worker;
