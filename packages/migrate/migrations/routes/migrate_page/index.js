import ts from 'typescript';
import MagicString from 'magic-string';
import {
	automigration,
	contains_only,
	dedent,
	error,
	get_exports,
	get_prop_initializer_text,
	is_directly_in_exported_fn,
	manual_return_migration
} from '../utils.js';
import * as TASKS from '../tasks.js';

/** @param {string} content */
export function migrate_page(content) {
	// early out if we can tell there's no load function
	// without parsing the file
	if (!/load/.test(content)) return content;

	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);
		const str = new MagicString(content);

		const exports = get_exports(ast);

		if (!exports.map.has('load') && !exports.complex) {
			// there's no load function here, so there's nothing to do
			return content;
		}

		const name = exports.map.get('load');

		const has_imports = ast.statements.some((statement) => ts.isImportDeclaration(statement));

		for (const statement of ast.statements) {
			if (ts.isFunctionDeclaration(statement) && statement.name.text === name) {
				// export function load ...
				return rewrite_load(statement, str, has_imports);
			}

			if (ts.isVariableStatement(statement)) {
				statement.declarationList.declarations.forEach((declaration) => {
					if (
						ts.isIdentifier(declaration.name) &&
						declaration.name.text === name &&
						(ts.isArrowFunction(declaration.initializer) ||
							ts.isFunctionExpression(declaration.initializer))
					) {
						// export const load = ...
						return rewrite_load(declaration.initializer, str, has_imports);
					}
				});
			}
		}

		// we failed to rewrite the load function, so we inject
		// an error at the top of the file
		return `${error('Update load function', TASKS.PAGE_LOAD)}\n\n${content}`;
	} catch {
		return `${error('Update load function', TASKS.PAGE_LOAD)}\n\n${content}`;
	}
}

/**
 * @param {ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction} fn
 * @param {MagicString} str
 * @param {boolean} has_imports
 * @returns {string}
 */
function rewrite_load(fn, str, has_imports) {
	/** @type {Set<string>} */
	const imports = new Set();

	/** @param {ts.Node} node */
	function walk(node) {
		if (
			ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node) ||
			ts.isFunctionDeclaration(node)
		) {
			// don't cross this boundary
			return;
		}

		if (ts.isReturnStatement(node)) {
			if (node.expression && ts.isObjectLiteralExpression(node.expression)) {
				if (contains_only(node.expression, ['props'])) {
					automigration(
						node.expression,
						str,
						dedent(get_prop_initializer_text(node.expression.properties, 'props'))
					);
				} else if (
					contains_only(node.expression, ['redirect', 'status']) &&
					((Number(get_prop_initializer_text(node.expression.properties, 'status')) > 300 &&
						Number(get_prop_initializer_text(node.expression.properties, 'status')) < 310) ||
						contains_only(node.expression, ['redirect']))
				) {
					automigration(
						node,
						str,
						'throw redirect(' +
							get_prop_initializer_text(node.expression.properties, 'status') +
							(get_prop_initializer_text(node.expression.properties, 'redirect') === 'undefined'
								? ''
								: ', ' + get_prop_initializer_text(node.expression.properties, 'redirect')) +
							');'
					);
					imports.add('redirect');
				} else if (
					contains_only(node.expression, ['error', 'status']) &&
					(Number(get_prop_initializer_text(node.expression.properties, 'status')) > 399 ||
						contains_only(node.expression, ['error']))
				) {
					automigration(
						node,
						str,
						'throw error(' +
							get_prop_initializer_text(node.expression.properties, 'status') +
							(get_prop_initializer_text(node.expression.properties, 'error') === 'undefined'
								? ''
								: ', ' + get_prop_initializer_text(node.expression.properties, 'error')) +
							');'
					);
					imports.add('error');
				}
			} else {
				manual_return_migration(node, str, TASKS.PAGE_LOAD);
			}

			return;
		}

		node.forEachChild(walk);
	}

	fn.body.forEachChild(walk);

	if (imports.size) {
		const declaration = `import { ${[...imports.keys()].join(', ')} } from '@sveltejs/kit';`;
		return declaration + (has_imports ? '\n' : '\n\n') + str.toString();
	}

	return str.toString();
}
