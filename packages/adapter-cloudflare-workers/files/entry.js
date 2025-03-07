import { Server } from 'SERVER';
import { manifest, prerendered, base_path } from 'MANIFEST';
import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler';
import static_asset_manifest_json from '__STATIC_CONTENT_MANIFEST';
import crossws from 'crossws/adapters/cloudflare';

const static_asset_manifest = JSON.parse(static_asset_manifest_json);

const server = new Server(manifest);

const app_path = `/${manifest.appPath}`;

const immutable = `${app_path}/immutable/`;
const version_file = `${app_path}/version.json`;

/** @type {import('crossws').ResolveHooks} */
let resolve_websocket_hooks;
/** @type {import('crossws/adapters/cloudflare').CloudflareAdapter} */
let ws;

if (server.getWebSocketHooksResolver) {
	ws = crossws({
		resolve: (req) => resolve_websocket_hooks(req)
	});
}

export default {
	/**
	 * @param {Request} req
	 * @param {any} env
	 * @param {any} context
	 */
	async fetch(req, env, context) {
		const options = /** @satisfies {Parameters<typeof server.respond>[1]} */ ({
			platform: {
				env,
				context,
				// @ts-ignore lib.dom is interfering with workers-types
				caches,
				// @ts-ignore req is actually a Cloudflare request not a standard request
				cf: req.cf
			},
			getClientAddress() {
				return req.headers.get('cf-connecting-ip');
			}
		});

		await server.init({
			env,
			peers: ws?.peers,
			publish: ws?.publish
		});

		if (req.headers.get('upgrade') === 'websocket' && ws) {
			resolve_websocket_hooks = server.getWebSocketHooksResolver(
				// @ts-ignore
				options
			);
			return ws.handleUpgrade(
				// @ts-ignore wtf is Cloudflare doing to these types
				req,
				env,
				context
			);
		}

		const url = new URL(req.url);

		// static assets
		if (url.pathname.startsWith(app_path)) {
			/** @type {Response} */
			const res = await get_asset_from_kv(req, env, context);
			if (is_error(res.status)) return res;

			const cache_control = url.pathname.startsWith(immutable)
				? 'public, immutable, max-age=31536000'
				: 'no-cache';

			return new Response(res.body, {
				headers: {
					// include original headers, minus cache-control which
					// is overridden, and etag which is no longer useful
					'cache-control': cache_control,
					'content-type': res.headers.get('content-type'),
					'x-robots-tag': 'noindex'
				}
			});
		}

		let { pathname, search } = url;
		try {
			pathname = decodeURIComponent(pathname);
		} catch {
			// ignore invalid URI
		}

		const stripped_pathname = pathname.replace(/\/$/, '');

		// prerendered pages and /static files
		let is_static_asset = false;
		const filename = stripped_pathname.slice(base_path.length + 1);
		if (filename) {
			is_static_asset =
				manifest.assets.has(filename) ||
				manifest.assets.has(filename + '/index.html') ||
				filename in manifest._.server_assets ||
				filename + '/index.html' in manifest._.server_assets;
		}

		let location = pathname.at(-1) === '/' ? stripped_pathname : pathname + '/';

		if (
			is_static_asset ||
			prerendered.has(pathname) ||
			pathname === version_file ||
			pathname.startsWith(immutable)
		) {
			return get_asset_from_kv(req, env, context, (request, options) => {
				if (prerendered.has(pathname)) {
					url.pathname = '/' + prerendered.get(pathname).file;
					return new Request(url.toString(), request);
				}

				return mapRequestToAsset(request, options);
			});
		} else if (location && prerendered.has(location)) {
			if (search) location += search;
			return new Response('', {
				status: 308,
				headers: {
					location
				}
			});
		}

		// dynamically-generated pages
		return await server.respond(
			req,
			// @ts-ignore
			options
		);
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
