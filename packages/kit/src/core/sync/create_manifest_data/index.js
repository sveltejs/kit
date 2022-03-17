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
 */

const specials = new Set(['__layout', '__layout.reset', '__error']);

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
	/**
	 * @param {string} file_name
	 * @param {string} dir
	 */
	function find_layout(file_name, dir) {
		const files = config.extensions.map((ext) => posixify(path.join(dir, `${file_name}${ext}`)));
		return files.find((file) => fs.existsSync(path.resolve(cwd, file)));
	}

	/** @type {string[]} */
	const components = [];

	/** @type {import('types').RouteData[]} */
	const routes = [];

	const default_layout = posixify(path.relative(cwd, `${fallback}/layout.svelte`));
	const default_error = posixify(path.relative(cwd, `${fallback}/error.svelte`));

	/**
	 * @param {string} dir
	 * @param {string[]} parent_id
	 * @param {Array<string|undefined>} layout_stack // accumulated __layout.svelte components
	 * @param {Array<string|undefined>} error_stack // accumulated __error.svelte components
	 */
	function walk(dir, parent_id, layout_stack, error_stack) {
		/** @type {Item[]} */
		const items = [];

		fs.readdirSync(dir).forEach((basename) => {
			const resolved = path.join(dir, basename);
			const file = posixify(path.relative(cwd, resolved));
			const is_dir = fs.statSync(resolved).isDirectory();

			const ext = is_dir
				? ''
				: config.extensions.find((ext) => basename.endsWith(ext)) ||
				  config.kit.endpointExtensions.find((ext) => basename.endsWith(ext));

			if (ext === undefined) return;

			const name = basename.slice(0, basename.length - ext.length);

			if (name.startsWith('__') && !specials.has(name)) {
				throw new Error(`Files and directories prefixed with __ are reserved (saw ${file})`);
			}

			if (!config.kit.routes(file)) return;

			items.push({
				file,
				name,
				parts: get_parts(name, file),
				route_suffix: basename.slice(basename.indexOf('.'), -ext.length),
				is_dir,
				is_index: !is_dir && basename.startsWith('index.'),
				is_page: config.extensions.includes(ext)
			});
		});

		items.sort(comparator);

		items.forEach((item) => {
			const id_parts = parent_id.slice();

			if (item.is_index) {
				if (item.route_suffix && id_parts.length > 0) {
					id_parts[id_parts.length - 1] += item.route_suffix;
				}
			} else {
				id_parts.push(item.name);
			}

			if (item.is_dir) {
				const layout_reset = find_layout('__layout.reset', item.file);
				const layout = find_layout('__layout', item.file);
				const error = find_layout('__error', item.file);

				if (layout_reset && layout) {
					throw new Error(`Cannot have __layout next to __layout.reset: ${layout_reset}`);
				}

				if (layout_reset) components.push(layout_reset);
				if (layout) components.push(layout);
				if (error) components.push(error);

				walk(
					path.join(dir, item.name),
					id_parts,
					layout_reset ? [layout_reset] : layout_stack.concat(layout),
					layout_reset ? [error] : error_stack.concat(error)
				);
			} else {
				const id = id_parts.join('/');
				const { pattern } = parse_route_id(id);

				if (item.is_page) {
					components.push(item.file);

					const concatenated = layout_stack.concat(item.file);
					const errors = error_stack.slice();

					let i = concatenated.length;
					while (i--) {
						if (!errors[i] && !concatenated[i]) {
							errors.splice(i, 1);
							concatenated.splice(i, 1);
						}
					}

					i = errors.length;
					while (i--) {
						if (errors[i]) break;
					}

					errors.splice(i + 1);

					const path = id.includes('[') ? '' : `/${id}`;

					routes.push({
						type: 'page',
						id,
						pattern,
						path,
						shadow: null,
						a: /** @type {string[]} */ (concatenated),
						b: /** @type {string[]} */ (errors)
					});
				} else {
					routes.push({
						type: 'endpoint',
						id,
						pattern,
						file: item.file
					});
				}
			}
		});
	}

	const routes_base = path.relative(cwd, config.kit.files.routes);

	const layout = find_layout('__layout', routes_base) || default_layout;
	const error = find_layout('__error', routes_base) || default_error;

	components.push(layout, error);

	walk(config.kit.files.routes, [], [layout], [error]);

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

	const assets = fs.existsSync(config.kit.files.assets)
		? list_files({ config, dir: config.kit.files.assets, path: '' })
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
		layout,
		error,
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

const spread_pattern = /\[\.{3}/;

/**
 * @param {Item} a
 * @param {Item} b
 */
function comparator(a, b) {
	if (a.is_index !== b.is_index) {
		if (a.is_index) return spread_pattern.test(a.file) ? 1 : -1;
		return spread_pattern.test(b.file) ? -1 : 1;
	}

	const max = Math.max(a.parts.length, b.parts.length);

	for (let i = 0; i < max; i += 1) {
		const a_sub_part = a.parts[i];
		const b_sub_part = b.parts[i];

		if (!a_sub_part) return 1; // b is more specific, so goes first
		if (!b_sub_part) return -1;

		if (a_sub_part.rest && b_sub_part.rest) {
			if (a.is_page !== b.is_page) {
				return a.is_page ? 1 : -1;
			}
			// sort alphabetically
			return a_sub_part.content < b_sub_part.content ? -1 : 1;
		}

		// If one is ...rest order it later
		if (a_sub_part.rest !== b_sub_part.rest) return a_sub_part.rest ? 1 : -1;

		if (a_sub_part.dynamic !== b_sub_part.dynamic) {
			return a_sub_part.dynamic ? 1 : -1;
		}

		if (a_sub_part.dynamic && !!a_sub_part.type !== !!b_sub_part.type) {
			return a_sub_part.type ? -1 : 1;
		}

		if (!a_sub_part.dynamic && a_sub_part.content !== b_sub_part.content) {
			return (
				b_sub_part.content.length - a_sub_part.content.length ||
				(a_sub_part.content < b_sub_part.content ? -1 : 1)
			);
		}
	}

	if (a.is_page !== b.is_page) {
		return a.is_page ? 1 : -1;
	}

	// otherwise sort alphabetically
	return a.file < b.file ? -1 : 1;
}

/**
 * @param {string} part
 * @param {string} file
 */
function get_parts(part, file) {
	if (/\]\[/.test(part)) {
		throw new Error(`Invalid route ${file} — parameters must be separated`);
	}

	if (count_occurrences('[', part) !== count_occurrences(']', part)) {
		throw new Error(`Invalid route ${file} — brackets are unbalanced`);
	}

	/** @type {Part[]} */
	const result = [];
	part.split(/\[(.+?\(.+?\)|.+?)\]/).map((str, i) => {
		if (!str) return;
		const dynamic = i % 2 === 1;

		const [, content, type] = dynamic
			? /^((?:\.\.\.)?[a-zA-Z_][a-zA-Z0-9_]*)(?:=([a-zA-Z_][a-zA-Z0-9_]*))?$/.exec(str) || [
					null,
					null,
					null
			  ]
			: [null, str, null];

		if (!content) {
			throw new Error(
				`Invalid route ${file} — parameter name and type must match /^[a-zA-Z_][a-zA-Z0-9_]*$/`
			);
		}

		result.push({
			content,
			dynamic,
			rest: dynamic && /^\.{3}.+$/.test(content),
			type
		});
	});

	return result;
}

/**
 * @param {{
 *  config: import('types').ValidatedConfig;
 * 	dir: string;
 * 	path: string;
 * 	files?: import('types').Asset[]
 * }} args
 */
function list_files({ config, dir, path, files = [] }) {
	fs.readdirSync(dir).forEach((file) => {
		const full = `${dir}/${file}`;

		const stats = fs.statSync(full);
		const joined = path ? `${path}/${file}` : file;

		if (stats.isDirectory()) {
			list_files({ config, dir: full, path: joined, files });
		} else if (config.kit.serviceWorker.files(joined)) {
			files.push({
				file: joined,
				size: stats.size,
				type: mime.getType(joined)
			});
		}
	});

	return files;
}
