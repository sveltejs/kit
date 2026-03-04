import path from 'node:path';
import { GENERATED_COMMENT } from '../../constants.js';
import { write_if_changed } from './utils.js';
import { s } from '../../utils/misc.js';
import { get_route_segments } from '../../utils/routing.js';

const replace_optional_params = (/** @type {string} */ id) =>
	id.replace(/\/\[\[[^\]]+\]\]/g, '${string}');
const replace_required_params = (/** @type {string} */ id) =>
	id.replace(/\/\[[^\]]+\]/g, '/${string}');
/** Convert route ID to pathname by removing layout groups */
const remove_group_segments = (/** @type {string} */ id) => {
	return '/' + get_route_segments(id).join('/');
};

/**
 * Get pathnames to add based on trailingSlash settings
 * @param {string} pathname
 * @param {import('types').RouteData} route
 * @returns {string[]}
 */
function get_pathnames_for_trailing_slash(pathname, route) {
	if (pathname === '/') {
		return [pathname];
	}

	/** @type {({ trailingSlash?: import('types').TrailingSlash } | null)[]} */
	const routes = [];

	if (route.leaf) routes.push(route.leaf.page_options ?? null);
	if (route.endpoint) routes.push(route.endpoint.page_options);

	/** @type {Set<string>} */
	const pathnames = new Set();

	for (const page_options of routes) {
		if (page_options === null || page_options.trailingSlash === 'ignore') {
			pathnames.add(pathname);
			pathnames.add(pathname + '/');
		} else if (page_options.trailingSlash === 'always') {
			pathnames.add(pathname + '/');
		} else {
			pathnames.add(pathname);
		}
	}

	return Array.from(pathnames);
}

// `declare module "svelte/elements"` needs to happen in a non-ambient module, and dts-buddy generates one big ambient module,
// so we can't add it there - therefore generate the typings ourselves here.
// We're not using the `declare namespace svelteHTML` variant because that one doesn't augment the HTMLAttributes interface
// people could use to type their own components.
// The T generic is needed or else there's a "all declarations must have identical type parameters" error.
const template = `
${GENERATED_COMMENT}

declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};
`;

/**
 * Generate app types interface extension
 * @param {import('types').ManifestData} manifest_data
 */
function generate_app_types(manifest_data) {
	/** @type {Set<string>} */
	const pathnames = new Set();

	/** @type {string[]} */
	const dynamic_routes = [];

	/** @type {string[]} */
	const layouts = [];

	for (const route of manifest_data.routes) {
		if (route.params.length > 0) {
			const params = route.params.map((p) => `${p.name}${p.optional ? '?:' : ':'} string`);
			const route_type = `${s(route.id)}: { ${params.join('; ')} }`;

			dynamic_routes.push(route_type);

			const pathname = remove_group_segments(route.id);
			const replaced_pathname = replace_required_params(replace_optional_params(pathname));

			for (const p of get_pathnames_for_trailing_slash(replaced_pathname, route)) {
				pathnames.add(`\`${p}\` & {}`);
			}
		} else {
			const pathname = remove_group_segments(route.id);
			for (const p of get_pathnames_for_trailing_slash(pathname, route)) {
				pathnames.add(s(p));
			}
		}

		/** @type {Map<string, boolean>} */
		const child_params = new Map(route.params.map((p) => [p.name, p.optional]));

		for (const child of manifest_data.routes.filter((r) => r.id.startsWith(route.id))) {
			for (const p of child.params) {
				if (!child_params.has(p.name)) {
					child_params.set(p.name, true); // always optional
				}
			}
		}

		const layout_params = Array.from(child_params)
			.map(([name, optional]) => `${name}${optional ? '?:' : ':'} string`)
			.join('; ');

		const layout_type = `${s(route.id)}: ${layout_params.length > 0 ? `{ ${layout_params} }` : 'Record<string, never>'}`;
		layouts.push(layout_type);
	}

	const assets = manifest_data.assets.map((asset) => s('/' + asset.file));

	return [
		'declare module "$app/types" {',
		'\texport interface AppTypes {',
		`\t\tRouteId(): ${manifest_data.routes.map((r) => s(r.id)).join(' | ')};`,
		`\t\tRouteParams(): {\n\t\t\t${dynamic_routes.join(';\n\t\t\t')}\n\t\t};`,
		`\t\tLayoutParams(): {\n\t\t\t${layouts.join(';\n\t\t\t')}\n\t\t};`,
		`\t\tPathname(): ${Array.from(pathnames).join(' | ')};`,
		'\t\tResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes[\'Pathname\']>}`;',
		`\t\tAsset(): ${assets.concat('string & {}').join(' | ')};`,
		'\t}',
		'}'
	].join('\n');
}

/**
 * Writes non-ambient declarations to the output directory
 * @param {import('types').ValidatedKitConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export function write_non_ambient(config, manifest_data) {
	const app_types = generate_app_types(manifest_data);
	const content = [template, app_types].join('\n\n');

	write_if_changed(path.join(config.outDir, 'non-ambient.d.ts'), content);
}
