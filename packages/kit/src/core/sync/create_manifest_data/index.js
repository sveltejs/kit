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

const layout_pattern = /^__layout(?:-([a-zA-Z0-9_-]+)(?:#([a-zA-Z0-9_-]+))?)?$/;

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

	const routes_base = path.relative(cwd, config.kit.files.routes);

	/** @type {import('types').RouteData[]} */
	const routes = [];

	const default_layout = posixify(path.relative(cwd, `${fallback}/layout.svelte`));
	const default_error = posixify(path.relative(cwd, `${fallback}/error.svelte`));

	/** @type {string[]} */
	const components = [default_layout, default_error]; // TODO only add defaults if necessary

	const extensions = [...config.extensions, ...config.kit.endpointExtensions];

	/** @type {Array<{ id: string, file: string, segments: Part[][] }>} */
	const files = [];

	const special = new Map();

	list_files(config.kit.files.routes).forEach((file) => {
		const extension = extensions.find((ext) => file.endsWith(ext));
		if (!extension) return;

		const id = file.slice(0, -extension.length).replace(/\/?index$/, '');

		if (/(^|\/)__/.test(id)) {
			const segments = id.split('/');
			const name = /** @type {string} */ (segments.pop());

			if (name === '__error' || layout_pattern.test(name)) {
				if (config.extensions.includes(extension)) {
					components.push(path.join(routes_base, file));
				}

				const dir = segments.join('/');

				if (!special.has(dir)) {
					special.set(dir, {
						error: null,
						layouts: {}
					});
				}

				const group = special.get(dir);

				if (name === '__error') {
					group.error = file;
				} else {
					const match = /** @type {RegExpMatchArray} */ (layout_pattern.exec(name));
					const layout_id = match[1] || 'default';
					group.layouts[layout_id] = {
						file: path.join(routes_base, file),
						name
					};
				}

				return;
			}

			throw new Error(`Files and directories prefixed with __ are reserved (saw ${file})`);
		}

		if (!config.kit.routes(file)) return;

		if (config.extensions.includes(extension)) {
			components.push(path.join(routes_base, file));
		}

		/** @type {Part[][]} */
		const segments = [];

		id.split('/').forEach((segment) => {
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
			segments.push(parts);
		});

		return files.push({
			id,
			file,
			segments
		});
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

				if (pa === undefined) return -1;
				if (pb === undefined) return +1;

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

	/** @param {string} id */
	function find_specials(id) {
		/** @type {Array<string | undefined>} */
		const layouts = [];

		/** @type {Array<string | undefined>} */
		const errors = [];

		const parts = id.split('/');
		const base = /** @type {string} */ (parts.pop());

		let layout_id = base.includes('#') ? base.split('#')[1] : 'default';

		while (parts.length) {
			const dir = parts.join('/');

			const x = special.get(dir);

			const layout = x?.layouts[layout_id];

			errors.unshift(x?.error);
			layouts.unshift(layout?.file);

			if (layout?.name.includes('#')) {
				layout_id = layout.name.split('#')[1];
			}

			const next_dir = /** @type {string} */ (parts.pop());

			if (next_dir.includes('#')) {
				layout_id = next_dir.split('#')[1];
			}
		}

		const x = special.get('');
		errors.unshift(x?.error || default_error);

		if (layout_id === '') {
			layouts.unshift(default_layout);
		} else {
			if (layout_id === '~') layout_id = 'default';
			layouts.unshift(x?.layouts[layout_id]?.file || default_layout);
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
			const { layouts, errors } = find_specials(id);

			routes.push({
				type: 'page',
				id,
				pattern,
				path: id.includes('[') ? '' : `/${id.replace(/#(?:~|[a-zA-Z0-9_-]*)/g, '')}`,
				shadow: null,
				a: layouts.concat(path.join(routes_base, file)),
				b: errors
			});
		} else {
			routes.push({
				type: 'endpoint',
				id,
				pattern,
				file
			});
		}
	});

	// const layout = find_layout('__layout', routes_base) || default_layout;
	// const error = find_layout('__error', routes_base) || default_error;

	// components.push(layout, error);

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
	const assets = [];

	if (fs.existsSync(config.kit.files.assets)) {
		list_files(config.kit.files.assets).forEach((file) => {
			if (!config.kit.serviceWorker.files(file)) return null;
			assets.push({
				file,
				size: fs.statSync(`${config.kit.files.assets}/${file}`).size,
				type: mime.getType(file)
			});
		});
	}

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
