import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime';
import { posixify, reserved_words } from '../utils';

export default function create_manifest_data(config) {
	const cwd = config.files.routes;

	function find_layout(file_name, component_name, dir = '') {
		const ext = config.pageExtensions.find((ext) =>
			fs.existsSync(path.join(cwd, dir, `${file_name}${ext}`))
		);
		const file = posixify(path.join(dir, `${file_name}${ext}`));
		const url = `/${config.appDir}/routes/${file}.js`;

		return ext
			? {
					name: component_name,
					file,
					url
			  }
			: null;
	}

	const components = [];
	const pages = [];
	const endpoints = [];

	const seen = new Map();
	const check_pattern = (pattern, file) => {
		pattern = pattern.toString();

		if (seen.has(pattern)) {
			throw new Error(`The ${seen.get(pattern)} and ${file} routes clash`);
		}

		seen.set(pattern, file);
	};

	const default_layout = {
		name: '$default_layout',
		url: `/${config.appDir}/assets/components/layout.svelte.js`
	};

	const default_error = {
		name: '$default_error',
		url: `/${config.appDir}/assets/components/error.svelte.js`
	};

	function walk(dir, parent_segments, parent_params, stack) {
		const items = fs
			.readdirSync(dir)
			.map((basename) => {
				const resolved = path.join(dir, basename);
				const file = path.relative(cwd, resolved);
				const is_dir = fs.statSync(resolved).isDirectory();

				const ext = path.extname(basename);

				if (basename[0] === '$') return null; // $layout, $error
				if (basename[0] === '_') return null; // private files
				if (basename[0] === '.' && basename !== '.well-known') return null;
				if (!is_dir && !/^\.[a-z]+$/i.test(ext)) return null; // filter out tmp files etc

				const segment = is_dir ? basename : basename.slice(0, -ext.length);

				if (/\]\[/.test(segment)) {
					throw new Error(`Invalid route ${file} — parameters must be separated`);
				}

				const parts = get_parts(segment);
				const is_index = is_dir ? false : basename.startsWith('index.');
				const is_page = config.pageExtensions.indexOf(ext) !== -1;
				const route_suffix = basename.slice(basename.indexOf('.'), -ext.length);

				parts.forEach((part) => {
					if (part.qualifier && /[()?:]/.test(part.qualifier.slice(1, -1))) {
						throw new Error(`Invalid route ${file} — cannot use (, ), ? or : in route qualifiers`);
					}
				});

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
							last_segment.push({ dynamic: false, content: item.route_suffix });
						} else {
							last_segment[last_segment.length - 1] = {
								dynamic: false,
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
				const component = find_layout('$layout', `${get_slug(item.file)}__layout`, item.file);

				if (component) components.push(component);

				walk(
					path.join(dir, item.basename),
					segments,
					params,
					component ? stack.concat(component) : stack
				);
			} else if (item.is_page) {
				const component = {
					name: get_slug(item.file),
					file: item.file,
					url: `/${config.appDir}/routes/${item.file}.js`
				};

				components.push(component);

				const parts =
					item.is_index && stack[stack.length - 1] === null
						? stack.slice(0, -1).concat(component)
						: stack.concat(component);

				const pattern = get_pattern(segments, true);
				check_pattern(pattern, item.file);

				pages.push({
					pattern,
					params,
					parts
				});
			} else {
				const pattern = get_pattern(segments, !item.route_suffix);
				check_pattern(pattern, item.file);

				endpoints.push({
					name: `route_${get_slug(item.file)}`,
					pattern,
					file: item.file,
					url: `/${config.appDir}/routes/${item.file.replace(/\.\w+$/, '.js')}`,
					params
				});
			}
		});
	}

	const layout = find_layout('$layout', 'main') || default_layout;
	const error = find_layout('$error', 'error') || default_error;

	walk(cwd, [], [], []);

	return {
		assets: fs.existsSync(config.files.assets) ? list_files(config.files.assets, '') : [],
		layout,
		error,
		components,
		pages,
		endpoints
	};
}

function is_spread(path) {
	const spread_pattern = /\[\.{3}/g;
	return spread_pattern.test(path);
}

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

		// If both parts dynamic, check for regexp patterns
		if (a_sub_part.dynamic && b_sub_part.dynamic) {
			const regexp_pattern = /\((.*?)\)/;
			const a_match = regexp_pattern.exec(a_sub_part.content);
			const b_match = regexp_pattern.exec(b_sub_part.content);

			if (!a_match && b_match) {
				return 1; // No regexp, so less specific than b
			}
			if (!b_match && a_match) {
				return -1;
			}
			if (a_match && b_match && a_match[1] !== b_match[1]) {
				return b_match[1].length - a_match[1].length;
			}
		}
	}
}

function get_parts(part) {
	return part
		.split(/\[(.+?\(.+?\)|.+?)\]/)
		.map((str, i) => {
			if (!str) return null;
			const dynamic = i % 2 === 1;

			const [, content, qualifier] = dynamic ? /([^(]+)(\(.+\))?$/.exec(str) : [null, str, null];

			return {
				content,
				dynamic,
				spread: dynamic && /^\.{3}.+$/.test(content),
				qualifier
			};
		})
		.filter(Boolean);
}

function get_slug(file) {
	let name = file
		.replace(/[\\/]index/, '')
		.replace(/[/\\]/g, '_')
		.replace(/\.\w+$/, '')
		.replace(/\[([^(]+)(?:\([^(]+\))?\]/, '$$$1')
		.replace(/[^a-zA-Z0-9_$]/g, (c) => {
			return c === '.' ? '_' : `$${c.charCodeAt(0)}`;
		});

	if (reserved_words.has(name)) name += '_';
	return name;
}

function get_pattern(segments, add_trailing_slash) {
	const path = segments
		.map((segment) => {
			return segment
				.map((part) => {
					return part.dynamic
						? part.qualifier || (part.spread ? '(.+)' : '([^/]+?)')
						: encodeURI(part.content.normalize())
								.replace(/\?/g, '%3F')
								.replace(/#/g, '%23')
								.replace(/%5B/g, '[')
								.replace(/%5D/g, ']')
								.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				})
				.join('');
		})
		.join('\\/');

	const trailing = add_trailing_slash && segments.length ? '\\/?$' : '$';

	return new RegExp(`^\\/${path}${trailing}`);
}

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
