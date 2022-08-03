import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import MagicString from 'magic-string';
import { rimraf } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { write } from './utils.js';

const module_names = new Set(['load']);
const server_names = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export function write_types(config, manifest_data) {
	rimraf(`${config.kit.outDir}/types`);

	const routes_dir = path.relative('.', config.kit.files.routes);

	manifest_data.routes.forEach((route) => {
		const outdir = `${config.kit.outDir}/types/${routes_dir}/${route.id}`;

		const imports = [];
		const declarations = [];
		const exports = [];

		const params = parse_route_id(route.id).names;

		declarations.push(
			`interface Params ${
				params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}'
			}`
		);

		if (route.type === 'page') {
			for (const node of route.layouts) {
				// TODO handle edge case where a layout doesn't have a sibling +page
			}

			if (route.page.module) {
				const content = fs.readFileSync(route.page.module, 'utf8');
				const proxy = tweak_types(content, module_names);

				if (proxy) {
					// TODO only do this if the module does in fact export `load`
					write(`${outdir}/proxy${path.basename(route.page.module)}`, proxy);
					imports.push(`import { load } from './proxy+page.js';`);
					exports.push(`export type Data = Awaited<ReturnType<typeof load>>;`);
				} else {
					// TODO bail out write file with `any` types
				}
			}

			if (route.page.server) {
				// TODO
			}

			// TODO write Load, GET, etc
			imports.push(`import type { Load as GenericLoad, GET as GenericGET } from '@sveltejs/kit';`);
			exports.push(`export type Load = GenericLoad<Params>;`);
			exports.push(`export type GET = GenericGET<Params>;`);
		} else {
			imports.push(`import type { RequestHandler as GenericRequestHandler } from '@sveltejs/kit';`);
			exports.push(`export type RequestHandler = GenericRequestHandler<Params>;`);
		}

		const output = `${imports.join('\n')}\n\n${declarations.join('\n')}\n\n${exports.join('\n')}`;

		write(`${outdir}/$types.d.ts`, output);
	});
}

/**
 * @param {string} content
 * @param {Set<string>} names
 */
function tweak_types(content, names) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			false,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {import('typescript').Node} node */
		function replace_jsdoc_type_tags(node) {
			if (node.jsDoc) {
				for (const comment of node.jsDoc) {
					for (const tag of comment.tags) {
						if (ts.isJSDocTypeTag(tag)) {
							code.overwrite(tag.tagName.pos, tag.tagName.end, 'param');
							code.prependRight(tag.typeExpression.pos + 1, 'Parameters<');
							code.appendLeft(tag.typeExpression.end - 1, '>[0]');
							code.appendLeft(tag.typeExpression.end, ' event');
						}
					}
				}
			}
		}

		ast.forEachChild((node) => {
			if (ts.isFunctionDeclaration(node) && node.name?.text && names.has(node.name?.text)) {
				// remove JSDoc comment above `export function load ...`
				replace_jsdoc_type_tags(node);
			}

			if (ts.isVariableStatement(node)) {
				// remove JSDoc comment above `export const load = ...`
				if (
					ts.isIdentifier(node.declarationList.declarations[0].name) &&
					names.has(node.declarationList.declarations[0].name.text)
				) {
					replace_jsdoc_type_tags(node);
				}

				for (const declaration of node.declarationList.declarations) {
					if (ts.isIdentifier(declaration.name) && names.has(declaration.name.text)) {
						// edge case — remove JSDoc comment above individual export
						replace_jsdoc_type_tags(declaration);

						// remove type from `export const load: Load ...`
						if (declaration.type) {
							const type = content.slice(declaration.type.pos, declaration.type.end);
							code.remove(declaration.name.end, declaration.type.end);

							const rhs = declaration.initializer;

							if (rhs && (ts.isArrowFunction(rhs) || ts.isFunctionExpression(rhs))) {
								const arg = rhs.parameters[0];

								const add_parens = content[arg.pos - 1] !== '(';

								if (add_parens) code.prependRight(arg.pos, '(');

								if (arg && !arg.type) {
									code.appendLeft(arg.name.end, `: Parameters<${type}>[0]` + (add_parens ? ')' : ''));
								}
							}
						}
					}
				}
			}
		});

		return code.toString();
	} catch {
		return null;
	}
}
