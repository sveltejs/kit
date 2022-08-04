import ts from 'typescript';
import MagicString from 'magic-string';
import {
	automigration,
	contains_only,
	dedent,
	error,
	get_exports,
	get_function_node,
	get_prop_initializer_text,
	manual_return_migration,
	rewrite_returns
} from '../utils.js';
import * as TASKS from '../tasks.js';

const give_up = `${error('Update load function', TASKS.PAGE_LOAD)}\n\n`;

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

		for (const statement of ast.statements) {
			const fn = get_function_node(statement, name);
			if (fn) {
				/** @type {Set<string>} */
				const imports = new Set();

				rewrite_returns(fn.body, (expr, node) => {
					if (ts.isObjectLiteralExpression(expr)) {
						const props = expr.properties;

						if (contains_only(expr, ['props'])) {
							automigration(expr, str, dedent(get_prop_initializer_text(props, 'props')));
						} else if (node) {
							if (
								contains_only(expr, ['redirect', 'status']) &&
								((Number(get_prop_initializer_text(props, 'status')) > 300 &&
									Number(get_prop_initializer_text(props, 'status')) < 310) ||
									contains_only(expr, ['redirect']))
							) {
								automigration(
									node,
									str,
									'throw redirect(' +
										get_prop_initializer_text(props, 'status') +
										(get_prop_initializer_text(props, 'redirect') === 'undefined'
											? ''
											: ', ' + get_prop_initializer_text(props, 'redirect')) +
										');'
								);
								imports.add('redirect');
							} else if (
								contains_only(expr, ['error', 'status']) &&
								(Number(get_prop_initializer_text(props, 'status')) > 399 ||
									contains_only(expr, ['error']))
							) {
								automigration(
									node,
									str,
									'throw error(' +
										get_prop_initializer_text(props, 'status') +
										(get_prop_initializer_text(props, 'error') === 'undefined'
											? ''
											: ', ' + get_prop_initializer_text(props, 'error')) +
										');'
								);
								imports.add('error');
							}
						} else {
							manual_return_migration(fn, str, TASKS.PAGE_LOAD);
						}
					} else {
						manual_return_migration(fn, str, TASKS.PAGE_LOAD);
					}
				});

				if (imports.size) {
					const has_imports = ast.statements.some((statement) => ts.isImportDeclaration(statement));
					const declaration = `import { ${[...imports.keys()].join(', ')} } from '@sveltejs/kit';`;

					return declaration + (has_imports ? '\n' : '\n\n') + str.toString();
				}

				return str.toString();
			}
		}

		// we failed to rewrite the load function, so we inject
		// an error at the top of the file
		return give_up + content;
	} catch {
		return give_up + content;
	}
}
