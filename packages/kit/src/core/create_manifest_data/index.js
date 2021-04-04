import fs from 'fs';
import path from 'path';
import mime from 'mime';

/** @typedef {{
 *   content: string;
 *   dynamic: boolean;
 *   spread: boolean;
 * }} Part */

/** @typedef {{
 *   basename: string;
 *   ext: string;
 *   parts: Part[],
 *   file: string;
 *   is_dir: boolean;
 *   is_index: boolean;
 *   is_page: boolean;
 *   route_suffix: string
 * }} Item */

/**
 * @param {{
 *   config: import('types.internal').ValidatedConfig;
 *   output: string;
 *   cwd?: string;
 * }} opts
 * @returns {import('types.internal').ManifestData}
 */
export default function create_manifest_data({ config, output, cwd = process.cwd() }) {
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

	/** @type {import('types.internal').RouteData[]} */
	const routes = [];

	const default_layout = posixify(path.relative(cwd, `${output}/components/layout.svelte`));
	const default_error = posixify(path.relative(cwd, `${output}/components/error.svelte`));

	/**
	 * @param {string} dir
	 * @param {Part[][]} parent_segments
	 * @param {string[]} parent_params
	 * @param {string[]} stack
	 */
	function walk(dir, parent_segments, parent_params, stack) {
		/** @type {Item[]} */
		const items = fs
			.readdirSync(dir)
			.map((basename) => {
				const resolved = path.join(dir, basename);
				const file = posixify(path.relative(cwd, resolved));
				const is_dir = fs.statSync(resolved).isDirectory();

				const ext =
					config.extensions.find((ext) => basename.endsWith(ext)) || path.extname(basename);

				if (basename[0] === '$') return null; // $layout, $error
				if (basename[0] === '_') return null; // private files
				if (basename[0] === '.' && basename !== '.well-known') return null;
				if (!is_dir && !/^(\.[a-z0-9]+)+$/i.test(ext)) return null; // filter out tmp files etc

				const segment = is_dir ? basename : basename.slice(0, -ext.length);

				if (/\]\[/.test(segment)) {
					throw new Error(`Invalid route ${file} — parameters must be separated`);
				}

				if (count_occurrences('[', segment) !== count_occurrences(']', segment)) {
					throw new Error(`Invalid route ${file} — brackets are unbalanced`);
				}

				if (/.+\[\.\.\.[^\]]+\]/.test(segment) || /\[\.\.\.[^\]]+\].+/.test(segment)) {
					throw new Error(`Invalid route ${file} — rest parameter must be a standalone segment`);
				}

				const parts = get_parts(segment, file);
				const is_index = is_dir ? false : basename.startsWith('index.');
				const is_page = config.extensions.indexOf(ext) !== -1;
				const route_suffix = basename.slice(basename.indexOf('.'), -ext.length);

				return {
					basename,
					ext,
					parts,
					file: posixify(file),
					is_dir,
					is_index,
					is_page,
					route_suffix
				};
			})
			.filter(Boolean)
			.sort(comparator);

		items.forEach((item) => {
			const segments = parent_segments.slice();

			if (item.is_index) {
				if (item.route_suffix) {
					if (segments.length > 0) {
						const last_segment = segments[segments.length - 1].slice();
						const last_part = last_segment[last_segment.length - 1];

						if (last_part.dynamic) {
							last_segment.push({
								dynamic: false,
								spread: false,
								content: item.route_suffix
							});
						} else {
							last_segment[last_segment.length - 1] = {
								dynamic: false,
								spread: false,
								content: `${last_part.content}${item.route_suffix}`
							};
						}

						segments[segments.length - 1] = last_segment;
					} else {
						segments.push(item.parts);
					}
				}
			} else {
				segments.push(item.parts);
			}

			const params = parent_params.slice();
			params.push(...item.parts.filter((p) => p.dynamic).map((p) => p.content));

			if (item.is_dir) {
				const component = find_layout('$layout', item.file);

				if (component) components.push(component);

				walk(
					path.join(dir, item.basename),
					segments,
					params,
					component ? stack.concat(component) : stack
				);
			} else if (item.is_page) {
				components.push(item.file);

				const parts =
					item.is_index && stack[stack.length - 1] === null
						? stack.slice(0, -1).concat(item.file)
						: stack.concat(item.file);

				const pattern = get_pattern(segments, true);

				routes.push({
					type: 'page',
					pattern,
					params,
					parts
				});
			} else {
				const pattern = get_pattern(segments, !item.route_suffix);

				routes.push({
					type: 'endpoint',
					pattern,
					file: item.file,
					params
				});
			}
		});
	}

	const base = path.relative(cwd, config.kit.files.routes);

	const layout = find_layout('$layout', base) || default_layout;
	const error = find_layout('$error', base) || default_error;

	walk(config.kit.files.routes, [], [], []);

	const assets_dir = config.kit.files.assets;

	return {
		assets: fs.existsSync(assets_dir) ? list_files(assets_dir, '') : [],
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

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
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

		// if spread && index, order later
		if (a_sub_part.spread && b_sub_part.spread) {
			return a.is_index ? 1 : -1;
		}

		// If one is ...spread order it later
		if (a_sub_part.spread !== b_sub_part.spread) return a_sub_part.spread ? 1 : -1;

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
	return part
		.split(/\[(.+?\(.+?\)|.+?)\]/)
		.map((str, i) => {
			if (!str) return null;
			const dynamic = i % 2 === 1;

			const [, content] = dynamic ? /([^(]+)$/.exec(str) : [null, str];

			if (dynamic && !/^(\.\.\.)?[a-zA-Z0-9_$]+$/.test(content)) {
				throw new Error(`Invalid route ${file} — parameter name must match /^[a-zA-Z0-9_$]+$/`);
			}

			return {
				content,
				dynamic,
				spread: dynamic && /^\.{3}.+$/.test(content)
			};
		})
		.filter(Boolean);
}

/**
 * @param {Part[][]} segments
 * @param {boolean} add_trailing_slash
 */
function get_pattern(segments, add_trailing_slash) {
	const path = segments
		.map((segment) => {
			return segment[0].spread
				? '\\/?(.*)'
				: '\\/' +
						segment
							.map((part) => {
								return part.dynamic
									? '([^/]+?)'
									: encodeURI(part.content.normalize())
											.replace(/\?/g, '%3F')
											.replace(/#/g, '%23')
											.replace(/%5B/g, '[')
											.replace(/%5D/g, ']')
											.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
							})
							.join('');
		})
		.join('');

	const trailing = add_trailing_slash && segments.length ? '\\/?$' : '$';

	return new RegExp(`^${path || '\\/'}${trailing}`);
}

/**
 * @param {string} dir
 * @param {string} path
 * @param {import('types.internal').Asset[]} files
 */
function list_files(dir, path, files = []) {
	fs.readdirSync(dir).forEach((file) => {
		const full = `${dir}/${file}`;

		const stats = fs.statSync(full);
		const joined = path ? `${path}/${file}` : file;

		if (stats.isDirectory()) {
			list_files(full, joined, files);
		} else {
			if (file === '.DS_Store') return;
			files.push({
				file: joined,
				size: stats.size,
				type: mime.getType(joined)
			});
		}
	});

	return files;
}
