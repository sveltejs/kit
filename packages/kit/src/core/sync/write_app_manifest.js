/** @import { Asset, ManifestData, RouteData } from 'types' */

import { s } from '../../utils/misc.js';
import { is_app_route, is_endpoint_route, is_page_route } from './create_manifest_data/index.js';
import { dedent, write_if_changed } from './utils.js';

/**
 * Creates the `$app/manifest` data module. During development, real values
 * are emitted for `assets` and `routes` (the only data known at that point).
 *
 * During build, bare identifier placeholders (fake globals) are emitted.
 * The bundler leaves these as unresolved global references in the output,
 * which are then replaced with real values by scanning the output chunks
 * after each build completes. This avoids the content-hash feedback loop:
 * the manifest data lives in its own chunk with a fixed filename, so
 * importers' hashes are stable regardless of the manifest content.
 *
 * @param {string} out
 * @param {ManifestData | undefined} manifest_data
 * @param {boolean} is_build
 */
export function write_app_manifest(out, manifest_data, is_build) {
	const code = is_build
		? // Bare identifiers (fake globals) — the bundler leaves these as
			// unresolved global references in the output. They are replaced
			// with real values by `replace_manifest_placeholder_variables`
			// after each build completes.
			dedent`
			export const immutable = __SVELTEKIT_MANIFEST_IMMUTABLE__;
			export const assets = __SVELTEKIT_MANIFEST_ASSETS__;
			export const prerendered = __SVELTEKIT_MANIFEST_PRERENDERED__;
			export const routes = __SVELTEKIT_MANIFEST_ROUTES__;
		`
		: // In dev, `manifest_data` may not be set yet on the very first load,
			// but `configureServer` (which calls `sync.create`) runs before any
			// module is served, so it will be set by the time this is called.
			dedent`
		// empty during dev
		export const immutable = [];
		export const prerendered = [];

		export const assets = [
			${stringify_assets(manifest_data?.assets)}
		];

		export const routes = [
			${stringify_routes(manifest_data?.routes)}
		];
	`;

	write_if_changed(`${out}/app-manifest.js`, code);
}

/**
 * @param {Asset[] | undefined} assets
 * @returns {string}
 */
function stringify_assets(assets) {
	return assets?.map((asset) => s({ path: asset.file })).join(',\n') ?? '';
}

/**
 * @param {RouteData[] | undefined} routes
 * @returns {Array<{ id: string; page: boolean; endpoint: boolean }>}
 */
export function get_manifest_routes(routes) {
	return (
		routes?.filter(is_app_route).map((route) => ({
			id: route.id,
			page: is_page_route(route),
			endpoint: is_endpoint_route(route)
		})) ?? []
	);
}

/**
 * @param {RouteData[] | undefined} routes
 * @returns {string}
 */
function stringify_routes(routes) {
	return get_manifest_routes(routes)
		.map((route) => s(route))
		.join(',\n');
}
