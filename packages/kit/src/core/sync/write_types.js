import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import { rimraf } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { write } from './utils.js';

/**
 * @typedef {{
 *   page?: import('types').PageNode;
 *   layouts: Map<string, import('types').PageNode>;
 * }} PageNodeGroup
 */

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

	const routes_dir = path.relative('.', config.kit.files.routes);

	/**
	 * A map of all directories : route files. We don't just use
	 * manifest_data.routes, because that will exclude +layout
	 * files that aren't accompanied by a +page
	 * @type {Map<string, PageNodeGroup>}
	 */
	const directories = new Map();

	for (const node of manifest_data.nodes) {
		// skip default layout/error
		if (!node?.component?.startsWith(routes_dir)) continue;

		const parts = /** @type {string} */ (node.component ?? node.module ?? node.server).split('/');

		const file = /** @type {string} */ (parts.pop());
		const dir = parts.join('/');

		// error pages don't need types
		if (file?.startsWith('+error')) continue;

		if (!directories.has(dir)) {
			directories.set(dir, {
				layouts: new Map()
			});
		}

		const group = /** @type {PageNodeGroup} */ (directories.get(dir));

		if (file?.startsWith('+page')) {
			group.page = node;
		} else {
			const match = /^\+layout(?:-([^@.]+))?/.exec(file);

			// this shouldn't happen, but belt and braces. also keeps TS happy,
			// and we live to keep TS happy
			if (!match) throw new Error(`Unexpected route file: ${file}`);

			group.layouts.set(match[1] ?? 'default', node);
		}
	}

	for (const [dir, group] of directories) {
		const outdir = `${config.kit.outDir}/types/${dir}`;

		const imports = [];
		const declarations = [];
		const exports = [];

		const id = dir.slice(routes_dir.length + 1);
		const params = parse_route_id(id).names;

		declarations.push(
			`interface Params extends Record<string, string> ${
				params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}'
			}`
		);

		imports.push(
			`import type {\n\t${['Load', ...methods]
				.map((name) => `${name} as Generic${name}`)
				.join(',\n\t')}\n} from '@sveltejs/kit';`
		);

		if (group.page) {
			if (group.page.module) {
				const content = fs.readFileSync(group.page.module, 'utf8');
				const proxy = ts && tweak_types(ts, content, module_names);

				if (proxy) {
					if (proxy.exports.includes('load')) {
						const basename = path.basename(group.page.module);
						write(`${outdir}/proxy${basename}`, proxy.code);
						imports.push(`import { load } from './proxy${basename}';`);
						exports.push(`export type Data = Awaited<ReturnType<typeof load>>;`);
					} else {
						exports.push(`export type Data = ServerData;`);
					}
				} else {
					exports.push(`export type Data = unknown;`);
				}
			}

			if (group.page.server) {
				const content = fs.readFileSync(group.page.server, 'utf8');
				const proxy = ts && tweak_types(ts, content, server_names);

				if (proxy) {
					if (proxy.exports.includes('GET')) {
						// TODO handle validation errors from POST/PUT/PATCH
						const basename = path.basename(group.page.server);
						write(`${outdir}/proxy${basename}`, proxy.code);
						imports.push(`import { GET } from './proxy${basename}';`);
						declarations.push(`type ServerData = Awaited<ReturnType<typeof GET>>;`);
					} else {
						declarations.push(`type ServerData = null;`);
					}
				} else {
					declarations.push(`type ServerData = unknown;`);
				}
			} else {
				declarations.push(`type ServerData = null;`);
			}

			if (group.page.server && !group.page.module) {
				exports.push(`export type Data = ServerData;`);
			}

			exports.push(
				`export type Load = GenericLoad<Params, ServerData>;`,
				...methods.map((name) => `export type ${name} = Generic${name}<Params>;`)
			);
		}

		const output = `${imports.join('\n')}\n\n${declarations.join('\n')}\n\n${exports.join('\n')}`;

		write(`${outdir}/$types.d.ts`, output);
	}

	for (const route of manifest_data.routes) {
		if (route.type === 'page') continue;

		const params = parse_route_id(route.id).names;

		const statements = [
			`import type { RequestHandler as GenericRequestHandler } from '@sveltejs/kit';`,
			`interface Params extends Record<string, string> ${
				params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}'
			}`,
			`export type RequestHandler = GenericRequestHandler<Params>;`
		].join('\n\n');

		const outdir = `${config.kit.outDir}/types/${routes_dir}/${route.id}`;
		write(`${outdir}/$types.d.ts`, statements);
	}
}

/**
 * @param {import('typescript')} ts
 * @param {string} content
 * @param {Set<string>} names
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

		if (modified || exports.size > 0) {
			return {
				code: code.toString(),
				exports: Array.from(exports.keys())
			};
		} else {
			return null;
		}
	} catch {
		return null;
	}
}
