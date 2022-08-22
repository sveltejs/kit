import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import { posixify, rimraf } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { remove_from_previous, write_if_changed } from './utils.js';

/**
 * @typedef { import('types').PageNode & {
 * 	parent?: {
 *    	key: string;
 *   	name: string;
 *   	folder_depth_diff: number;
 * 	}
 * } } Node
 */

/**
 * @typedef {{
 *   leaf?: Node;
 *   default_layout?: Node;
 *   named_layouts: Map<string, Node>;
 *   endpoint?: string;
 * }} NodeGroup
 */

/**
 *  @typedef {{
 *   modified: boolean;
 *   code: string;
 *   exports: any[];
 *  } | null} Proxy
 */

const cwd = process.cwd();

const shared_names = new Set(['load']);
const server_names = new Set(['load', 'POST', 'PUT', 'PATCH', 'DELETE']); // TODO replace with a single `action`

let first_run = true;

/**
 * Creates types for the whole manifest
 *
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export async function write_types(config, manifest_data) {
	/** @type {import('typescript') | undefined} */
	let ts = undefined;
	try {
		ts = (await import('typescript')).default;
	} catch (e) {
		// No TypeScript installed - skip type generation
		return;
	}

	const types_dir = `${config.kit.outDir}/types`;

	if (first_run) {
		rimraf(types_dir);
		first_run = false;
	}

	const routes_dir = posixify(path.relative('.', config.kit.files.routes));
	const groups = get_groups(manifest_data, routes_dir);

	let written_files = new Set();
	// ...then, for each directory, write $types.d.ts
	for (const [dir] of groups) {
		const written = write_types_for_dir(config, manifest_data, routes_dir, dir, groups, ts);
		written.forEach((w) => written_files.add(w));
	}

	// Remove all files that were not updated, which means their original was removed
	remove_from_previous((file) => {
		const was_removed = file.startsWith(types_dir) && !written_files.has(file);
		if (was_removed) {
			rimraf(file);
		}
		return was_removed;
	});
}

/**
 * Creates types related to the given file. This should only be called
 * if the file in question was edited, not if it was created/deleted/moved.
 *
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} file
 */
export async function write_type(config, manifest_data, file) {
	if (!path.basename(file).startsWith('+')) {
		// Not a route file
		return;
	}

	/** @type {import('typescript') | undefined} */
	let ts = undefined;
	try {
		ts = (await import('typescript')).default;
	} catch (e) {
		// No TypeScript installed - skip type generation
		return;
	}

	const routes_dir = posixify(path.relative('.', config.kit.files.routes));
	const file_dir = posixify(path.dirname(file).slice(config.kit.files.routes.length + 1));
	const groups = get_groups(manifest_data, routes_dir);

	// We are only interested in the directory that contains the file
	write_types_for_dir(config, manifest_data, routes_dir, file_dir, groups, ts);
}

/**
 * @param {import('types').ManifestData} manifest_data
 * @param {string} routes_dir
 */
function get_groups(manifest_data, routes_dir) {
	/**
	 * A map of all directories : route files. We don't just use
	 * manifest_data.routes, because that will exclude +layout
	 * files that aren't accompanied by a +page
	 * @type {Map<string, NodeGroup>}
	 */
	const groups = new Map();

	/** @param {string} dir */
	function get_group(dir) {
		let group = groups.get(dir);
		if (!group) {
			group = {
				named_layouts: new Map()
			};
			groups.set(dir, group);
		}

		return group;
	}

	// first, sort nodes (necessary for finding the nearest layout more efficiently)...
	const nodes = [...manifest_data.nodes].sort((n1, n2) => {
		// Sort by path length first...
		const path_length_diff =
			/** @type {string} */ (n1.component ?? n1.shared ?? n1.server).split('/').length -
			/** @type {string} */ (n2.component ?? n2.shared ?? n2.server).split('/').length;

		return (
			path_length_diff ||
			// ...on ties, sort named layouts first
			(path.basename(n1.component || '').includes('-')
				? -1
				: path.basename(n2.component || '').includes('-')
				? 1
				: 0)
		);
	});

	// ...then, populate `directories` with +page/+layout files...
	for (let i = 0; i < nodes.length; i += 1) {
		/** @type {Node} */
		const node = { ...nodes[i] }; // shallow copy so we don't mutate the original when setting parent

		const file_path = /** @type {string} */ (node.component ?? node.shared ?? node.server);
		// skip default layout/error
		if (!file_path.startsWith(routes_dir)) continue;

		const parts = file_path.split('/');

		const file = /** @type {string} */ (parts.pop());
		const dir = parts.join('/').slice(routes_dir.length + 1);

		// error pages don't need types
		if (!file || file.startsWith('+error')) continue;

		const group = get_group(dir);

		if (file.startsWith('+page')) {
			group.leaf = node;
		} else {
			const match = /^\+layout(?:-([^@.]+))?/.exec(file);

			// this shouldn't happen, but belt and braces. also keeps TS happy,
			// and we live to keep TS happy
			if (!match) throw new Error(`Unexpected route file: ${file}`);

			if (match[1]) {
				group.named_layouts.set(match[1], node);
			} else {
				group.default_layout = node;
			}
		}

		node.parent = find_nearest_layout(routes_dir, nodes, i);
	}

	// ...then add +server.js files...
	for (const route of manifest_data.routes) {
		if (route.type === 'endpoint') {
			get_group(route.id).endpoint = route.file;
		}
	}

	return groups;
}

/**
 *
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} routes_dir
 * @param {string} dir
 * @param {Map<string, NodeGroup>} groups
 * @param {import('typescript')} ts
 */
function write_types_for_dir(config, manifest_data, routes_dir, dir, groups, ts) {
	const group = groups.get(dir);
	if (!group) {
		return [];
	}

	const outdir = `${config.kit.outDir}/types/${routes_dir}/${dir}`;

	const imports = [`import type * as Kit from '@sveltejs/kit';`];

	/** @type {string[]} */
	const written_files = [];

	/** @type {string[]} */
	const declarations = [];

	/** @type {string[]} */
	const exports = [];

	const route_params = parse_route_id(dir).names;

	if (route_params.length > 0) {
		const params = route_params.map((param) => `${param}: string`).join('; ');
		declarations.push(
			`interface RouteParams extends Partial<Record<string, string>> { ${params} }`
		);
	} else {
		declarations.push(`interface RouteParams extends Partial<Record<string, string>> {}`);
	}

	if (group.leaf) {
		const { data, server_data, load, server_load, errors, written_proxies } = process_node(
			ts,
			group.leaf,
			outdir,
			'RouteParams',
			groups
		);
		written_files.push(...written_proxies);

		exports.push(`export type Errors = ${errors};`);

		exports.push(`export type PageData = ${data};`);
		if (load) {
			exports.push(
				`export type PageLoad<OutputData extends Record<string, any> | void = Record<string, any> | void> = ${load};`
			);
			exports.push('export type PageLoadEvent = Parameters<PageLoad>[0];');
		}

		exports.push(`export type PageServerData = ${server_data};`);
		if (server_load) {
			exports.push(
				`export type PageServerLoad<OutputData extends Record<string, any> | void = Record<string, any> | void> = ${server_load};`
			);
			exports.push('export type PageServerLoadEvent = Parameters<PageServerLoad>[0];');
		}

		if (group.leaf.server) {
			exports.push(`export type Action = Kit.Action<RouteParams>`);
		}
	}

	if (group.default_layout || group.named_layouts.size > 0) {
		// TODO to be completely rigorous, we should have a LayoutParams per
		// layout, and only include params for child pages that use each layout.
		// but that's more work than i care to do right now
		const layout_params = new Set();
		manifest_data.routes.forEach((route) => {
			if (route.type === 'page' && route.id.startsWith(dir + '/')) {
				// TODO this is O(n^2), see if we need to speed it up
				for (const name of parse_route_id(route.id.slice(dir.length + 1)).names) {
					layout_params.add(name);
				}
			}
		});

		if (layout_params.size > 0) {
			const params = Array.from(layout_params).map((param) => `${param}?: string`);
			declarations.push(`interface LayoutParams extends RouteParams { ${params.join('; ')} }`);
		} else {
			declarations.push(`interface LayoutParams extends RouteParams {}`);
		}

		if (group.default_layout) {
			const { data, server_data, load, server_load, written_proxies } = process_node(
				ts,
				group.default_layout,
				outdir,
				'LayoutParams',
				groups
			);
			written_files.push(...written_proxies);

			exports.push(`export type LayoutData = ${data};`);
			if (load) {
				exports.push(
					`export type LayoutLoad<OutputData extends Record<string, any> | void = Record<string, any> | void> = ${load};`
				);
				exports.push('export type LayoutLoadEvent = Parameters<LayoutLoad>[0];');
			}

			exports.push(`export type LayoutServerData = ${server_data};`);
			if (server_load) {
				exports.push(
					`export type LayoutServerLoad<OutputData extends Record<string, any> | void = Record<string, any> | void> = ${server_load};`
				);
				exports.push('export type LayoutServerLoadEvent = Parameters<LayoutServerLoad>[0];');
			}
		}

		if (group.named_layouts.size > 0) {
			/** @type {string[]} */
			const data_exports = [];

			/** @type {string[]} */
			const server_data_exports = [];

			/** @type {string[]} */
			const load_exports = [];

			/** @type {string[]} */
			const load_event_exports = [];

			/** @type {string[]} */
			const server_load_exports = [];

			/** @type {string[]} */
			const server_load_event_exports = [];

			for (const [name, node] of group.named_layouts) {
				const { data, server_data, load, server_load, written_proxies } = process_node(
					ts,
					node,
					outdir,
					'LayoutParams',
					groups
				);
				written_files.push(...written_proxies);
				data_exports.push(`export type ${name} = ${data};`);
				server_data_exports.push(`export type ${name} = ${server_data};`);
				if (load) {
					load_exports.push(
						`export type ${name}<OutputData extends Record<string, any> | void = Record<string, any> | void> = ${load};`
					);
					load_event_exports.push(`export type ${name} = Parameters<LayoutLoad.${name}>[0];`);
				}
				if (server_load) {
					server_load_exports.push(
						`export type ${name}<OutputData extends Record<string, any> | void = Record<string, any> | void> = ${server_load};`
					);
					server_load_event_exports.push(
						`export type ${name} = Parameters<LayoutServerLoad.${name}>[0];`
					);
				}
			}

			exports.push(`\nexport namespace LayoutData {\n\t${data_exports.join('\n\t')}\n}`);
			exports.push(`\nexport namespace LayoutLoad {\n\t${load_exports.join('\n\t')}\n}`);
			exports.push(`\nexport namespace LayoutLoadEvent {\n\t${load_event_exports.join('\n\t')}\n}`);
			exports.push(
				`\nexport namespace LayoutServerData {\n\t${server_data_exports.join('\n\t')}\n}`
			);
			exports.push(
				`\nexport namespace LayoutServerLoad {\n\t${server_load_exports.join('\n\t')}\n}`
			);
			exports.push(
				`\nexport namespace LayoutServerLoadEvent {\n\t${server_load_event_exports.join('\n\t')}\n}`
			);
		}
	}

	if (group.endpoint) {
		exports.push(`export type RequestHandler = Kit.RequestHandler<RouteParams>;`);
		exports.push(`export type RequestEvent = Kit.RequestEvent<RouteParams>;`);
	}

	const output = [imports.join('\n'), declarations.join('\n'), exports.join('\n')]
		.filter(Boolean)
		.join('\n\n');

	written_files.push(write(`${outdir}/$types.d.ts`, output));

	return written_files;
}

/**
 * @param {import('typescript')} ts
 * @param {Node} node
 * @param {string} outdir
 * @param {string} params
 * @param {Map<string, NodeGroup>} groups
 */
function process_node(ts, node, outdir, params, groups) {
	let data;
	let load;
	let server_load;
	let errors;

	/** @type {string[]} */
	let written_proxies = [];

	let server_data;

	if (node.server) {
		const content = fs.readFileSync(node.server, 'utf8');
		const proxy = tweak_types(ts, content, server_names);
		const basename = path.basename(node.server);
		if (proxy?.modified) {
			written_proxies.push(write(`${outdir}/proxy${basename}`, proxy.code));
		}

		server_data = get_data_type(node.server, 'null', proxy);
		server_load = `Kit.ServerLoad<${params}, ${get_parent_type('LayoutServerData')}, OutputData>`;

		if (proxy) {
			const types = [];
			for (const method of ['POST', 'PUT', 'PATCH']) {
				if (proxy.exports.includes(method)) {
					// If the file wasn't tweaked, we can use the return type of the original file.
					// The advantage is that type updates are reflected without saving.
					const from = proxy.modified
						? `./proxy${replace_ext_with_js(basename)}`
						: path_to_original(outdir, node.server);

					types.push(`Kit.AwaitedErrors<typeof import('${from}').${method}>`);
				}
			}
			errors = types.length ? types.join(' | ') : 'null';
		} else {
			errors = 'unknown';
		}
	} else {
		server_data = 'null';
	}

	const parent_type = get_parent_type('LayoutData');

	if (node.shared) {
		const content = fs.readFileSync(node.shared, 'utf8');
		const proxy = tweak_types(ts, content, shared_names);
		if (proxy?.modified) {
			written_proxies.push(write(`${outdir}/proxy${path.basename(node.shared)}`, proxy.code));
		}

		const type = get_data_type(node.shared, `${parent_type} & ${server_data}`, proxy);

		data = `Omit<${parent_type}, keyof ${type}> & ${type}`;
		load = `Kit.Load<${params}, ${server_data}, ${parent_type}, OutputData>`;
	} else if (server_data === 'null') {
		data = parent_type;
	} else {
		data = `Omit<${parent_type}, keyof ${server_data}> & ${server_data}`;
	}

	return { data, server_data, load, server_load, errors, written_proxies };

	/**
	 * @param {string} file_path
	 * @param {string} fallback
	 * @param {Proxy} proxy
	 */
	function get_data_type(file_path, fallback, proxy) {
		if (proxy) {
			if (proxy.exports.includes('load')) {
				// If the file wasn't tweaked, we can use the return type of the original file.
				// The advantage is that type updates are reflected without saving.
				const from = proxy.modified
					? `./proxy${replace_ext_with_js(path.basename(file_path))}`
					: path_to_original(outdir, file_path);
				return `Kit.AwaitedProperties<Awaited<ReturnType<typeof import('${from}').load>>>`;
			} else {
				return fallback;
			}
		} else {
			return 'unknown';
		}
	}

	/**
	 * Get the parent type string by recursively looking up the parent layout and accumulate them to one type.
	 * @param {string} type
	 */
	function get_parent_type(type) {
		const parent_imports = [];
		let parent = node.parent;
		let acc_diff = 0;

		while (parent) {
			acc_diff += parent.folder_depth_diff;
			let parent_group = /** @type {NodeGroup} */ (groups.get(parent.key));
			// unshift because we need it the other way round for the import string
			parent_imports.unshift(
				(acc_diff === 0 ? '' : `import('` + '../'.repeat(acc_diff) + '$types.js' + `').`) +
					`${type}${parent.name ? `.${parent.name}` : ''}`
			);
			let parent_layout = /** @type {Node} */ (
				parent.name ? parent_group.named_layouts.get(parent.name) : parent_group.default_layout
			);
			parent = parent_layout.parent;
		}

		let parent_str = parent_imports[0] || 'Record<never, never>';
		for (let i = 1; i < parent_imports.length; i++) {
			// Omit is necessary because a parent could have a property with the same key which would
			// cause a type conflict. At runtime the child overwrites the parent property in this case,
			// so reflect that in the type definition.
			parent_str = `Omit<${parent_str}, keyof ${parent_imports[i]}> & ${parent_imports[i]}`;
		}
		return parent_str;
	}
}

/**
 * @param {string} outdir
 * @param {string} file_path
 */
function path_to_original(outdir, file_path) {
	return posixify(path.relative(outdir, path.join(cwd, replace_ext_with_js(file_path))));
}

/**
 * @param {string} file_path
 */
function replace_ext_with_js(file_path) {
	// Another extension than `.js` (or nothing, but that fails with node16 moduleResolution)
	// will result in TS failing to lookup the file
	const ext = path.extname(file_path);
	return file_path.slice(0, -ext.length) + '.js';
}

/**
 * @param {import('typescript')} ts
 * @param {string} content
 * @param {Set<string>} names
 * @returns {Proxy}
 */
export function tweak_types(ts, content, names) {
	try {
		let modified = false;

		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			false,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		const exports = new Map();

		ast.forEachChild((node) => {
			if (
				ts.isExportDeclaration(node) &&
				node.exportClause &&
				ts.isNamedExports(node.exportClause)
			) {
				node.exportClause.elements.forEach((element) => {
					const exported = element.name;
					if (names.has(element.name.text)) {
						const local = element.propertyName || element.name;
						exports.set(exported.text, local.text);
					}
				});
			}

			if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
				if (ts.isFunctionDeclaration(node) && node.name?.text && names.has(node.name?.text)) {
					exports.set(node.name.text, node.name.text);
				}

				if (ts.isVariableStatement(node)) {
					node.declarationList.declarations.forEach((declaration) => {
						if (ts.isIdentifier(declaration.name) && names.has(declaration.name.text)) {
							exports.set(declaration.name.text, declaration.name.text);
						}
					});
				}
			}
		});

		/**
		 * @param {import('typescript').Node} node
		 * @param {import('typescript').Node} value
		 */
		function replace_jsdoc_type_tags(node, value) {
			// @ts-ignore
			if (node.jsDoc) {
				// @ts-ignore
				for (const comment of node.jsDoc) {
					for (const tag of comment.tags) {
						if (ts.isJSDocTypeTag(tag)) {
							const is_fn =
								ts.isFunctionDeclaration(value) ||
								ts.isFunctionExpression(value) ||
								ts.isArrowFunction(value);

							if (is_fn && value.parameters?.length > 0) {
								code.overwrite(tag.tagName.pos, tag.tagName.end, 'param');
								code.prependRight(tag.typeExpression.pos + 1, 'Parameters<');
								code.appendLeft(tag.typeExpression.end - 1, '>[0]');
								code.appendLeft(tag.typeExpression.end, ' event');
							} else {
								code.overwrite(tag.pos, tag.end, '');
							}
							modified = true;
						}
					}
				}
			}
		}

		ast.forEachChild((node) => {
			if (ts.isFunctionDeclaration(node) && node.name?.text && names.has(node.name?.text)) {
				// remove JSDoc comment above `export function load ...`
				replace_jsdoc_type_tags(node, node);
			}

			if (ts.isVariableStatement(node)) {
				// remove JSDoc comment above `export const load = ...`
				if (
					ts.isIdentifier(node.declarationList.declarations[0].name) &&
					names.has(node.declarationList.declarations[0].name.text) &&
					node.declarationList.declarations[0].initializer
				) {
					replace_jsdoc_type_tags(node, node.declarationList.declarations[0].initializer);
				}

				for (const declaration of node.declarationList.declarations) {
					if (
						ts.isIdentifier(declaration.name) &&
						names.has(declaration.name.text) &&
						declaration.initializer
					) {
						// edge case — remove JSDoc comment above individual export
						replace_jsdoc_type_tags(declaration, declaration.initializer);

						// remove type from `export const load: Load ...`
						if (declaration.type) {
							let a = declaration.type.pos;
							let b = declaration.type.end;
							while (/\s/.test(content[a])) a += 1;

							const type = content.slice(a, b);
							code.remove(declaration.name.end, declaration.type.end);

							const rhs = declaration.initializer;

							if (
								rhs &&
								(ts.isArrowFunction(rhs) || ts.isFunctionExpression(rhs)) &&
								rhs.parameters.length
							) {
								const arg = rhs.parameters[0];

								const add_parens = content[arg.pos - 1] !== '(';

								if (add_parens) code.prependRight(arg.pos, '(');

								if (arg && !arg.type) {
									code.appendLeft(
										arg.name.end,
										`: Parameters<${type}>[0]` + (add_parens ? ')' : '')
									);
								}
							}

							modified = true;
						}
					}
				}
			}
		});

		return {
			modified,
			code: code.toString(),
			exports: Array.from(exports.keys())
		};
	} catch {
		return null;
	}
}

/**
 * @param {string} file
 * @param {string} content
 */
function write(file, content) {
	write_if_changed(file, content);
	return file;
}

/**
 * Finds the nearest layout for given node.
 * Assumes that nodes is sorted by path length (lowest first).
 *
 * @param {string} routes_dir
 * @param {import('types').PageNode[]} nodes
 * @param {number} start_idx
 */
export function find_nearest_layout(routes_dir, nodes, start_idx) {
	const start_file = /** @type {string} */ (
		nodes[start_idx].component || nodes[start_idx].shared || nodes[start_idx].server
	);

	let name = '';
	const match = /^\+(layout|page)(?:-([^@.]+))?(?:@([^@.]+))?/.exec(path.basename(start_file));
	if (!match) throw new Error(`Unexpected route file: ${start_file}`);
	if (match[3] && match[3] !== 'default') {
		name = match[3]; // a named layout is referenced
	}

	let common_path = path.dirname(start_file);
	if (match[1] === 'layout' && !match[2] && !name) {
		// We are a default layout, so we skip the current level
		common_path = path.dirname(common_path);
	}

	for (let i = start_idx - 1; i >= 0; i -= 1) {
		const node = nodes[i];
		const file = /** @type {string} */ (node.component || node.shared || node.server);

		const current_path = path.dirname(file);
		const common_path_length = common_path.split('/').length;
		const current_path_length = current_path.split('/').length;

		if (common_path_length < current_path_length) {
			// this is a layout in a different tree
			continue;
		} else if (common_path_length > current_path_length) {
			// we've gone back up a folder level
			common_path = path.dirname(common_path);
		}
		if (common_path !== current_path) {
			// this is a layout in a different tree
			continue;
		}
		if (
			path.basename(file, path.extname(file)).split('@')[0] !==
			'+layout' + (name ? `-${name}` : '')
		) {
			// this is not the layout we are searching for
			continue;
		}

		// matching parent layout found
		let folder_depth_diff =
			posixify(path.relative(path.dirname(start_file), common_path + '/$types.js')).split('/')
				.length - 1;
		return {
			key: path.dirname(file).slice(routes_dir.length + 1),
			name,
			folder_depth_diff
		};
	}
}
