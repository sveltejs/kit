import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import { posixify, rimraf, walk } from '../../utils/filesystem.js';
import { compact } from '../../utils/array.js';

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

const shared_names = new Set(['load']);
const server_names = new Set(['load', 'POST', 'PUT', 'PATCH', 'DELETE']); // TODO replace with a single `action`

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

	// For each directory, write $types.d.ts
	for (const route of manifest_data.routes) {
		update_types(config, manifest_data, route);
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

	const filepath = path.relative(config.kit.files.routes, file);
	const id = path.dirname(filepath);

	const route = manifest_data.routes.find((route) => route.id === id);
	if (!route) return; // this shouldn't ever happen

	update_types(config, manifest_data, route);
}

/**
 *
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 * @param {import('types').RouteData} route
 */
function update_types(config, manifest_data, route) {
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

	if (!route.leaf && !route.layout && !route.endpoint) return; // nothing to do

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

	const imports = [`import type * as Kit from '@sveltejs/kit';`];

	/** @type {string[]} */
	const declarations = [];

	/** @type {string[]} */
	const exports = [];

	if (route.names.length > 0) {
		const params = route.names.map((param) => `${param}: string`).join('; ');
		declarations.push(
			`interface RouteParams extends Partial<Record<string, string>> { ${params} }`
		);
	} else {
		declarations.push(`interface RouteParams extends Partial<Record<string, string>> {}`);
	}

	if (route.leaf) {
		const { data, server_data, load, server_load, errors, written_proxies } = process_node(
			route.leaf,
			outdir,
			'RouteParams'
		);

		for (const file of written_proxies) to_delete.delete(file);

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

		if (route.leaf.server) {
			exports.push(`export type Action = Kit.Action<RouteParams>`);
		}
	}

	if (route.layout) {
		// TODO collect children in create_manifest_data, instead of this inefficient O(n^2) algorithm
		const layout_params = new Set();
		manifest_data.routes.forEach((other) => {
			if (other.page && other.id.startsWith(route.id + '/')) {
				// TODO this is O(n^2), see if we need to speed it up
				for (const name of other.names) {
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

		const { data, server_data, load, server_load, written_proxies } = process_node(
			route.layout,
			outdir,
			'LayoutParams'
		);

		for (const file of written_proxies) to_delete.delete(file);

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

	if (route.endpoint) {
		exports.push(`export type RequestHandler = Kit.RequestHandler<RouteParams>;`);
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
 * @param {string} params
 */
function process_node(node, outdir, params) {
	let data;
	let load;
	let server_load;
	let errors;

	/** @type {string[]} */
	let written_proxies = [];

	let server_data;

	if (node.server) {
		const content = fs.readFileSync(node.server, 'utf8');
		const proxy = tweak_types(content, server_names);
		const basename = path.basename(node.server);
		if (proxy?.modified) {
			fs.writeFileSync(`${outdir}/proxy${basename}`, proxy.code);
			written_proxies.push(`proxy${basename}`);
		}

		server_data = get_data_type(node.server, 'null', proxy);
		server_load = `Kit.ServerLoad<${params}, ${get_parent_type(
			node,
			'LayoutServerData'
		)}, OutputData>`;

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

	const parent_type = get_parent_type(node, 'LayoutData');

	if (node.shared) {
		const content = fs.readFileSync(node.shared, 'utf8');
		const proxy = tweak_types(content, shared_names);
		if (proxy?.modified) {
			fs.writeFileSync(`${outdir}/proxy${path.basename(node.shared)}`, proxy.code);
			written_proxies.push(`proxy${path.basename(node.shared)}`);
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

	let parent_str = parent_imports[0] || 'Record<never, never>';
	for (let i = 1; i < parent_imports.length; i++) {
		// Omit is necessary because a parent could have a property with the same key which would
		// cause a type conflict. At runtime the child overwrites the parent property in this case,
		// so reflect that in the type definition.
		parent_str = `Omit<${parent_str}, keyof ${parent_imports[i]}> & ${parent_imports[i]}`;
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
 * @param {Set<string>} names
 * @returns {Proxy}
 */
export function tweak_types(content, names) {
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
