import ts from 'typescript';
import {
	automigration,
	dedent,
	error,
	get_function_node,
	get_object_nodes,
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
		const GET_id = file.exports.map.get('GET');
		if (GET_id) {
			const GET = get_function_node(statement, GET_id);
			if (GET?.body) {
				// possible TODOs — handle errors and redirects
				rewrite_returns(GET.body, (expr, node) => {
					const nodes = ts.isObjectLiteralExpression(expr) && get_object_nodes(expr);

					if (!nodes || nodes.headers || (nodes.status && nodes.status.getText() !== '200')) {
						manual_return_migration(node || GET, file.code, TASKS.PAGE_ENDPOINT);
						return;
					}

					automigration(expr, file.code, dedent(nodes.body.getText()));
				});

				unmigrated.delete('GET');
			}
		}

		for (const method of non_get_methods) {
			const fn = get_function_node(statement, /** @type{string} */ (file.exports.map.get(method)));
			if (fn?.body) {
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
