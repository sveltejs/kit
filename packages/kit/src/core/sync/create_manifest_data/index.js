import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { runtime_directory } from '../../utils.js';
import { posixify } from '../../../utils/filesystem.js';
import { parse_route_id } from '../../../utils/routing.js';

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
	/** @type {Map<string, import('types').RouteData>} */
	const route_map = new Map();

	/** @type {Map<string, import('./types').Part[][]>} */
	const segment_map = new Map();

	const routes_base = posixify(path.relative(cwd, config.kit.files.routes));

	if (fs.existsSync(config.kit.files.routes)) {
		/**
		 * @param {string} id
		 * @param {string} segment
		 * @param {import('types').RouteData | null} parent
		 */
		const walk = (id, segment, parent) => {
			const { pattern, names, types } = parse_route_id(id);

			const segments = id.split('/');

			segment_map.set(
				id,
				segments.filter(Boolean).map((segment) => {
					/** @type {import('./types').Part[]} */
					const parts = [];
					segment.split(/\[(.+?)\]/).map((content, i) => {
						const dynamic = !!(i % 2);

						if (!content) return;

						parts.push({
							content,
							dynamic,
							rest: dynamic && content.startsWith('...'),
							type: (dynamic && content.split('=')[1]) || null
						});
					});
					return parts;
				})
			);

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
			route_map.set(id, route);

			// if we don't do this, the route map becomes unwieldy to console.log
			Object.defineProperty(route, 'parent', { enumerable: false });

			const dir = path.join(cwd, routes_base, id);

			const files = fs.readdirSync(dir, {
				withFileTypes: true
			});

			// process files first
			for (const file of files) {
				if (file.isDirectory()) continue;
				if (!file.name.startsWith('+')) continue;

				const project_relative = path.relative(cwd, path.join(dir, file.name));

				const item = analyze(
					project_relative,
					file.name,
					config.extensions,
					config.kit.moduleExtensions
				);

				if (item.kind === 'component') {
					if (item.is_error) {
						route.error = {
							component: project_relative
						};
					} else if (item.is_layout) {
						if (!route.layout) route.layout = {};
						route.layout.component = project_relative;
						if (item.uses_layout) route.layout.parent_id = item.uses_layout;
					} else {
						if (!route.leaf) route.leaf = {};
						route.leaf.component = project_relative;
						if (item.uses_layout) route.leaf.parent_id = item.uses_layout;
					}
				} else if (item.is_layout) {
					if (!route.layout) route.layout = {};
					route.layout[item.kind] = project_relative;
				} else {
					if (!route.leaf) route.leaf = {};
					route.leaf[item.kind] = project_relative;
				}
			}

			// then handle children
			for (const file of files) {
				if (file.isDirectory()) {
					walk(path.join(id, file.name), file.name, route);
				}
			}
		};

		walk('', '', null);

		// TODO remove for 1.0
		if (route_map.size === 0) {
			throw new Error(
				'The filesystem router API has changed, see https://github.com/sveltejs/kit/discussions/5774 for details'
			);
		}
	}

	/** @type {import('types').PageNode[]} */
	const nodes = [];

	/** @type {Map<string, string>} */
	const conflicts = new Map();

	const root = /** @type {import('types').RouteData} */ (route_map.get(''));

	if (!root.layout?.component) {
		if (!root.layout) root.layout = {};
		root.layout.component = posixify(path.relative(cwd, `${fallback}/layout.svelte`));
	}

	if (!root.error?.component) {
		if (!root.error) root.error = {};
		root.error.component = posixify(path.relative(cwd, `${fallback}/error.svelte`));
	}

	route_map.forEach((route) => {
		const normalized = route.id
			.split('/')
			.filter((segment) => !/^\([^)]+\)$/.test(segment))
			.join('/');

		if (conflicts.has(normalized)) {
			throw new Error(`${conflicts.get(normalized)} and ${route.id} occupy the same route`);
		}

		conflicts.set(normalized, route.id);

		if (route.layout) nodes.push(route.layout);
		if (route.error) nodes.push(route.error);
		if (route.leaf) nodes.push(route.leaf);
	});

	const indexes = new Map(nodes.map((node, i) => [node, i]));

	route_map.forEach((route) => {
		if (!route.leaf) return;

		if (route.leaf && route.endpoint) {
			// TODO possibly relax this https://github.com/sveltejs/kit/issues/5896
			throw new Error(`${route.endpoint.file} cannot share a directory with other route files`);
		}

		route.page = {
			layouts: [],
			errors: [],
			leaf: /** @type {number} */ (indexes.get(route.leaf))
		};

		/** @type {import('types').RouteData | null} */
		let current = route;
		let parent_id = route.leaf.parent_id;

		while (current) {
			if (parent_id === undefined || current.segment === parent_id) {
				if (current.layout || current.error) {
					route.page.layouts.unshift(current.layout ? indexes.get(current.layout) : undefined);
					route.page.errors.unshift(current.error ? indexes.get(current.error) : undefined);
				}

				parent_id = current.layout?.parent_id;
			}

			current = current.parent;
		}

		if (parent_id !== undefined) {
			throw new Error(`${route.leaf} references missing segment "${parent_id}"`);
		}
	});

	const routes = Array.from(route_map.values()).sort((a, b) => compare(a, b, segment_map));

	/** @type {import('types').Asset[]} */
	const assets = list_files(config.kit.files.assets).map((file) => ({
		file,
		size: fs.statSync(path.resolve(config.kit.files.assets, file)).size,
		type: mime.getType(file)
	}));

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

	return {
		assets,
		nodes,
		routes,
		matchers
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
		const pattern = /^\+(?:(page(?:@([a-zA-Z0-9_-]*))?)|(layout(?:@([a-zA-Z0-9_-]*))?)|(error))$/;
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
			uses_layout: match[2] || match[5]
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

/**
 * @param {import('types').RouteData} a
 * @param {import('types').RouteData} b
 * @param {Map<string, import('./types').Part[][]>} segment_map
 */
function compare(a, b, segment_map) {
	const a_segments = /** @type {import('./types').Part[][]} */ (segment_map.get(a.id));
	const b_segments = /** @type {import('./types').Part[][]} */ (segment_map.get(b.id));

	const max_segments = Math.max(a_segments.length, b_segments.length);
	for (let i = 0; i < max_segments; i += 1) {
		const sa = a_segments[i];
		const sb = b_segments[i];

		// /x < /x/y, but /[...x]/y < /[...x]
		if (!sa) return a.id.includes('[...') ? +1 : -1;
		if (!sb) return b.id.includes('[...') ? -1 : +1;

		const max_parts = Math.max(sa.length, sb.length);
		for (let i = 0; i < max_parts; i += 1) {
			const pa = sa[i];
			const pb = sb[i];

			// xy < x[y], but [x].json < [x]
			if (pa === undefined) return pb.dynamic ? -1 : +1;
			if (pb === undefined) return pa.dynamic ? +1 : -1;

			// x < [x]
			if (pa.dynamic !== pb.dynamic) {
				return pa.dynamic ? +1 : -1;
			}

			if (pa.dynamic) {
				// [x] < [...x]
				if (pa.rest !== pb.rest) {
					return pa.rest ? +1 : -1;
				}

				// [x=type] < [x]
				if (!!pa.type !== !!pb.type) {
					return pa.type ? -1 : +1;
				}
			}
		}
	}

	if (!!a.endpoint !== !!b.endpoint) {
		return a.endpoint ? -1 : +1;
	}

	return a < b ? -1 : 1;
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
