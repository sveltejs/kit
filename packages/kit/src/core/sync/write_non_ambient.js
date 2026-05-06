import path from 'node:path';
import { GENERATED_COMMENT } from '../../constants.js';
import { posixify } from '../../utils/filesystem.js';
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
 * @param {import('types').ValidatedKitConfig} config
 */
function generate_app_types(manifest_data, config) {
	/** @param {string} matcher */
	const path_to_matcher = (matcher) =>
		posixify(path.relative(config.outDir, path.join(config.files.params, matcher + '.js')));

	/** @type {Map<string, string>} */
	const matcher_types = new Map();

	/** @param {string | undefined} matcher */
	const get_matcher_type = (matcher) => {
		if (!matcher) return 'string';

		let type = matcher_types.get(matcher);
		if (!type) {
			type = `MatcherParam<typeof import('${path_to_matcher(matcher)}').match>`;
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
	const dynamic_routes = [];

	/** @type {string[]} */
	const layouts = [];

	/** @type {Map<string, Map<string, { optional: boolean, matchers: Set<string> | null }>>} */
	const layout_params_by_route = new Map(
		manifest_data.routes.map((route) => [
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
		const pathname = remove_group_segments(route.id);
		let normalized_pathname = pathname;

		/** @type {(path: string) => string} */
		let serialise = s;

		if (route.params.length > 0) {
			const params = route.params.map((p) => {
				const type = get_matcher_type(p.matcher);
				return `${p.name}${p.optional ? '?:' : ':'} ${type}`;
			});
			const route_type = `${s(route.id)}: { ${params.join('; ')} }`;

			dynamic_routes.push(route_type);

			normalized_pathname = replace_required_params(replace_optional_params(pathname));
			serialise = (p) => `\`${p}\` & {}`;
		}

		for (const p of get_pathnames_for_trailing_slash(normalized_pathname, route)) {
			pathnames.add(serialise(p));
		}

		let layout_type = 'Record<string, never>';

		const layout_params = layout_params_by_route.get(route.id);
		if (layout_params) {
			const params = Array.from(layout_params)
				.map(([name, { optional, matchers }]) => {
					const type = get_matchers_type(matchers);
					return `${name}${optional ? '?:' : ':'} ${type}`;
				})
				.join('; ');

			if (params.length > 0) layout_type = `{ ${params} }`;
		}

		layouts.push(`${s(route.id)}: ${layout_type}`);
	}

	const assets = manifest_data.assets.map((asset) => s('/' + asset.file));

	return [
		'declare module "$app/types" {',
		'\ttype MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;',
		'',
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
	const app_types = generate_app_types(manifest_data, config);
	const content = [template, app_types].join('\n\n');

	write_if_changed(path.join(config.outDir, 'non-ambient.d.ts'), content);
}
