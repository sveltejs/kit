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
			if (exports.map.has('GET')) {
				const GET = get_function_node(statement, exports.map.get('GET'));
				if (GET) {
					// possible TODOs — handle errors and redirects
					rewrite_returns(GET.body, (expr, node) => {
						if (expr && ts.isObjectLiteralExpression(expr) && contains_only(expr, ['body'])) {
							automigration(expr, str, dedent(get_prop_initializer_text(expr.properties, 'body')));
						} else {
							manual_return_migration(node || GET, str, TASKS.PAGE_ENDPOINT);
						}
					});

					unmigrated.delete('GET');
				}
			}

			for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				if (exports.map.has(method)) {
					const fn = get_function_node(statement, exports.map.get(method));
					if (fn) {
						rewrite_returns(fn.body, (expr, node) => {
							manual_return_migration(node || fn, str, TASKS.PAGE_ENDPOINT);
						});

						unmigrated.delete(method);
					}
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
