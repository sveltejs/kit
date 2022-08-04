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

const give_up = `${error('Update +page.server.js', TASKS.PAGE_ENDPOINT)}\n\n`;

/** @param {string} content */
export function migrate_page_server(content) {
	const file = parse(content);
	if (!file) return give_up + content;

	const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) =>
		file.exports.map.has(name)
	);

	const non_get_methods = methods.filter((name) => name !== 'GET');

	const unmigrated = new Set(methods);

	for (const statement of file.ast.statements) {
		if (file.exports.map.has('GET')) {
			const GET = get_function_node(statement, file.exports.map.get('GET'));
			if (GET) {
				// possible TODOs — handle errors and redirects
				rewrite_returns(GET.body, (expr, node) => {
					if (expr && ts.isObjectLiteralExpression(expr) && contains_only(expr, ['body'])) {
						automigration(
							expr,
							file.code,
							dedent(get_prop_initializer_text(expr.properties, 'body'))
						);
					} else {
						manual_return_migration(node || GET, file.code, TASKS.PAGE_ENDPOINT);
					}
				});

				unmigrated.delete('GET');
			}
		}

		for (const method of non_get_methods) {
			const fn = get_function_node(statement, file.exports.map.get(method));
			if (fn) {
				rewrite_returns(fn.body, (expr, node) => {
					manual_return_migration(node || fn, file.code, TASKS.PAGE_ENDPOINT);
				});

				unmigrated.delete(method);
			}
		}
	}

	if (unmigrated.size) {
		return give_up + file.code.toString();
	}

	return file.code.toString();
}
