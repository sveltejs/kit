import { Server } from 'SERVER';
import { manifest, prerendered } from 'MANIFEST';
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';
import static_asset_manifest_json from '__STATIC_CONTENT_MANIFEST';
const static_asset_manifest = JSON.parse(static_asset_manifest_json);

const server = new Server(manifest);

const prefix = `/${manifest.appDir}/`;

export default {
	/**
	 * @param {Request} req
	 * @param {any} env
	 * @param {any} context
	 */
	async fetch(req, env, context) {
		const url = new URL(req.url);

		// static assets
		if (url.pathname.startsWith(prefix)) {
			/** @type {Response} */
			const res = await get_asset_from_kv(req, env, context);
			if (is_error(res.status)) return res;

			return new Response(res.body, {
				headers: {
					// include original cache headers, minus cache-control which
					// is overridden, and etag which is no longer useful
					'cache-control': 'public, immutable, max-age=31536000',
					'content-type': res.headers.get('content-type'),
					'x-robots-tag': 'noindex'
				}
			});
		}

		// prerendered pages and index.html files
		const pathname = url.pathname.replace(/\/$/, '');
		let file = pathname.substring(1);

		try {
			file = decodeURIComponent(file);
		} catch (err) {
			// ignore
		}

		if (
			manifest.assets.has(file) ||
			manifest.assets.has(file + '/index.html') ||
			prerendered.has(pathname || '/')
		) {
			return get_asset_from_kv(req, env, context, (request, options) => {
				if (prerendered.has(pathname || '/')) {
					url.pathname = '/' + prerendered.get(pathname || '/').file;
					return new Request(url.toString(), request);
				}

				return mapRequestToAsset(request, options);
			});
		}

		// dynamically-generated pages
		return await server.respond(req, {
			platform: { env, context },
			getClientAddress() {
				return req.headers.get('cf-connecting-ip');
			}
		});
	}
};

/**
 * @param {Request} req
 * @param {any} env
 * @param {any} context
 */
async function get_asset_from_kv(req, env, context, map = mapRequestToAsset) {
	return await getAssetFromKV(
		{
			request: req,
			waitUntil(promise) {
				return context.waitUntil(promise);
			}
		},
		{
			ASSET_NAMESPACE: env.__STATIC_CONTENT,
			ASSET_MANIFEST: static_asset_manifest,
			mapRequestToAsset: map
		}
	);
}

/**
 * @param {number} status
 * @returns {boolean}
 */
function is_error(status) {
	return status > 399;
}
