import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import { posixify, rimraf, walk } from '../../../utils/filesystem.js';
import { compact } from '../../../utils/array.js';

/**
 *  @typedef {{
 *   modified: boolean;
 *   code: string;
 *   exports: any[];
 *  } | null} Proxy
 */

/** @type {import('typescript')} */
// @ts-ignore
let ts = undefined;
try {
	ts = (await import('typescript')).default;
} catch {}

const cwd = process.cwd();

/**
 * Creates types for the whole manifest
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export async function write_all_types(config, manifest_data) {
	if (!ts) return;

	const types_dir = `${config.kit.outDir}/types`;

	// empty out files that no longer need to exist
	const routes_dir = path.relative('.', config.kit.files.routes);
	const expected_directories = new Set(
		manifest_data.routes.map((route) => path.join(routes_dir, route.id))
	);

	if (fs.existsSync(types_dir)) {
		for (const file of walk(types_dir)) {
			const dir = path.dirname(file);
			if (!expected_directories.has(dir)) {
				rimraf(file);
			}
		}
	}

	const routes_map = create_routes_map(manifest_data);
	// For each directory, write $types.d.ts
	for (const route of manifest_data.routes) {
		update_types(config, routes_map, route);
	}
}

/**
 * Creates types related to the given file. This should only be called
 * if the file in question was edited, not if it was created/deleted/moved.
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {string} file
 */
export async function write_types(config, manifest_data, file) {
	if (!ts) return;

	if (!path.basename(file).startsWith('+')) {
		// Not a route file
		return;
	}

	const id = posixify(path.relative(config.kit.files.routes, path.dirname(file)));

	const route = manifest_data.routes.find((route) => route.id === id);
	if (!route) return; // this shouldn't ever happen

	update_types(config, create_routes_map(manifest_data), route);
}

/**
 * Collect all leafs into a leaf -> route map
 * @param {import('types').ManifestData} manifest_data
 */
function create_routes_map(manifest_data) {
	/** @type {Map<import('types').PageNode, import('types').RouteData>} */
	const map = new Map();
	for (const route of manifest_data.routes) {
		if (route.leaf) {
			map.set(route.leaf, route);
		}
	}
	return map;
}

/**
 * Update types for a specific route
 * @param {import('types').ValidatedConfig} config
 * @param {Map<import('types').PageNode, import('types').RouteData>} routes
 * @param {import('types').RouteData} route
 */
function update_types(config, routes, route) {
	if (!route.leaf && !route.layout && !route.endpoint) return; // nothing to do

	const routes_dir = posixify(path.relative('.', config.kit.files.routes));
	const outdir = path.join(config.kit.outDir, 'types', routes_dir, route.id);

	// first, check if the types are out of date
	const input_files = [];

	/** @type {import('types').PageNode | null} */
	let node = route.leaf;
	while (node) {
		if (node.shared) input_files.push(node.shared);
		if (node.server) input_files.push(node.server);
		node = node.parent ?? null;
	}

	/** @type {import('types').PageNode | null} */
	node = route.layout;
	while (node) {
		if (node.shared) input_files.push(node.shared);
		if (node.server) input_files.push(node.server);
		node = node.parent ?? null;
	}

	if (route.endpoint) {
		input_files.push(route.endpoint.file);
	}

	try {
		fs.mkdirSync(outdir, { recursive: true });
	} catch {}

	const output_files = compact(
		fs.readdirSync(outdir).map((name) => {
			const stats = fs.statSync(path.join(outdir, name));
			if (stats.isDirectory()) return;
			return {
				name,
				updated: stats.mtimeMs
			};
		})
	);

	const source_last_updated = Math.max(...input_files.map((file) => fs.statSync(file).mtimeMs));
	const types_last_updated = Math.max(...output_files.map((file) => file?.updated));

	// types were generated more recently than the source files, so don't regenerate
	if (types_last_updated > source_last_updated) return;

	// track which old files end up being surplus to requirements
	const to_delete = new Set(output_files.map((file) => file.name));

	// now generate new types
	const imports = [`import type * as Kit from '@sveltejs/kit';`];

	/** @type {string[]} */
	const declarations = [];

	/** @type {string[]} */
	const exports = [];

	// add 'Expand' helper
	// Makes sure a type is "repackaged" and therefore more readable
	declarations.push('type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;');
	declarations.push(
		`type RouteParams = { ${route.names.map((param) => `${param}: string`).join('; ')} }`
	);

	// These could also be placed in our public types, but it would bloat them unnecessarily and we may want to change these in the future
	if (route.layout || route.leaf) {
		// If T extends the empty object, void is also allowed as a return type
		declarations.push(`type MaybeWithVoid<T> = {} extends T ? T | void : T;`);
		// Returns the key of the object whose values are required.
		declarations.push(
			`export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];`
		);
		// Helper type to get the correct output type for load functions. It should be passed the parent type to check what types from App.PageData are still required.
		// If none, void is also allowed as a return type.
		declarations.push(
			`type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>`
		);
		// null & {} == null, we need to prevent that in some situations
		declarations.push(`type EnsureParentData<T> = T extends null | undefined ? {} : T;`);
	}

	if (route.leaf) {
		const { declarations: d, exports: e, written_proxies } = process_node(route.leaf, outdir, true);

		exports.push(...e);
		declarations.push(...d);

		for (const file of written_proxies) to_delete.delete(file);

		if (route.leaf.server) {
			exports.push(`export type Action = Kit.Action<RouteParams>`);
			exports.push(`export type Actions = Kit.Actions<RouteParams>`);
		}
	}

	if (route.layout) {
		let all_pages_have_load = true;
		const layout_params = new Set();
		route.layout.child_pages?.forEach((page) => {
			const leaf = routes.get(page);
			if (leaf) {
				for (const name of leaf.names) {
					layout_params.add(name);
				}
			}
			if (!page.server && !page.shared) {
				all_pages_have_load = false;
			}
		});

		declarations.push(
			`type LayoutParams = RouteParams & { ${Array.from(layout_params).map(
				(param) => `${param}?: string`
			)} }`
		);

		const {
			exports: e,
			declarations: d,
			written_proxies
		} = process_node(route.layout, outdir, false, all_pages_have_load);

		exports.push(...e);
		declarations.push(...d);

		for (const file of written_proxies) to_delete.delete(file);
	}

	if (route.endpoint) {
		exports.push(`export type RequestHandler = Kit.RequestHandler<RouteParams>;`);
	}

	if (route.leaf?.server || route.endpoint) {
		exports.push(`export type RequestEvent = Kit.RequestEvent<RouteParams>;`);
	}

	const output = [imports.join('\n'), declarations.join('\n'), exports.join('\n')]
		.filter(Boolean)
		.join('\n\n');

	fs.writeFileSync(`${outdir}/$types.d.ts`, output);
	to_delete.delete('$types.d.ts');

	for (const file of to_delete) {
		fs.unlinkSync(path.join(outdir, file));
	}
}

/**
 * @param {import('types').PageNode} node
 * @param {string} outdir
 * @param {boolean} is_page
 * @param {boolean} [all_pages_have_load]
 */
function process_node(node, outdir, is_page, all_pages_have_load = true) {
	const params = `${is_page ? 'Route' : 'Layout'}Params`;
	const prefix = is_page ? 'Page' : 'Layout';

	/** @type {string[]} */
	let written_proxies = [];
	/** @type {string[]} */
	const declarations = [];
	/** @type {string[]} */
	const exports = [];

	/** @type {string} */
	let server_data;
	/** @type {string} */
	let data;

	if (node.server) {
		const content = fs.readFileSync(node.server, 'utf8');
		const proxy = tweak_types(content, true);
		const basename = path.basename(node.server);
		if (proxy?.modified) {
			fs.writeFileSync(`${outdir}/proxy${basename}`, proxy.code);
			written_proxies.push(`proxy${basename}`);
		}

		server_data = get_data_type(node.server, 'null', proxy, true);

		const parent_type = `${prefix}ServerParentData`;

		declarations.push(`type ${parent_type} = ${get_parent_type(node, 'LayoutServerData')};`);

		// +page.js load present -> server can return all-optional data
		const output_data_shape =
			node.shared || (!is_page && all_pages_have_load)
				? `Partial<App.PageData> & Record<string, any> | void`
				: `OutputDataShape<${parent_type}>`;
		exports.push(
			`export type ${prefix}ServerLoad<OutputData extends ${output_data_shape} = ${output_data_shape}> = Kit.ServerLoad<${params}, ${parent_type}, OutputData>;`
		);

		exports.push(`export type ${prefix}ServerLoadEvent = Parameters<${prefix}ServerLoad>[0];`);

		if (is_page) {
			let type = 'unknown';
			if (proxy) {
				if (proxy.exports.includes('actions')) {
					// If the file wasn't tweaked, we can use the return type of the original file.
					// The advantage is that type updates are reflected without saving.
					const from = proxy.modified
						? `./proxy${replace_ext_with_js(basename)}`
						: path_to_original(outdir, node.server);

					type = `Expand<Kit.AwaitedActions<typeof import('${from}').actions>>`;
				}
			}
			exports.push(`export type ActionData = ${type};`);
		}
	} else {
		server_data = 'null';
	}
	exports.push(`export type ${prefix}ServerData = ${server_data};`);

	const parent_type = `${prefix}ParentData`;
	declarations.push(`type ${parent_type} = ${get_parent_type(node, 'LayoutData')};`);

	if (node.shared) {
		const content = fs.readFileSync(node.shared, 'utf8');
		const proxy = tweak_types(content, false);
		if (proxy?.modified) {
			fs.writeFileSync(`${outdir}/proxy${path.basename(node.shared)}`, proxy.code);
			written_proxies.push(`proxy${path.basename(node.shared)}`);
		}

		const type = get_data_type(node.shared, `${parent_type} & ${prefix}ServerData`, proxy);

		data = `Expand<Omit<${parent_type}, keyof ${type}> & ${type}>`;

		const output_data_shape =
			!is_page && all_pages_have_load
				? `Partial<App.PageData> & Record<string, any> | void`
				: `OutputDataShape<${parent_type}>`;
		exports.push(
			`export type ${prefix}Load<OutputData extends ${output_data_shape} = ${output_data_shape}> = Kit.Load<${params}, ${prefix}ServerData, ${parent_type}, OutputData>;`
		);

		exports.push(`export type ${prefix}LoadEvent = Parameters<${prefix}Load>[0];`);
	} else if (server_data === 'null') {
		data = `Expand<${parent_type}>`;
	} else {
		data = `Expand<Omit<${parent_type}, keyof ${prefix}ServerData> & ${prefix}ServerData>`;
	}

	exports.push(`export type ${prefix}Data = ${data};`);

	return { declarations, exports, written_proxies };

	/**
	 * @param {string} file_path
	 * @param {string} fallback
	 * @param {Proxy} proxy
	 * @param {boolean} expand
	 */
	function get_data_type(file_path, fallback, proxy, expand = false) {
		if (proxy) {
			if (proxy.exports.includes('load')) {
				// If the file wasn't tweaked, we can use the return type of the original file.
				// The advantage is that type updates are reflected without saving.
				const from = proxy.modified
					? `./proxy${replace_ext_with_js(path.basename(file_path))}`
					: path_to_original(outdir, file_path);
				const type = `Kit.AwaitedProperties<Awaited<ReturnType<typeof import('${from}').load>>>`;
				return expand ? `Expand<${type}>` : type;
			} else {
				return fallback;
			}
		} else {
			return 'unknown';
		}
	}
}

/**
 * Get the parent type string by recursively looking up the parent layout and accumulate them to one type.
 * @param {import('types').PageNode} node
 * @param {string} type
 */
function get_parent_type(node, type) {
	const parent_imports = [];

	let parent = node.parent;

	while (parent) {
		const d = node.depth - parent.depth;
		// unshift because we need it the other way round for the import string
		parent_imports.unshift(
			`${d === 0 ? '' : `import('${'../'.repeat(d)}${'$types.js'}').`}${type}`
		);
		parent = parent.parent;
	}

	let parent_str = `EnsureParentData<${parent_imports[0] || '{}'}>`;
	for (let i = 1; i < parent_imports.length; i++) {
		// Omit is necessary because a parent could have a property with the same key which would
		// cause a type conflict. At runtime the child overwrites the parent property in this case,
		// so reflect that in the type definition.
		// EnsureParentData is necessary because {something: string} & null becomes null.
		// Output types of server loads can be null but when passed in through the `parent` parameter they are the empty object instead.
		parent_str = `Omit<${parent_str}, keyof ${parent_imports[i]}> & EnsureParentData<${parent_imports[i]}>`;
	}
	return parent_str;
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
 * @param {string} content
 * @param {boolean} is_server
 * @returns {Proxy}
 */
export function tweak_types(content, is_server) {
	const names = new Set(is_server ? ['load', 'actions'] : ['load']);

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
			let _modified = false;
			// @ts-ignore
			if (node.jsDoc) {
				// @ts-ignore
				for (const comment of node.jsDoc) {
					for (const tag of comment.tags ?? []) {
						if (ts.isJSDocTypeTag(tag)) {
							const is_fn =
								ts.isFunctionDeclaration(value) ||
								ts.isFunctionExpression(value) ||
								ts.isArrowFunction(value);

							if (is_fn && value.parameters?.length > 0) {
								const name = ts.isIdentifier(value.parameters[0].name)
									? value.parameters[0].name.text
									: 'event';
								code.overwrite(tag.tagName.pos, tag.tagName.end, 'param');
								code.prependRight(tag.typeExpression.pos + 1, 'Parameters<');
								code.appendLeft(tag.typeExpression.end - 1, '>[0]');
								code.appendLeft(tag.typeExpression.end, ` ${name}`);
							} else {
								code.overwrite(tag.pos, tag.end, '');
							}
							_modified = true;
						}
					}
				}
			}
			modified ||= _modified;
			return _modified;
		}

		ast.forEachChild((node) => {
			if (ts.isFunctionDeclaration(node) && node.name?.text && node.name?.text === 'load') {
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
						declaration.name.text === 'load' &&
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
								} else {
									// prevent "type X is imported but not used" (isn't silenced by @ts-nocheck) when svelte-check runs
									code.append(`;null as any as ${type};`);
								}
							} else {
								// prevent "type X is imported but not used" (isn't silenced by @ts-nocheck) when svelte-check runs
								code.append(`;null as any as ${type};`);
							}

							modified = true;
						}
					} else if (
						is_server &&
						ts.isIdentifier(declaration.name) &&
						declaration.name?.text === 'actions' &&
						declaration.initializer
					) {
						// remove JSDoc comment from `export const actions = ..`
						const removed = replace_jsdoc_type_tags(node, declaration.initializer);
						// ... and move type to each individual action
						if (removed) {
							const rhs = declaration.initializer;
							if (ts.isObjectLiteralExpression(rhs)) {
								for (const prop of rhs.properties) {
									if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
										const rhs = prop.initializer;
										const replaced = replace_jsdoc_type_tags(prop, rhs);
										if (
											!replaced &&
											rhs &&
											(ts.isArrowFunction(rhs) || ts.isFunctionExpression(rhs)) &&
											rhs.parameters?.[0]
										) {
											const name = ts.isIdentifier(rhs.parameters[0].name)
												? rhs.parameters[0].name.text
												: 'event';
											code.prependRight(
												rhs.pos,
												`/** @param {import('./$types').RequestEvent} ${name} */ `
											);
										}
									}
								}
							}
						}

						// remove type from `export const actions: Actions ...`
						if (declaration.type) {
							let a = declaration.type.pos;
							let b = declaration.type.end;
							while (/\s/.test(content[a])) a += 1;

							const type = content.slice(a, b);
							code.remove(declaration.name.end, declaration.type.end);
							code.append(`;null as any as ${type};`);
							modified = true;

							// ... and move type to each individual action
							const rhs = declaration.initializer;
							if (ts.isObjectLiteralExpression(rhs)) {
								for (const prop of rhs.properties) {
									if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
										const rhs = prop.initializer;

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
													`: import('./$types').RequestEvent` + (add_parens ? ')' : '')
												);
											}
										}
									}
								}
							}
						}
					}
				}
			}
		});

		if (modified) {
			// Ignore all type errors so they don't show up twice when svelte-check runs
			// Account for possible @ts-check which would overwrite @ts-nocheck
			if (code.original.startsWith('// @ts-check')) {
				code.prependLeft('// @ts-check'.length, '\n// @ts-nocheck\n');
			} else {
				code.prepend('// @ts-nocheck\n');
			}
		}

		return {
			modified,
			code: code.toString(),
			exports: Array.from(exports.keys())
		};
	} catch {
		return null;
	}
}
