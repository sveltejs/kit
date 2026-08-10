import path from 'node:path';
import { GENERATED_COMMENT } from '../../constants.js';
import { resolve_entry } from '../../utils/filesystem.js';
import { posixify } from '../../utils/os.js';
import { write_if_changed } from './utils.js';
import { s } from '../../utils/misc.js';
import {
	decode_escape_sequence,
	encode_pathname_chars,
	get_route_segments,
	segment_pattern
} from '../../utils/routing.js';
import { is_app_route, is_endpoint_route, is_page_route } from './create_manifest_data/index.js';

const optional_param_pattern = /^\[\[[\w-]+(?:=[\w-]+)?\]\]$/;
const rest_param_pattern = /^\[\.\.\.[\w-]+(?:=[\w-]+)?\]$/;

/**
 * Convert a route ID to the pathnames it can match (relative to the base path), in which each
 * param is replaced with `${string}` and each escape sequence is expanded. A param that fills an
 * entire segment can be absent, so it contributes a pathname with the segment and one without,
 * rather than one that absorbs the `/`
 * @param {string} id
 */
const get_pathname_patterns = (id) => {
	let pathnames = [''];

	for (const segment of get_route_segments(id)) {
		const omittable = optional_param_pattern.test(segment) || rest_param_pattern.test(segment);
		const content = omittable
			? '${string}'
			: segment.replace(segment_pattern, (_, escape_type, escape_code) =>
					escape_type ? encode_pathname_chars(decode_escape_sequence(escape_code)) : '${string}'
				);

		pathnames = pathnames.flatMap((pathname) => {
			const joined = pathname === '' ? content : `${pathname}/${content}`;
			return omittable ? [joined, pathname] : [joined];
		});
	}

	return [...new Set(pathnames)];
};

/**
 * Get pathnames to add based on trailingSlash settings
 * @param {string} pathname
 * @param {import('types').RouteData} route
 * @returns {string[]}
 */
function get_pathnames_for_trailing_slash(pathname, route) {
	/** @type {Set<string>} */
	const pathnames = new Set();

	/**
	 * @param {{ trailingSlash?: import('types').TrailingSlash } | null | undefined} page_options
	 */
	const add_pathnames = (page_options) => {
		if (page_options === null || page_options?.trailingSlash === 'ignore') {
			pathnames.add(pathname);
			pathnames.add(pathname + '/');
		} else if (page_options?.trailingSlash === 'always') {
			pathnames.add(pathname + '/');
		} else {
			pathnames.add(pathname);
		}
	};

	if (route.leaf) add_pathnames(route.leaf.page_options ?? null);
	if (route.endpoint) add_pathnames(route.endpoint.page_options);

	return Array.from(pathnames);
}

// `declare module "svelte/elements"` needs to happen in a non-ambient module, and dts-buddy generates one big ambient module,
// so we can't add it there - therefore generate the typings ourselves here.
// We're not using the `declare namespace svelteHTML` variant because that one doesn't augment the HTMLAttributes interface
// people could use to type their own components.
// The T generic is needed or else there's a "all declarations must have identical type parameters" error.
const template = `
declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-preload-code'?:
			| true
			| false
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | false | '' | 'hover' | 'tap' | undefined | null;
		'data-sveltekit-reload'?: true | false | '' | undefined | null;
		'data-sveltekit-replacestate'?: true | false | '' | undefined | null;
		'data-sveltekit-reset'?: true | false | '' | undefined | null;
	}
}
`;

/**
 * Generate app types interface extension
 * @param {import('types').ManifestData} manifest_data
 * @param {import('types').ValidatedKitConfig} config
 * @param {string} dir
 */
function generate_app_types(manifest_data, config, dir) {
	/** @type {Map<string, string>} */
	const matcher_types = new Map();

	/** @param {string | undefined} matcher */
	const get_matcher_type = (matcher) => {
		if (!matcher) return 'string';

		let type = matcher_types.get(matcher);
		if (!type) {
			const path_to_params = () => {
				const params_file =
					resolve_entry(config.files.params) ??
					config.files.params.replace(/\.(js|ts)$/, '') + '.js';

				return posixify(path.relative(dir, params_file));
			};

			type = `import('@sveltejs/kit').MatcherParam<(typeof import('${path_to_params()}').params)[${JSON.stringify(matcher)}]>`;
			matcher_types.set(matcher, type);
		}

		return type;
	};

	/** @param {Set<string> | null} matchers */
	const get_matchers_type = (matchers) => {
		if (matchers === null) return 'string';

		return Array.from(matchers)
			.map((matcher) => get_matcher_type(matcher))
			.join(' | ');
	};

	/** @type {Set<string>} */
	const route_ids = new Set(manifest_data.routes.map((route) => route.id));

	/**
	 * @param {string} id
	 * @returns {string[]}
	 */
	const get_ancestor_route_ids = (id) => {
		/** @type {string[]} */
		const ancestors = [];

		if (route_ids.has('/')) {
			ancestors.push('/');
		}

		let current = '';
		for (const segment of id.slice(1).split('/')) {
			if (!segment) continue;

			current += '/' + segment;
			if (route_ids.has(current)) {
				ancestors.push(current);
			}
		}

		return ancestors;
	};

	/** @type {Set<string>} */
	const pathnames = new Set();

	/** @type {string[]} */
	const page_route_ids = [];

	/** @type {string[]} */
	const endpoint_route_ids = [];

	/** @type {string[]} */
	const app_route_ids = [];

	/** @type {string[]} */
	const dynamic_routes = [];

	/** @type {string[]} */
	const layouts = [];

	/** @type {Map<string, Map<string, { optional: boolean, matchers: Set<string> | null }>>} */
	const layout_params_by_route = new Map(
		manifest_data.routes
			.filter((route) => route.layout)
			.map((route) => [
				route.id,
				new Map(
					route.params.map((p) => [
						p.name,
						{ optional: p.optional, matchers: p.matcher ? new Set([p.matcher]) : null }
					])
				)
			])
	);

	for (const route of manifest_data.routes) {
		const ancestors = get_ancestor_route_ids(route.id);

		for (const ancestor_id of ancestors) {
			const ancestor_params = layout_params_by_route.get(ancestor_id);
			if (!ancestor_params) continue;

			for (const p of route.params) {
				const matcher = p.matcher ?? null;
				const entry = ancestor_params.get(p.name);
				if (!entry) {
					ancestor_params.set(p.name, {
						optional: true,
						matchers: matcher === null ? null : new Set([matcher])
					});
					continue;
				}

				if (entry.matchers === null) continue;

				if (matcher === null) {
					entry.matchers = null;
					continue;
				}

				entry.matchers.add(matcher);
			}
		}
	}

	for (const route of manifest_data.routes) {
		const id = s(route.id);

		if (is_page_route(route)) page_route_ids.push(id);
		if (is_endpoint_route(route)) endpoint_route_ids.push(id);
		if (is_app_route(route)) app_route_ids.push(id);

		/** @type {(path: string) => string} */
		let serialise = s;

		if (route.params.length > 0) {
			const params = route.params.map((p) => {
				const type = get_matcher_type(p.matcher);
				return `${/^\w+$/.test(p.name) ? p.name : `'${p.name}'`}${p.optional ? '?:' : ':'} ${type}${p.optional ? ' | undefined' : ''}`;
			});

			if (is_app_route(route)) {
				dynamic_routes.push(`${s(route.id)}: { ${params.join('; ')} }`);
			}

			serialise = (p) => `\`${p}\` & {}`;
		}

		for (const pathname of get_pathname_patterns(route.id)) {
			for (const p of get_pathnames_for_trailing_slash(pathname, route)) {
				pathnames.add(serialise(p));
			}
		}

		let layout_type = 'Record<string, never>';

		const layout_params = layout_params_by_route.get(route.id);
		if (layout_params) {
			const params = Array.from(layout_params)
				.map(([name, { optional, matchers }]) => {
					const type = get_matchers_type(matchers);
					return `${/^\w+$/.test(name) ? name : `'${name}'`}${optional ? '?:' : ':'} ${type}${optional ? ' | undefined' : ''}`;
				})
				.join('; ');

			if (params.length > 0) layout_type = `{ ${params} }`;
		}

		if (route.layout) layouts.push(`${s(route.id)}: ${layout_type}`);
	}

	const assets = manifest_data.assets.map((asset) => s(asset.file));

	return [
		'declare module "$app/types" {',
		'\texport interface AppTypes {',
		`\t\tPageRouteId(): ${page_route_ids.join(' | ') || 'never'};`,
		`\t\tEndpointRouteId(): ${endpoint_route_ids.join(' | ') || 'never'};`,
		`\t\tRouteId(): ${app_route_ids.join(' | ') || 'never'};`,
		`\t\tRouteParams(): {\n\t\t\t${dynamic_routes.join(';\n\t\t\t')}\n\t\t};`,
		`\t\tLayoutParams(): {\n\t\t\t${layouts.join(';\n\t\t\t')}\n\t\t};`,
		`\t\tPath(): ${Array.from(pathnames).join(' | ')};`,
		'\t\tResolvedPathname(): `${"/" | `/${string}/`}${ReturnType<AppTypes[\'Path\']>}`;',
		`\t\tAssetPath(): ${assets.join(' | ') || 'never'};`,
		'\t}',
		'}'
	].join('\n');
}

/**
 * Writes `node_modules/$app/types/index.d.ts`. This file contains
 * declarations for `$app/types` and `svelte/elements`, and
 * imports `env.ts` which declares `$app/env/(public|private)`
 * @param {import('types').ValidatedKitConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} root
 */
export function write_app_types(config, manifest_data, root) {
	const dir = path.join(root, 'node_modules/$app/types');

	const content = [
		GENERATED_COMMENT,
		`import '@sveltejs/kit';\nimport './env';`,
		generate_app_types(manifest_data, config, dir),
		template.trim()
	].join('\n\n');

	write_if_changed(path.join(dir, 'index.d.ts'), content);
}
