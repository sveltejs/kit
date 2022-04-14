import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { get_runtime_path } from '../../utils.js';
import { posixify } from '../../../utils/filesystem.js';
import { parse_route_id } from '../../../utils/routing.js';

/**
 * A portion of a file or directory name where the name has been split into
 * static and dynamic parts
 * @typedef {{
 *   content: string;
 *   dynamic: boolean;
 *   rest: boolean;
 *   type: string | null;
 * }} Part
 */

/**
 * A route, consisting of an endpoint module and/or an array of components
 * (n layouts and one leaf) for successful navigations and an array of
 * n error components to render if navigation fails
 * @typedef {{
 *   id: string;
 *   pattern: RegExp;
 *   segments: Part[][];
 *   page?: {
 *     a: Array<string | undefined>;
 *     b: Array<string | undefined>;
 *   };
 *   endpoint?: string;
 * }} Unit
 */

/**
 * @typedef {{
 *   error: string | undefined;
 *   layouts: Record<string, { file: string, name: string }>
 * }} Node
 */

/**
 * @typedef {Map<string, Node>} Tree
 */

const layout_pattern = /^__layout(?:-([a-zA-Z0-9_-]+))?(?:@([a-zA-Z0-9_-]+))?$/;
const dunder_pattern = /(^|\/)__(?!tests?__)/; // forbid __-prefixed files/directories except __error, __layout[-...], __test__, __tests__

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
	fallback = `${get_runtime_path(config)}/components`,
	cwd = process.cwd()
}) {
	/** @type {import('types').RouteData[]} */
	const routes = [];

	/** @type {Map<string, Unit>} */
	const units = new Map();

	/** @type {Tree} */
	const tree = new Map();

	const default_layout = {
		file: posixify(path.relative(cwd, `${fallback}/layout.svelte`)),
		name: DEFAULT
	};

	// set default root layout/error
	tree.set('', {
		error: posixify(path.relative(cwd, `${fallback}/error.svelte`)),
		layouts: { [DEFAULT]: default_layout }
	});

	const routes_base = posixify(path.relative(cwd, config.kit.files.routes));
	const valid_extensions = [...config.extensions, ...config.kit.endpointExtensions];

	list_files(config.kit.files.routes).forEach((file) => {
		const extension = valid_extensions.find((ext) => file.endsWith(ext));
		if (!extension) return;

		const id = file
			.slice(0, -extension.length)
			.replace(/(?:^|\/)index((?:@[a-zA-Z0-9_-]+)?(?:\.[a-z]+)?)?$/, '$1');
		const project_relative = `${routes_base}/${file}`;

		const segments = id.split('/');
		const name = /** @type {string} */ (segments.pop());

		if (name === '__layout.reset') {
			throw new Error(
				'__layout.reset has been removed in favour of named layouts: https://kit.svelte.dev/docs/layouts#named-layouts'
			);
		}

		if (name === '__error' || layout_pattern.test(name)) {
			const dir = segments.join('/');

			if (!tree.has(dir)) {
				tree.set(dir, {
					error: undefined,
					layouts: {}
				});
			}

			const group = /** @type {Node} */ (tree.get(dir));

			if (name === '__error') {
				group.error = project_relative;
			} else {
				const match = /** @type {RegExpMatchArray} */ (layout_pattern.exec(name));

				if (match[1] === DEFAULT) {
					throw new Error(`${project_relative} cannot use reserved "${DEFAULT}" name`);
				}

				const layout_id = match[1] || DEFAULT;

				const defined = group.layouts[layout_id];
				if (defined && defined !== default_layout) {
					throw new Error(
						`Duplicate layout ${project_relative} already defined at ${defined.file}`
					);
				}

				group.layouts[layout_id] = {
					file: project_relative,
					name
				};
			}

			return;
		} else if (dunder_pattern.test(file)) {
			throw new Error(
				`Files and directories prefixed with __ are reserved (saw ${project_relative})`
			);
		}

		if (!config.kit.routes(file)) return;

		if (/\]\[/.test(id)) {
			throw new Error(`Invalid route ${project_relative} — parameters must be separated`);
		}

		if (count_occurrences('[', id) !== count_occurrences(']', id)) {
			throw new Error(`Invalid route ${project_relative} — brackets are unbalanced`);
		}

		if (!units.has(id)) {
			units.set(id, {
				id,
				pattern: parse_route_id(id).pattern,
				segments: id
					.split('/')
					.filter(Boolean)
					.map((segment) => {
						/** @type {Part[]} */
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
					}),
				page: undefined,
				endpoint: undefined
			});
		}

		const unit = /** @type {Unit} */ (units.get(id));

		if (config.extensions.find((ext) => file.endsWith(ext))) {
			const { layouts, errors } = trace(project_relative, file, tree, config.extensions);
			unit.page = {
				a: layouts.concat(project_relative),
				b: errors
			};
		} else {
			unit.endpoint = project_relative;
		}
	});

	/** @type {string[]} */
	const components = [];

	tree.forEach(({ layouts, error }) => {
		// we do [default, error, ...other_layouts] so that components[0] and [1]
		// are the root layout/error. kinda janky, there's probably a nicer way
		if (layouts[DEFAULT]) {
			components.push(layouts[DEFAULT].file);
		}

		if (error) {
			components.push(error);
		}

		for (const id in layouts) {
			if (id !== DEFAULT) components.push(layouts[id].file);
		}
	});

	units.forEach((unit) => {
		if (unit.page) {
			const leaf = /** @type {string} */ (unit.page.a[unit.page.a.length - 1]);
			components.push(leaf);
		}
	});

	Array.from(units.values())
		.sort(compare)
		.forEach((unit) => {
			// TODO when we introduce layout endpoints and scoped middlewares, we
			// will probably want to have a single unified route type here
			// (created in the list_files(...).forEach(...) callback)
			if (unit.page) {
				routes.push({
					type: 'page',
					id: unit.id,
					pattern: unit.pattern,
					path: unit.id.includes('[') ? '' : `/${unit.id.replace(/@(?:[a-zA-Z0-9_-]+)/g, '')}`,
					shadow: unit.endpoint || null,
					a: unit.page.a,
					b: unit.page.b
				});
			} else if (unit.endpoint) {
				routes.push({
					type: 'endpoint',
					id: unit.id,
					pattern: unit.pattern,
					file: unit.endpoint
				});
			}
		});

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
			const type = file.slice(0, -ext.length);

			if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(type)) {
				matchers[type] = path.join(params_base, file);
			} else {
				throw new Error(
					`Matcher names must match /^[a-zA-Z_][a-zA-Z0-9_]*$/ — "${file}" is invalid`
				);
			}
		}
	}

	return {
		assets,
		components,
		routes,
		matchers
	};
}

/**
 * @param {string} file
 * @param {string} path
 * @param {Tree} tree
 * @param {string[]} extensions
 */
function trace(file, path, tree, extensions) {
	/** @type {Array<string | undefined>} */
	const layouts = [];

	/** @type {Array<string | undefined>} */
	const errors = [];

	const parts = path.split('/');
	const filename = /** @type {string} */ (parts.pop());
	const extension = /** @type {string} */ (extensions.find((ext) => path.endsWith(ext)));
	const base = filename.slice(0, -extension.length);

	let layout_id = base.includes('@') ? base.split('@')[1] : DEFAULT;

	// walk up the tree, find which __layout and __error components
	// apply to this page
	// eslint-disable-next-line
	while (true) {
		const node = tree.get(parts.join('/'));
		const layout = node?.layouts[layout_id];

		// any segment that has neither a __layout nor an __error can be discarded.
		// in other words these...
		//  layouts: [a, , b, c]
		//  errors:  [d, , e,  ]
		//
		// ...can be compacted to these:
		//  layouts: [a, b, c]
		//  errors:  [d, e,  ]
		if (node?.error || layout?.file) {
			errors.unshift(node?.error);
			layouts.unshift(layout?.file);
		}

		if (layout?.name.includes('@')) {
			layout_id = layout.name.split('@')[1];
		} else {
			if (layout) layout_id = DEFAULT;
			if (parts.length === 0) break;
			parts.pop();
		}
	}

	if (layout_id !== DEFAULT) {
		throw new Error(`${file} references missing layout "${layout_id}"`);
	}

	// trim empty space off the end of the errors array
	let i = errors.length;
	while (i--) if (errors[i]) break;
	errors.length = i + 1;

	return { layouts, errors };
}

/**
 * @param {Unit} a
 * @param {Unit} b
 */
function compare(a, b) {
	const max_segments = Math.max(a.segments.length, b.segments.length);
	for (let i = 0; i < max_segments; i += 1) {
		const sa = a.segments[i];
		const sb = b.segments[i];

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

	const a_is_endpoint = !a.page && a.endpoint;
	const b_is_endpoint = !b.page && b.endpoint;

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
	fs.readdirSync(dir, { withFileTypes: true })
		.sort(({ name: a }, { name: b }) => {
			// sort each directory in (__layout, __error, everything else) order
			// so that we can trace layouts/errors immediately

			if (a.startsWith('__layout')) {
				if (!b.startsWith('__layout')) return -1;
			} else if (b.startsWith('__layout')) {
				return 1;
			} else if (a.startsWith('__')) {
				if (!b.startsWith('__')) return -1;
			} else if (b.startsWith('__')) {
				return 1;
			}

			return a < b ? -1 : 1;
		})
		.forEach((file) => {
			const joined = path ? `${path}/${file.name}` : file.name;

			if (file.isDirectory()) {
				list_files(`${dir}/${file.name}`, joined, files);
			} else {
				files.push(joined);
			}
		});

	return files;
}
