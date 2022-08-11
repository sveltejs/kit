import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import { posixify, rimraf } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { write } from './utils.js';

/**
 * @typedef {{
 *   page?: import('types').PageNode;
 *   default_layout?: import('types').PageNode;
 *   named_layouts: Map<string, import('types').PageNode>;
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

const methods = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

const module_names = new Set(['load']);
const server_names = new Set(methods.map((m) => m.toUpperCase()));

/**
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

	rimraf(`${config.kit.outDir}/types`);

	const routes_dir = posixify(path.relative('.', config.kit.files.routes));

	/**
	 * A map of all directories : route files. We don't just use
	 * manifest_data.routes, because that will exclude +layout
	 * files that aren't accompanied by a +page
	 * @type {Map<string, NodeGroup>}
	 */
	const directories = new Map();

	/** @param {string} dir */
	function get_group(dir) {
		let group = directories.get(dir);
		if (!group) {
			group = {
				named_layouts: new Map()
			};
			directories.set(dir, group);
		}

		return group;
	}

	// first, populate `directories` with +page/+layout files...
	for (const node of manifest_data.nodes) {
		// skip default layout/error
		if (!node?.component?.startsWith(routes_dir)) continue;

		const parts = /** @type {string} */ (node.component ?? node.shared ?? node.server).split('/');

		const file = /** @type {string} */ (parts.pop());
		const dir = parts.join('/').slice(routes_dir.length + 1);

		// error pages don't need types
		if (file?.startsWith('+error')) continue;

		const group = get_group(dir);

		if (file?.startsWith('+page')) {
			group.page = node;
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
	}

	// ...then add +server.js files...
	for (const route of manifest_data.routes) {
		if (route.type === 'endpoint') {
			get_group(route.id).endpoint = route.file;
		}
	}

	// ...then, for each directory, write $types.d.ts
	for (const [dir, group] of directories) {
		const outdir = `${config.kit.outDir}/types/${routes_dir}/${dir}`;

		const imports = [`import type * as Kit from '@sveltejs/kit';`];

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

		if (group.page) {
			const { data, load, errors, exported } = process_node(ts, group.page, outdir, 'RouteParams');

			exports.push(`export type Errors = ${errors};`);

			exports.push(`export type PageData = ${data};`);
			if (load) {
				exports.push(`export type PageLoad = ${load};`);
			}

			if (exported) {
				exports.push(...exported);
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
					for (const name of parse_route_id(route.id).names) {
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
				const { data, load } = process_node(ts, group.default_layout, outdir, 'LayoutParams');
				exports.push(`export type LayoutData = ${data};`);
				if (load) {
					exports.push(`export type LayoutLoad = ${load};`);
				}
			}

			if (group.named_layouts.size > 0) {
				/** @type {string[]} */
				const data_exports = [];

				/** @type {string[]} */
				const load_exports = [];

				for (const [name, node] of group.named_layouts) {
					const { data, load } = process_node(ts, node, outdir, 'LayoutParams');
					data_exports.push(`export type ${name} = ${data};`);
					if (load) {
						load_exports.push(`export type ${name} = ${load};`);
					}
				}

				exports.push(`\nexport namespace LayoutData {\n\t${data_exports.join('\n\t')}\n}`);
				exports.push(`\nexport namespace LayoutLoad {\n\t${load_exports.join('\n\t')}\n}`);
			}
		}

		if (group.endpoint) {
			exports.push(`export type RequestHandler = Kit.RequestHandler<RouteParams>;`);
		}

		const output = [imports.join('\n'), declarations.join('\n'), exports.join('\n')]
			.filter(Boolean)
			.join('\n\n');

		write(`${outdir}/$types.d.ts`, output);
	}
}

/**
 * @param {import('typescript')} ts
 * @param {import('types').PageNode} node
 * @param {string} outdir
 * @param {string} params
 */
function process_node(ts, node, outdir, params) {
	let data;
	let load;
	let errors;
	let exported;

	let server_data;

	if (node.server) {
		const content = fs.readFileSync(node.server, 'utf8');
		const proxy = tweak_types(ts, content, server_names);
		const basename = path.basename(node.server);
		if (proxy?.modified) {
			write(`${outdir}/proxy${basename}`, proxy.code);
		}
		server_data = get_data_type(node.server, 'GET', 'null', proxy);
		if (proxy) {
			const types = [];
			for (const method of ['POST', 'PUT', 'PATCH']) {
				if (proxy.exports.includes(method)) {
					if (proxy.modified) {
						types.push(`Kit.AwaitedErrors<typeof import('./proxy${basename}').${method}>`);
					} else {
						// If the file wasn't tweaked, we can use the return type of the original file.
						// The advantage is that type updates are reflected without saving.
						types.push(
							`Kit.AwaitedErrors<typeof import("${path_to_original(
								outdir,
								node.server
							)}").${method}>`
						);
					}
				}
			}
			errors = types.length ? types.join(' | ') : 'null';
		} else {
			errors = 'unknown';
		}

		// TODO replace when GET becomes load and POST etc become actions
		exported = methods.map((name) => `export type ${name} = Kit.${name}<${params}>;`);
	} else {
		server_data = 'null';
	}

	if (node.shared) {
		const content = fs.readFileSync(node.shared, 'utf8');
		const proxy = tweak_types(ts, content, module_names);
		if (proxy?.modified) {
			write(`${outdir}/proxy${path.basename(node.shared)}`, proxy.code);
		}
		data = get_data_type(node.shared, 'load', server_data, proxy);

		load = `Kit.Load<${params}, ${server_data}>`;
	} else {
		data = server_data;
	}

	return { data, load, errors, exported };

	/**
	 * @param {string} file_path
	 * @param {string} method
	 * @param {string} fallback
	 * @param {Proxy} proxy
	 */
	function get_data_type(file_path, method, fallback, proxy) {
		if (proxy) {
			if (proxy.exports.includes(method)) {
				if (proxy.modified) {
					const basename = path.basename(file_path);
					return `Kit.AwaitedProperties<Awaited<ReturnType<typeof import('./proxy${basename}').${method}>>>`;
				} else {
					// If the file wasn't tweaked, we can use the return type of the original file.
					// The advantage is that type updates are reflected without saving.
					return `Kit.AwaitedProperties<Awaited<ReturnType<typeof import("${path_to_original(
						outdir,
						file_path
					)}").${method}>>>`;
				}
			} else {
				return fallback;
			}
		} else {
			return 'unknown';
		}
	}
}

/**
 * @param {string} outdir
 * @param {string} file_path
 */
function path_to_original(outdir, file_path) {
	const ext = path.extname(file_path);
	return posixify(
		path.relative(
			outdir,
			path.join(
				cwd,
				// Another extension than `.js` (or nothing, but that fails with node16 moduleResolution)
				// will result in TS failing to lookup the file
				file_path.slice(0, -ext.length) + '.js'
			)
		)
	);
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

							if (rhs && (ts.isArrowFunction(rhs) || ts.isFunctionExpression(rhs))) {
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
