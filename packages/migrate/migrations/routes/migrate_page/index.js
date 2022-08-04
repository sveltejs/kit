import ts from 'typescript';
import {
	automigration,
	contains_only,
	dedent,
	error,
	get_function_node,
	get_prop_initializer_text,
	manual_return_migration,
	parse,
	rewrite_returns
} from '../utils.js';
import * as TASKS from '../tasks.js';

const give_up = `${error('Update load function', TASKS.PAGE_LOAD)}\n\n`;

/** @param {string} content */
export function migrate_page(content) {
	// early out if we can tell there's no load function
	// without parsing the file
	if (!/load/.test(content)) return content;

	const file = parse(content);
	if (!file) return give_up + content;

	if (!file.exports.map.has('load') && !file.exports.complex) {
		// there's no load function here, so there's nothing to do
		return content;
	}

	const name = file.exports.map.get('load');

	for (const statement of file.ast.statements) {
		const fn = get_function_node(statement, name);
		if (fn) {
			/** @type {Set<string>} */
			const imports = new Set();

			rewrite_returns(fn.body, (expr, node) => {
				if (ts.isObjectLiteralExpression(expr)) {
					const props = expr.properties;

					if (contains_only(expr, ['props'])) {
						automigration(expr, file.code, dedent(get_prop_initializer_text(props, 'props')));
						return;
					}

					// check for existence of `node`, otherwise it's an arrow function
					// with an implicit body, which we bail out on
					if (node) {
						const status_str = get_prop_initializer_text(props, 'status');
						const status = Number(status_str);

						if (
							contains_only(expr, ['redirect', 'status']) &&
							((status > 300 && status < 310) || contains_only(expr, ['redirect']))
						) {
							automigration(
								node,
								file.code,
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
							(status >= 400 || contains_only(expr, ['error']))
						) {
							automigration(
								node,
								file.code,
								'throw error(' +
									get_prop_initializer_text(props, 'status') +
									(get_prop_initializer_text(props, 'error') === 'undefined'
										? ''
										: ', ' + get_prop_initializer_text(props, 'error')) +
									');'
							);
							imports.add('error');
						} else {
							manual_return_migration(node, file.code, TASKS.PAGE_LOAD);
						}
					}
				}

				manual_return_migration(fn, file.code, TASKS.PAGE_LOAD);
			});

			if (imports.size) {
				const has_imports = file.ast.statements.some((statement) =>
					ts.isImportDeclaration(statement)
				);
				const declaration = `import { ${[...imports.keys()].join(', ')} } from '@sveltejs/kit';`;

				return declaration + (has_imports ? '\n' : '\n\n') + file.code.toString();
			}

			return file.code.toString();
		}
	}

	// we failed to rewrite the load function, so we inject
	// an error at the top of the file
	return give_up + content;
}
