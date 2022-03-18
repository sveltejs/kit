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
 * @typedef {{
 *   name: string;
 *   parts: Part[],
 *   file: string;
 *   is_dir: boolean;
 *   is_index: boolean;
 *   is_page: boolean;
 *   route_suffix: string
 * }} Item
 * @typedef {{
 *   parts: Part[];
 *   component?: string;
 *   module?: string;
 * }} Unit
 */

const layout_pattern = /^__layout(?:-([a-zA-Z0-9_-]+))?(?:@(~|[a-zA-Z0-9_-]+)?)?$/;

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

	const default_layout = posixify(path.relative(cwd, `${fallback}/layout.svelte`));
	const default_error = posixify(path.relative(cwd, `${fallback}/error.svelte`));

	const extensions = [...config.extensions, ...config.kit.endpointExtensions];

	/** @type {Array<{ id: string, file: string, segments: Part[][] }>} */
	const files = [];

	const tree = new Map();

	// set default root layout/error
	tree.set('', {
		error: default_error,
		layouts: {
			default: { file: default_layout }
		}
	});

	const routes_base = path.relative(cwd, config.kit.files.routes);

	list_files(config.kit.files.routes).forEach((file) => {
		const extension = extensions.find((ext) => file.endsWith(ext));
		if (!extension) return;

		const id = file.slice(0, -extension.length).replace(/\/?index(\.[a-z]+)?$/, '$1');
		const project_relative = `${routes_base}/${file}`;

		if (/(^|\/)__/.test(file)) {
			const segments = id.split('/');
			const name = /** @type {string} */ (segments.pop());

			if (name === '__error' || layout_pattern.test(name)) {
				const dir = segments.join('/');

				if (!tree.has(dir)) {
					tree.set(dir, {
						error: undefined,
						layouts: {}
					});
				}

				const group = tree.get(dir);

				if (name === '__error') {
					group.error = project_relative;
				} else {
					const match = /** @type {RegExpMatchArray} */ (layout_pattern.exec(name));
					const layout_id = match[1] || 'default';
					group.layouts[layout_id] = {
						file: project_relative,
						name
					};
				}

				return;
			}

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

		/** @type {Part[][]} */
		const segments = id
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
			});

		files.push({
			id,
			file,
			segments
		});
	});

	/** @type {string[]} */
	const components = [];

	tree.forEach(({ layouts, error }) => {
		// we do [default, error, ...other_layouts] so that components[0] and [1]
		// are the root layout/error. kinda janky, there's probably a nicer way
		if (layouts.default) {
			components.push(layouts.default.file);
		}

		if (error) {
			components.push(error);
		}

		for (const id in layouts) {
			if (id !== 'default') components.push(layouts[id].file);
		}
	});

	files.forEach((item) => {
		if (config.extensions.find((ext) => item.file.endsWith(ext))) {
			components.push(path.join(routes_base, item.file));
		}
	});

	/**
	 * @param {{ id: string, file: string, segments: Part[][] }} a
	 * @param {{ id: string, file: string, segments: Part[][] }} b
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

		const a_is_endpoint = config.kit.endpointExtensions.find((ext) => a.file.endsWith(ext));
		const b_is_endpoint = config.kit.endpointExtensions.find((ext) => b.file.endsWith(ext));

		if (a_is_endpoint !== b_is_endpoint) {
			return a_is_endpoint ? -1 : +1;
		}

		return a < b ? -1 : 1;
	}

	files.sort(compare);

	/** @param {string} file */
	function find_specials(file) {
		/** @type {Array<string | undefined>} */
		const layouts = [];

		/** @type {Array<string | undefined>} */
		const errors = [];

		const parts = file.split('/');
		const filename = /** @type {string} */ (parts.pop());
		const extension = /** @type {string} */ (config.extensions.find((ext) => file.endsWith(ext)));
		const base = filename.slice(0, -extension.length);

		let layout_id = base.includes('@') ? base.split('@')[1] : 'default';

		while (parts.length) {
			const dir = parts.join('/');

			const node = tree.get(dir);

			const layout = node?.layouts[layout_id];

			errors.unshift(node?.error);
			layouts.unshift(layout?.file);

			if (layout?.name.includes('@')) {
				layout_id = layout.name.split('@')[1];
			}

			const next_dir = /** @type {string} */ (parts.pop());

			if (next_dir.includes('@')) {
				layout_id = next_dir.split('@')[1];
			}
		}

		if (layout_id !== '') {
			const node = tree.get('');
			if (layout_id === '~') layout_id = 'default';
			errors.unshift(node.error);
			layouts.unshift(node.layouts[layout_id].file);
		}

		let i = layouts.length;
		while (i--) {
			if (!errors[i] && !layouts[i]) {
				errors.splice(i, 1);
				layouts.splice(i, 1);
			}
		}

		i = errors.length;
		while (i--) {
			if (errors[i]) break;
		}

		errors.splice(i + 1);
		return { layouts, errors };
	}

	files.forEach(({ id, file }) => {
		const { pattern } = parse_route_id(id);

		const is_page = config.extensions.find((ext) => file.endsWith(ext)); // TODO tidy up

		if (is_page) {
			const { layouts, errors } = find_specials(file);

			routes.push({
				type: 'page',
				id,
				pattern,
				path: id.includes('[') ? '' : `/${id.replace(/@(?:~|[a-zA-Z0-9_-]*)/g, '')}`,
				shadow: null,
				a: layouts.concat(path.join(routes_base, file)),
				b: errors
			});
		} else {
			routes.push({
				type: 'endpoint',
				id,
				pattern,
				file: path.join(routes_base, file)
			});
		}
	});

	const lookup = new Map();
	for (const route of routes) {
		if (route.type === 'page') {
			lookup.set(route.id, route);
		}
	}

	let i = routes.length;
	while (i--) {
		const route = routes[i];
		if (route.type === 'endpoint' && lookup.has(route.id)) {
			lookup.get(route.id).shadow = route.file;
			routes.splice(i, 1);
		}
	}

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
					`Validator names must match /^[a-zA-Z_][a-zA-Z0-9_]*$/ — "${file}" is invalid`
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
	fs.readdirSync(dir).forEach((file) => {
		const resolved = `${dir}/${file}`;

		const stats = fs.statSync(resolved);
		const joined = path ? `${path}/${file}` : file;

		if (stats.isDirectory()) {
			list_files(resolved, joined, files);
		} else {
			files.push(joined);
		}
	});

	return files;
}
