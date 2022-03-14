import fs from 'fs';
import path from 'path';
import mime from 'mime';
import { get_runtime_path } from '../../utils.js';
import { posixify } from '../../../utils/filesystem.js';

/**
 * A portion of a file or directory name where the name has been split into
 * static and dynamic parts
 * @typedef {{
 *   content: string;
 *   dynamic: boolean;
 *   rest: boolean;
 * }} Part
 * @typedef {{
 *   basename: string;
 *   name: string;
 *   ext: string;
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
	 * @param {string[]} parent_key
	 * @param {Part[][]} parent_segments
	 * @param {string[]} parent_params
	 * @param {Array<string|undefined>} layout_stack // accumulated __layout.svelte components
	 * @param {Array<string|undefined>} error_stack // accumulated __error.svelte components
	 */
	function walk(dir, parent_key, parent_segments, parent_params, layout_stack, error_stack) {
		/** @type {Item[]} */
		let items = [];
		fs.readdirSync(dir).forEach((basename) => {
			const resolved = path.join(dir, basename);
			const file = posixify(path.relative(cwd, resolved));
			const is_dir = fs.statSync(resolved).isDirectory();

			const ext = is_dir
				? ''
				: config.extensions.find((ext) => basename.endsWith(ext)) ||
				  config.kit.endpointExtensions.find((ext) => basename.endsWith(ext));

			if (ext === undefined) return;

			const name = ext ? basename.slice(0, -ext.length) : basename;

			// TODO remove this after a while
			['layout', 'layout.reset', 'error'].forEach((reserved) => {
				if (name === `$${reserved}`) {
					const prefix = posixify(path.relative(cwd, dir));
					const bad = `${prefix}/$${reserved}${ext}`;
					const good = `${prefix}/__${reserved}${ext}`;

					throw new Error(`${bad} should be renamed ${good}`);
				}
			});

			if (basename.startsWith('__') && !specials.has(name)) {
				throw new Error(`Files and directories prefixed with __ are reserved (saw ${file})`);
			}

			if (!is_dir && !/^(\.[a-z0-9]+)+$/i.test(ext)) return null; // filter out tmp files etc

			if (!config.kit.routes(file)) {
				return;
			}

			const segment = is_dir ? basename : name;

			if (/\]\[/.test(segment)) {
				throw new Error(`Invalid route ${file} — parameters must be separated`);
			}

			if (count_occurrences('[', segment) !== count_occurrences(']', segment)) {
				throw new Error(`Invalid route ${file} — brackets are unbalanced`);
			}

			const parts = get_parts(segment, file);
			const is_index = is_dir ? false : basename.startsWith('index.');
			const is_page = config.extensions.indexOf(ext) !== -1;
			const route_suffix = basename.slice(basename.indexOf('.'), -ext.length);

			items.push({
				basename,
				name,
				ext,
				parts,
				file,
				is_dir,
				is_index,
				is_page,
				route_suffix
			});
		});
		items = items.sort(comparator);

		items.forEach((item) => {
			const key = parent_key.slice();
			const segments = parent_segments.slice();

			if (item.is_index) {
				if (item.route_suffix) {
					if (segments.length > 0) {
						const last_segment = segments[segments.length - 1].slice();
						const last_part = last_segment[last_segment.length - 1];

						if (last_part.dynamic) {
							last_segment.push({
								dynamic: false,
								rest: false,
								content: item.route_suffix
							});
						} else {
							last_segment[last_segment.length - 1] = {
								dynamic: false,
								rest: false,
								content: `${last_part.content}${item.route_suffix}`
							};
						}

						segments[segments.length - 1] = last_segment;
						key[key.length - 1] += item.route_suffix;
					} else {
						segments.push(item.parts);
					}
				}
			} else {
				key.push(item.name);
				segments.push(item.parts);
			}

			const params = parent_params.slice();
			params.push(...item.parts.filter((p) => p.dynamic).map((p) => p.content));

			// TODO seems slightly backwards to derive the simple segment representation
			// from the more complex form, rather than vice versa — maybe swap it round
			const simple_segments = segments.map((segment) => {
				return {
					dynamic: segment.some((part) => part.dynamic),
					rest: segment.some((part) => part.rest),
					content: segment
						.map((part) => (part.dynamic ? `[${part.content}]` : part.content))
						.join('')
				};
			});

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
					path.join(dir, item.basename),
					key,
					segments,
					params,
					layout_reset ? [layout_reset] : layout_stack.concat(layout),
					layout_reset ? [error] : error_stack.concat(error)
				);
			} else if (item.is_page) {
				components.push(item.file);

				const concatenated = layout_stack.concat(item.file);
				const errors = error_stack.slice();

				const pattern = get_pattern(segments, true);

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

				const path = segments.every((segment) => segment.length === 1 && !segment[0].dynamic)
					? `/${segments.map((segment) => segment[0].content).join('/')}`
					: '';

				routes.push({
					type: 'page',
					key: key.join('/'),
					segments: simple_segments,
					pattern,
					params,
					path,
					shadow: null,
					a: /** @type {string[]} */ (concatenated),
					b: /** @type {string[]} */ (errors)
				});
			} else {
				const pattern = get_pattern(segments, !item.route_suffix);

				routes.push({
					type: 'endpoint',
					key: key.join('/'),
					segments: simple_segments,
					pattern,
					file: item.file,
					params
				});
			}
		});
	}

	const base = path.relative(cwd, config.kit.files.routes);

	const layout = find_layout('__layout', base) || default_layout;
	const error = find_layout('__error', base) || default_error;

	components.push(layout, error);

	walk(config.kit.files.routes, [], [], [], [layout], [error]);

	const lookup = new Map();
	for (const route of routes) {
		if (route.type === 'page') {
			lookup.set(route.key, route);
		}
	}

	let i = routes.length;
	while (i--) {
		const route = routes[i];
		if (route.type === 'endpoint' && lookup.has(route.key)) {
			lookup.get(route.key).shadow = route.file;
			routes.splice(i, 1);
		}
	}

	const assets = fs.existsSync(config.kit.files.assets)
		? list_files({ config, dir: config.kit.files.assets, path: '' })
		: [];

	return {
		assets,
		layout,
		error,
		components,
		routes
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

/** @param {string} path */
function is_spread(path) {
	const spread_pattern = /\[\.{3}/g;
	return spread_pattern.test(path);
}

/**
 * @param {Item} a
 * @param {Item} b
 */
function comparator(a, b) {
	if (a.is_index !== b.is_index) {
		if (a.is_index) return is_spread(a.file) ? 1 : -1;

		return is_spread(b.file) ? -1 : 1;
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
	/** @type {Part[]} */
	const result = [];
	part.split(/\[(.+?\(.+?\)|.+?)\]/).map((str, i) => {
		if (!str) return;
		const dynamic = i % 2 === 1;

		const [, content] = dynamic ? /([^(]+)$/.exec(str) || [null, null] : [null, str];

		if (!content || (dynamic && !/^(\.\.\.)?[a-zA-Z0-9_$]+$/.test(content))) {
			throw new Error(`Invalid route ${file} — parameter name must match /^[a-zA-Z0-9_$]+$/`);
		}

		result.push({
			content,
			dynamic,
			rest: dynamic && /^\.{3}.+$/.test(content)
		});
	});

	return result;
}

/**
 * @param {Part[][]} segments
 * @param {boolean} add_trailing_slash
 */
function get_pattern(segments, add_trailing_slash) {
	const path = segments
		.map((segment) => {
			if (segment.length === 1 && segment[0].rest) {
				// special case — `src/routes/foo/[...bar]/baz` matches `/foo/baz`
				// so we need to make the leading slash optional
				return '(?:\\/(.*))?';
			}

			const parts = segment.map((part) => {
				if (part.rest) return '(.*?)';
				if (part.dynamic) return '([^/]+?)';

				return (
					part.content
						// allow users to specify characters on the file system in an encoded manner
						.normalize()
						// We use [ and ] to denote parameters, so users must encode these on the file
						// system to match against them. We don't decode all characters since others
						// can already be epressed and so that '%' can be easily used directly in filenames
						.replace(/%5[Bb]/g, '[')
						.replace(/%5[Dd]/g, ']')
						// '#', '/', and '?' can only appear in URL path segments in an encoded manner.
						// They will not be touched by decodeURI so need to be encoded here, so
						// that we can match against them.
						// We skip '/' since you can't create a file with it on any OS
						.replace(/#/g, '%23')
						.replace(/\?/g, '%3F')
						// escape characters that have special meaning in regex
						.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
				);
			});

			return '\\/' + parts.join('');
		})
		.join('');

	const trailing = add_trailing_slash && segments.length ? '\\/?$' : '$';

	return new RegExp(`^${path || '\\/'}${trailing}`);
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
