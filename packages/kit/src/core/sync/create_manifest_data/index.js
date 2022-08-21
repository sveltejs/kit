import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { runtime_directory } from '../../utils.js';
import { posixify } from '../../../utils/filesystem.js';
import { parse_route_id } from '../../../utils/routing.js';

const DEFAULT = 'default';

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

	/** @type {import('./types').RouteTree} */
	const tree = new Map();

	const default_layout = {
		component: posixify(path.relative(cwd, `${fallback}/layout.svelte`))
	};

	// set default root layout/error
	tree.set('', {
		error: {
			component: posixify(path.relative(cwd, `${fallback}/error.svelte`))
		},
		layouts: { [DEFAULT]: default_layout }
	});

	/** @param {string} id */
	function tree_node(id) {
		if (!tree.has(id)) {
			tree.set(id, {
				error: undefined,
				layouts: {}
			});
		}

		return /** @type {import('./types').RouteTreeNode} */ (tree.get(id));
	}

	const routes_base = posixify(path.relative(cwd, config.kit.files.routes));
	const valid_extensions = [...config.extensions, ...config.kit.moduleExtensions];

	if (fs.existsSync(config.kit.files.routes)) {
		list_files(config.kit.files.routes).forEach((filepath) => {
			const extension = valid_extensions.find((ext) => filepath.endsWith(ext));
			if (!extension) return;

			const project_relative = `${routes_base}/${filepath}`;
			const segments = filepath.split('/');
			const file = /** @type {string} */ (segments.pop());

			if (file[0] !== '+') return; // not a route file

			const item = analyze(project_relative, file, config.extensions, config.kit.moduleExtensions);
			const id = segments.join('/');

			if (/\]\[/.test(id)) {
				throw new Error(`Invalid route ${project_relative} — parameters must be separated`);
			}

			if (count_occurrences('[', id) !== count_occurrences(']', id)) {
				throw new Error(`Invalid route ${project_relative} — brackets are unbalanced`);
			}

			// error/layout files should be added to the tree, but don't result
			// in a route being created, so deal with them first. note: we are
			// relying on the fact that the +error and +layout files precede
			// +page files alphabetically, and will therefore be processes
			// before we reach the page
			if (item.kind === 'component' && item.is_error) {
				tree_node(id).error = {
					component: project_relative
				};

				return;
			}

			if (item.is_layout) {
				if (item.declares_layout === DEFAULT) {
					throw new Error(`${project_relative} cannot use reserved "${DEFAULT}" name`);
				}

				const layout_id = item.declares_layout || DEFAULT;

				const group = tree_node(id);

				const defined = group.layouts[layout_id] || (group.layouts[layout_id] = {});

				if (defined[item.kind] && layout_id !== DEFAULT) {
					// edge case
					throw new Error(
						`Duplicate layout ${project_relative} already defined at ${defined[item.kind]}`
					);
				}

				defined[item.kind] = project_relative;

				return;
			}

			const type = item.kind === 'server' && !item.is_layout && !item.is_page ? 'endpoint' : 'page';

			if (type === 'endpoint' && route_map.has(id)) {
				// note that we are relying on +server being lexically ordered after
				// all other route files — if we added +view or something this is
				// potentially brittle, since the server might be added before
				// another route file. a problem for another day
				throw new Error(
					`${file} cannot share a directory with other route files (${project_relative})`
				);
			}

			if (!route_map.has(id)) {
				const pattern = parse_route_id(id).pattern;

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

				if (type === 'endpoint') {
					route_map.set(id, {
						type,
						id,
						pattern,
						file: project_relative
					});
				} else {
					route_map.set(id, {
						type,
						id,
						pattern,
						errors: [],
						layouts: [],
						leaf: {}
					});
				}
			}

			if (item.is_page) {
				const route = /** @type {import('types').PageData} */ (route_map.get(id));

				// This ensures that layouts and errors are set for pages that have no Svelte file
				// and only redirect or throw an error, but are set to the Svelte file definition if it exists.
				// This ensures the proper error page is used and rendered in the proper layout.
				if (item.kind === 'component' || route.layouts.length === 0) {
					const { layouts, errors } = trace(
						tree,
						id,
						item.kind === 'component' ? item.uses_layout : undefined,
						project_relative
					);
					route.layouts = layouts;
					route.errors = errors;
				}

				if (item.kind === 'component') {
					route.leaf.component = project_relative;
				} else if (item.kind === 'server') {
					route.leaf.server = project_relative;
				} else {
					route.leaf.shared = project_relative;
				}
			}
		});

		// TODO remove for 1.0
		if (route_map.size === 0) {
			throw new Error(
				'The filesystem router API has changed, see https://github.com/sveltejs/kit/discussions/5774 for details'
			);
		}
	}

	/** @type {import('types').PageNode[]} */
	const nodes = [];

	tree.forEach(({ layouts, error }) => {
		// we do [default, error, ...other_layouts] so that components[0] and [1]
		// are the root layout/error. kinda janky, there's probably a nicer way
		if (layouts[DEFAULT]) {
			nodes.push(layouts[DEFAULT]);
		}

		if (error) {
			nodes.push(error);
		}

		for (const id in layouts) {
			if (id !== DEFAULT) {
				nodes.push(layouts[id]);
			}
		}
	});

	route_map.forEach((route) => {
		if (route.type === 'page') {
			nodes.push(route.leaf);
		}
	});

	const routes = Array.from(route_map.values()).sort((a, b) => compare(a, b, segment_map));

	/** @type {import('types').Asset[]} */
	const assets = fs.existsSync(config.kit.files.assets)
		? list_files(config.kit.files.assets).map((file) => ({
				file,
				size: fs.statSync(`${config.kit.files.assets}/${file}`).size,
				type: mime.getType(file)
		  }))
		: [];

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
		const pattern =
			/^\+(?:(page(?:@([a-zA-Z0-9_-]+))?)|(layout(?:-([a-zA-Z0-9_-]+))?(?:@([a-zA-Z0-9_-]+))?)|(error))$/;
		const match = pattern.exec(name);
		if (!match) {
			throw new Error(`Files prefixed with + are reserved (saw ${project_relative})`);
		}

		return {
			kind: 'component',
			is_page: !!match[1],
			is_layout: !!match[3],
			is_error: !!match[6],
			uses_layout: match[2] || match[5],
			declares_layout: match[4]
		};
	}

	const module_extension = module_extensions.find((ext) => file.endsWith(ext));
	if (module_extension) {
		const name = file.slice(0, -module_extension.length);
		const pattern =
			/^\+(?:(server)|(page(?:@([a-zA-Z0-9_-]+))?(\.server)?)|(layout(?:-([a-zA-Z0-9_-]+))?(?:@([a-zA-Z0-9_-]+))?(\.server)?))$/;
		const match = pattern.exec(name);
		if (!match) {
			throw new Error(`Files prefixed with + are reserved (saw ${project_relative})`);
		} else if (match[3] || match[7]) {
			throw new Error(
				// prettier-ignore
				`Only Svelte files can reference named layouts. Remove '@${match[3] || match[7]}' from ${file} (at ${project_relative})`
			);
		}

		const kind = !!(match[1] || match[4] || match[8]) ? 'server' : 'shared';

		return {
			kind,
			is_page: !!match[2],
			is_layout: !!match[5],
			declares_layout: match[6]
		};
	}

	throw new Error(`Files and directories prefixed with + are reserved (saw ${project_relative})`);
}

/**
 * @param {import('./types').RouteTree} tree
 * @param {string} id
 * @param {string} layout_id
 * @param {string} project_relative
 */
function trace(tree, id, layout_id = DEFAULT, project_relative) {
	/** @type {Array<import('types').PageNode | undefined>} */
	const layouts = [];

	/** @type {Array<import('types').PageNode | undefined>} */
	const errors = [];

	const parts = id.split('/').filter(Boolean);

	// walk up the tree, find which +layout and +error components
	// apply to this page
	while (true) {
		const node = tree.get(parts.join('/'));
		const layout = node?.layouts[layout_id];

		if (layout && layouts.indexOf(layout) > -1) {
			// TODO this needs to be fixed for #5748
			throw new Error(
				`Recursive layout detected: ${layout.component} -> ${layouts
					.map((l) => l?.component)
					.join(' -> ')}`
			);
		}

		// any segment that has neither a +layout nor an +error can be discarded.
		// in other words these...
		//  layouts: [a, , b, c]
		//  errors:  [d, , e,  ]
		//
		// ...can be compacted to these:
		//  layouts: [a, b, c]
		//  errors:  [d, e,  ]
		if (node?.error || layout) {
			errors.unshift(node?.error);
			layouts.unshift(layout);
		}

		const parent_layout_id = layout?.component?.split('/').at(-1)?.split('@')[1]?.split('.')[0];

		if (parent_layout_id) {
			layout_id = parent_layout_id;
		} else {
			if (layout) layout_id = DEFAULT;
			if (parts.length === 0) break;
			parts.pop();
		}
	}

	if (layout_id !== DEFAULT) {
		throw new Error(`${project_relative} references missing layout "${layout_id}"`);
	}

	// trim empty space off the end of the errors array
	let i = errors.length;
	while (i--) if (errors[i]) break;
	errors.length = i + 1;

	return { layouts, errors };
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

	const a_is_endpoint = a.type === 'endpoint';
	const b_is_endpoint = b.type === 'endpoint';

	if (a_is_endpoint !== b_is_endpoint) {
		return a_is_endpoint ? -1 : +1;
	}

	return a < b ? -1 : 1;
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

/**
 * @param {string} dir
 * @param {string} [path]
 * @param {string[]} [files]
 */
function list_files(dir, path = '', files = []) {
	fs.readdirSync(dir)
		.sort((a, b) => {
			// sort each directory in (+layout, +error, everything else) order
			// so that we can trace layouts/errors immediately

			if (a.startsWith('+layout') || a.startsWith('+error')) {
				if (!b.startsWith('+layout') && !b.startsWith('+error')) return -1;
			} else if (b.startsWith('+layout') || b.startsWith('+error')) {
				return 1;
			} else if (a.startsWith('__')) {
				if (!b.startsWith('__')) return -1;
			} else if (b.startsWith('__')) {
				return 1;
			}

			return a < b ? -1 : 1;
		})
		.forEach((file) => {
			const full = `${dir}/${file}`;
			const stats = fs.statSync(full);
			const joined = path ? `${path}/${file}` : file;

			if (stats.isDirectory()) {
				list_files(full, joined, files);
			} else {
				files.push(joined);
			}
		});

	return files;
}
