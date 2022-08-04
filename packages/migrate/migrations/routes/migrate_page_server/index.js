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

const give_up = `${error('Update +page.server.js', TASKS.PAGE_ENDPOINT)}\n\n`;

/** @param {string} content */
export function migrate_page_server(content) {
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

		const unmigrated = new Set(
			['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) => exports.map.has(name))
		);

		for (const statement of ast.statements) {
			const GET = get_function_node(statement, exports.map.get('GET'));
			if (GET) {
				// possible TODOs — handle errors and redirects
				rewrite_returns(GET.body, (node) => {
					if (
						node.expression &&
						ts.isObjectLiteralExpression(node.expression) &&
						contains_only(node.expression, ['body'])
					) {
						automigration(
							node.expression,
							str,
							dedent(get_prop_initializer_text(node.expression.properties, 'body'))
						);
					} else {
						manual_return_migration(node, str, TASKS.PAGE_ENDPOINT);
					}
				});

				unmigrated.delete('GET');
			}

			for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				const fn = get_function_node(statement, exports.map.get(method));
				if (fn) {
					rewrite_returns(fn.body, (node) => {
						manual_return_migration(node, str, TASKS.PAGE_ENDPOINT);
					});

					unmigrated.delete(method);
				}
			}
		}

		if (unmigrated.size) {
			return give_up + str.toString();
		}

		return str.toString();
	} catch {
		return give_up + content;
	}
}
