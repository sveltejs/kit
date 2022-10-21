import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { runtime_directory } from '../../utils.js';
import { posixify } from '../../../utils/filesystem.js';
import { parse_route_id } from '../../../utils/routing.js';
import { sort_routes } from './sort.js';

/**
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   fallback?: string;
 *   cwd?: string;
 * }} opts
 * @returns {import('types').ManifestData}
 */
export default function create_manifest_data({
	config,
	fallback = `${runtime_directory}/components`,
	cwd = process.cwd()
}) {
	const assets = create_assets(config);
	const matchers = create_matchers(config, cwd);
	const { nodes, routes } = create_routes_and_nodes(cwd, config, fallback);

	return {
		assets,
		matchers,
		nodes,
		routes
	};
}

/**
 * @param {import('types').ValidatedConfig} config
 */
function create_assets(config) {
	return list_files(config.kit.files.assets).map((file) => ({
		file,
		size: fs.statSync(path.resolve(config.kit.files.assets, file)).size,
		type: mime.getType(file)
	}));
}

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} cwd
 */
function create_matchers(config, cwd) {
	const params_base = path.relative(cwd, config.kit.files.params);

	/** @type {Record<string, string>} */
	const matchers = {};
	if (fs.existsSync(config.kit.files.params)) {
		for (const file of fs.readdirSync(config.kit.files.params)) {
			const ext = path.extname(file);
			if (!config.kit.moduleExtensions.includes(ext)) continue;
			const type = file.slice(0, -ext.length);

			if (/^\w+$/.test(type)) {
				const matcher_file = path.join(params_base, file);

				// Disallow same matcher with different extensions
				if (matchers[type]) {
					throw new Error(`Duplicate matchers: ${matcher_file} and ${matchers[type]}`);
				} else {
					matchers[type] = matcher_file;
				}
			} else {
				throw new Error(
					`Matcher names can only have underscores and alphanumeric characters — "${file}" is invalid`
				);
			}
		}
	}

	return matchers;
}

/**
 * @param {import('types').ValidatedConfig} config
 * @param {string} cwd
 * @param {string} fallback
 */
function create_routes_and_nodes(cwd, config, fallback) {
	/** @type {import('types').RouteData[]} */
	const routes = [];

	const routes_base = posixify(path.relative(cwd, config.kit.files.routes));

	const valid_extensions = [...config.extensions, ...config.kit.moduleExtensions];

	/** @type {import('types').PageNode[]} */
	const nodes = [];

	if (fs.existsSync(config.kit.files.routes)) {
		/**
		 * @param {number} depth
		 * @param {string} id
		 * @param {string} segment
		 * @param {import('types').RouteData | null} parent
		 */
		const walk = (depth, id, segment, parent) => {
			if (/\]\[/.test(id)) {
				throw new Error(`Invalid route ${id} — parameters must be separated`);
			}

			if (count_occurrences('[', id) !== count_occurrences(']', id)) {
				throw new Error(`Invalid route ${id} — brackets are unbalanced`);
			}

			if (/\[\.\.\.\w+\]\/\[\[/.test(id)) {
				throw new Error(
					`Invalid route ${id} — an [[optional]] route segment cannot follow a [...rest] route segment`
				);
			}

			if (/\[\[\.\.\./.test(id)) {
				throw new Error(
					`Invalid route ${id} — a rest route segment is always optional, remove the outer square brackets`
				);
			}

			const { pattern, names, types } = parse_route_id(id);

			/** @type {import('types').RouteData} */
			const route = {
				id,
				parent,

				segment,
				pattern,
				names,
				types,

				layout: null,
				error: null,
				leaf: null,
				page: null,
				endpoint: null
			};

			// important to do this before walking children, so that child
			// routes appear later
			routes.push(route);

			// if we don't do this, the route map becomes unwieldy to console.log
			Object.defineProperty(route, 'parent', { enumerable: false });

			const dir = path.join(cwd, routes_base, id);

			// We can't use withFileTypes because of a NodeJs bug which returns wrong results
			// with isDirectory() in case of symlinks: https://github.com/nodejs/node/issues/30646
			const files = fs.readdirSync(dir).map((name) => ({
				is_dir: fs.statSync(path.join(dir, name)).isDirectory(),
				name
			}));

			// process files first
			for (const file of files) {
				if (file.is_dir) continue;
				if (!file.name.startsWith('+')) continue;
				if (!valid_extensions.find((ext) => file.name.endsWith(ext))) continue;

				const project_relative = posixify(path.relative(cwd, path.join(dir, file.name)));

				const item = analyze(
					project_relative,
					file.name,
					config.extensions,
					config.kit.moduleExtensions
				);

				if (item.kind === 'component') {
					if (item.is_error) {
						route.error = {
							depth,
							component: project_relative
						};
					} else if (item.is_layout) {
						if (!route.layout) route.layout = { depth, child_pages: [] };
						route.layout.component = project_relative;
						if (item.uses_layout !== undefined) route.layout.parent_id = item.uses_layout;
					} else {
						if (!route.leaf) route.leaf = { depth };
						route.leaf.component = project_relative;
						if (item.uses_layout !== undefined) route.leaf.parent_id = item.uses_layout;
					}
				} else if (item.is_layout) {
					if (!route.layout) route.layout = { depth, child_pages: [] };
					route.layout[item.kind] = project_relative;
				} else if (item.is_page) {
					if (!route.leaf) route.leaf = { depth };
					route.leaf[item.kind] = project_relative;
				} else {
					route.endpoint = {
						file: project_relative
					};
				}
			}

			// then handle children
			for (const file of files) {
				if (file.is_dir) {
					walk(depth + 1, path.posix.join(id, file.name), file.name, route);
				}
			}
		};

		walk(0, '/', '', null);

		if (routes.length === 1) {
			const root = routes[0];
			if (!root.leaf && !root.error && !root.layout && !root.endpoint) {
				throw new Error(
					// TODO adjust this error message for 1.0
					// 'No routes found. If you are using a custom src/routes directory, make sure it is specified in svelte.config.js'
					'The filesystem router API has changed, see https://github.com/sveltejs/kit/discussions/5774 for details'
				);
			}
		}
	} else {
		// If there's no routes directory, we'll just create a single empty route. This ensures the root layout and
		// error components are included in the manifest, which is needed for subsequent build/dev commands to work
		routes.push({
			id: '/',
			segment: '',
			pattern: /^$/,
			names: [],
			types: [],
			parent: null,
			layout: null,
			error: null,
			leaf: null,
			page: null,
			endpoint: null
		});
	}

	prevent_conflicts(routes);

	const root = routes[0];

	if (!root.layout?.component) {
		if (!root.layout) root.layout = { depth: 0, child_pages: [] };
		root.layout.component = posixify(path.relative(cwd, `${fallback}/layout.svelte`));
	}

	if (!root.error?.component) {
		if (!root.error) root.error = { depth: 0 };
		root.error.component = posixify(path.relative(cwd, `${fallback}/error.svelte`));
	}

	// we do layouts/errors first as they are more likely to be reused,
	// and smaller indexes take fewer bytes. also, this guarantees that
	// the default error/layout are 0/1
	for (const route of routes) {
		if (route.layout) nodes.push(route.layout);
		if (route.error) nodes.push(route.error);
	}

	for (const route of routes) {
		if (route.leaf) nodes.push(route.leaf);
	}

	const indexes = new Map(nodes.map((node, i) => [node, i]));

	for (const route of routes) {
		if (!route.leaf) continue;

		route.page = {
			layouts: [],
			errors: [],
			leaf: /** @type {number} */ (indexes.get(route.leaf))
		};

		/** @type {import('types').RouteData | null} */
		let current_route = route;
		let current_node = route.leaf;
		let parent_id = route.leaf.parent_id;

		while (current_route) {
			if (parent_id === undefined || current_route.segment === parent_id) {
				if (current_route.layout || current_route.error) {
					route.page.layouts.unshift(
						current_route.layout ? indexes.get(current_route.layout) : undefined
					);
					route.page.errors.unshift(
						current_route.error ? indexes.get(current_route.error) : undefined
					);
				}

				if (current_route.layout) {
					/** @type {import('types').PageNode[]} */ (current_route.layout.child_pages).push(
						route.leaf
					);
					current_node.parent = current_node = current_route.layout;
					parent_id = current_node.parent_id;
				} else {
					parent_id = undefined;
				}
			}

			current_route = current_route.parent;
		}

		if (parent_id !== undefined) {
			throw new Error(`${current_node.component} references missing segment "${parent_id}"`);
		}
	}

	return {
		nodes,
		routes: sort_routes(routes)
	};
}

/**
 * @param {string} project_relative
 * @param {string} file
 * @param {string[]} component_extensions
 * @param {string[]} module_extensions
 * @returns {import('./types').RouteFile}
 */
function analyze(project_relative, file, component_extensions, module_extensions) {
	const component_extension = component_extensions.find((ext) => file.endsWith(ext));
	if (component_extension) {
		const name = file.slice(0, -component_extension.length);
		const pattern = /^\+(?:(page(?:@(.*))?)|(layout(?:@(.*))?)|(error))$/;
		const match = pattern.exec(name);
		if (!match) {
			// TODO remove for 1.0
			if (/^\+layout-/.test(name)) {
				throw new Error(
					`${project_relative} should be reimplemented with layout groups: https://kit.svelte.dev/docs/advanced-routing#advanced-layouts`
				);
			}

			throw new Error(`Files prefixed with + are reserved (saw ${project_relative})`);
		}

		return {
			kind: 'component',
			is_page: !!match[1],
			is_layout: !!match[3],
			is_error: !!match[5],
			uses_layout: match[2] ?? match[4]
		};
	}

	const module_extension = module_extensions.find((ext) => file.endsWith(ext));
	if (module_extension) {
		const name = file.slice(0, -module_extension.length);
		const pattern =
			/^\+(?:(server)|(page(?:(@[a-zA-Z0-9_-]*))?(\.server)?)|(layout(?:(@[a-zA-Z0-9_-]*))?(\.server)?))$/;
		const match = pattern.exec(name);
		if (!match) {
			throw new Error(`Files prefixed with + are reserved (saw ${project_relative})`);
		} else if (match[3] || match[6]) {
			throw new Error(
				// prettier-ignore
				`Only Svelte files can reference named layouts. Remove '${match[3] || match[6]}' from ${file} (at ${project_relative})`
			);
		}

		const kind = !!(match[1] || match[4] || match[7]) ? 'server' : 'shared';

		return {
			kind,
			is_page: !!match[2],
			is_layout: !!match[5]
		};
	}

	throw new Error(`Files and directories prefixed with + are reserved (saw ${project_relative})`);
}

/** @param {string} dir */
function list_files(dir) {
	/** @type {string[]} */
	const files = [];

	/** @param {string} current */
	function walk(current) {
		for (const file of fs.readdirSync(path.resolve(dir, current))) {
			const child = path.posix.join(current, file);
			if (fs.statSync(path.resolve(dir, child)).isDirectory()) {
				walk(child);
			} else {
				files.push(child);
			}
		}
	}

	if (fs.existsSync(dir)) walk('');

	return files;
}

/**
 * @param {string} needle
 * @param {string} haystack
 */
function count_occurrences(needle, haystack) {
	let count = 0;
	for (let i = 0; i < haystack.length; i += 1) {
		if (haystack[i] === needle) count += 1;
	}
	return count;
}

/** @param {import('types').RouteData[]} routes */
function prevent_conflicts(routes) {
	/** @type {Map<string, string>} */
	const lookup = new Map();

	for (const route of routes) {
		if (!route.leaf && !route.endpoint) continue;

		const normalized = normalize_route_id(route.id);

		// find all permutations created by optional parameters
		const split = normalized.split(/<\?(.+?)\>/g);

		let permutations = [/** @type {string} */ (split[0])];

		// turn `x/[[optional]]/y` into `x/y` and `x/[required]/y`
		for (let i = 1; i < split.length; i += 2) {
			const matcher = split[i];
			const next = split[i + 1];

			permutations = [
				...permutations.map((x) => x + next),
				...permutations.map((x) => x + `<${matcher}>${next}`)
			];
		}

		for (const permutation of permutations) {
			// remove leading/trailing/duplicated slashes caused by prior
			// manipulation of optional parameters and (groups)
			const key = permutation
				.replace(/\/{2,}/, '/')
				.replace(/^\//, '')
				.replace(/\/$/, '');

			if (lookup.has(key)) {
				throw new Error(
					`The "${lookup.get(key)}" and "${route.id}" routes conflict with each other`
				);
			}

			lookup.set(key, route.id);
		}
	}
}

/** @param {string} id */
function normalize_route_id(id) {
	return (
		id
			// remove groups
			.replace(/(?<=^|\/)\(.+?\)(?=$|\/)/g, '')

			// replace `[param]` with `<*>`, `[param=x]` with `<x>`, and `[[param]]` with `<?*>`
			.replace(
				/\[(?:(\[)|(\.\.\.))?.+?(=.+?)?\]\]?/g,
				(_, optional, rest, matcher) => `<${optional ? '?' : ''}${rest ?? ''}${matcher ?? '*'}>`
			)
	);
}
