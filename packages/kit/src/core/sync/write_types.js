import fs from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import { rimraf } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { write } from './utils.js';

const methods = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

const module_names = new Set(['load']);
const server_names = new Set(methods.map((m) => m.toUpperCase()));

/**
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export async function write_types(config, manifest_data) {
	rimraf(`${config.kit.outDir}/types`);

	/** @type {import('typescript') | undefined} */
	let ts = undefined;
	try {
		ts = (await import('typescript')).default;
	} catch (e) {
		// No TypeScript installed - skip proxy generation
	}

	const routes_dir = path.relative('.', config.kit.files.routes);

	manifest_data.routes.forEach((route) => {
		const outdir = `${config.kit.outDir}/types/${routes_dir}/${route.id}`;

		const imports = [];
		const declarations = [];
		const exports = [];

		const params = parse_route_id(route.id).names;

		declarations.push(
			`interface Params extends Record<string, string> ${
				params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}'
			}`
		);

		if (route.type === 'page') {
			imports.push(
				`import type {\n\t${['Load', ...methods]
					.map((name) => `${name} as Generic${name}`)
					.join(',\n\t')}\n} from '@sveltejs/kit';`
			);

			for (const node of route.layouts) {
				// TODO handle edge case where a layout doesn't have a sibling +page
			}

			if (route.page.module) {
				const content = fs.readFileSync(route.page.module, 'utf8');
				const proxy = ts && tweak_types(ts, content, module_names);

				if (proxy) {
					if (proxy.exports.includes('load')) {
						const basename = path.basename(route.page.module);
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

			if (route.page.server) {
				const content = fs.readFileSync(route.page.server, 'utf8');
				const proxy = ts && tweak_types(ts, content, server_names);

				if (proxy) {
					if (proxy.exports.includes('GET')) {
						// TODO handle validation errors from POST/PUT/PATCH
						const basename = path.basename(route.page.server);
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

			if (route.page.server && !route.page.module) {
				exports.push(`export type Data = ServerData;`);
			}

			exports.push(
				`export type Load = GenericLoad<Params, ServerData>;`,
				...methods.map((name) => `export type ${name} = Generic${name}<Params>;`)
			);
		} else {
			imports.push(`import type { RequestHandler as GenericRequestHandler } from '@sveltejs/kit';`);
			exports.push(`export type RequestHandler = GenericRequestHandler<Params>;`);
		}

		const output = `${imports.join('\n')}\n\n${declarations.join('\n')}\n\n${exports.join('\n')}`;

		write(`${outdir}/$types.d.ts`, output);
	});
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
					replace_jsdoc_type_tags(node, (node.declarationList.declarations[0].initializer));
				}

				for (const declaration of node.declarationList.declarations) {
					if (ts.isIdentifier(declaration.name) && names.has(declaration.name.text) && declaration.initializer) {
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
