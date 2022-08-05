import ts from 'typescript';
import {
	automigration,
	dedent,
	error,
	get_function_node,
	get_object_nodes,
	is_new,
	is_string_like,
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
				const nodes = ts.isObjectLiteralExpression(expr) && get_object_nodes(expr);

				if (nodes) {
					const keys = Object.keys(nodes).sort().join(' ');

					if (keys === 'props') {
						automigration(expr, file.code, dedent(nodes.props.getText()));
						return;
					}

					// check for existence of `node`, otherwise it's an arrow function
					// with an implicit body, which we bail out on
					if (node) {
						const status = nodes.status && Number(nodes.status.getText());

						// logic based on https://github.com/sveltejs/kit/blob/67e2342149847d267eb0c50809a1f93f41fa529b/packages/kit/src/runtime/load.js
						if (keys === 'redirect status' && status > 300 && status < 400) {
							automigration(
								node,
								file.code,
								`throw redirect(${status}, ${nodes.redirect.getText()});`
							);
							imports.add('redirect');
							return;
						}

						if (nodes.error) {
							const message = is_string_like(nodes.error)
								? nodes.error.getText()
								: is_new(nodes.error, 'Error') && nodes.error.arguments[0].getText();

							if (message) {
								automigration(node, file.code, `throw error(${status || 500}, ${message});`);
								imports.add('error');
								return;
							}
						} else if (status >= 400) {
							automigration(node, file.code, `throw error(${status});`);
							imports.add('error');
							return;
						}
					}
				}

				manual_return_migration(node || fn, file.code, TASKS.PAGE_LOAD);
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
