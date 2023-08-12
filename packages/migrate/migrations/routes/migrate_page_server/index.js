import ts from 'typescript';
import {
	automigration,
	error,
	get_function_node,
	get_object_nodes,
	manual_migration,
	manual_return_migration,
	parse,
	rewrite_returns,
	rewrite_type,
	unwrap,
	uppercase_migration
} from '../utils.js';
import * as TASKS from '../tasks.js';
import { dedent } from '../../../utils.js';

const give_up = `${error('Update +page.server.js', TASKS.PAGE_ENDPOINT)}\n\n`;

/**
 * @param {string} content
 * @param {string} filename
 * @returns {string}
 */
export function migrate_page_server(content, filename) {
	const file = parse(content);
	if (!file) return give_up + content;

	const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) =>
		file.exports.map.has(name)
	);

	// If user didn't do the uppercase verbs migration yet, do it here on the fly.
	const uppercased = uppercase_migration(methods, file);
	if (!uppercased) {
		return give_up + content;
	} else if (uppercased !== content) {
		return migrate_page_server(uppercased, filename);
	}

	const non_get_methods = methods.filter((name) => name !== 'GET');

	const unmigrated = new Set(methods);

	const match = /\+(?:(page)|(layout(?:-([^.@]+))?))/.exec(filename);
	const load_name = match?.[3]
		? `LayoutServerLoad.${match[3]}`
		: match?.[2]
		? 'LayoutServerLoad'
		: 'PageServerLoad';

	const has_load = file.exports.map.has('GET');
	const has_action = non_get_methods.some((method) => file.exports.map.has(method));

	for (const statement of file.ast.statements) {
		const GET_id = file.exports.map.get('GET');
		if (GET_id) {
			const GET = get_function_node(statement, GET_id);
			if (GET) {
				if (GET.body) {
					// possible TODOs — handle errors and redirects
					rewrite_returns(GET.body, (expr, node) => {
						const value = unwrap(expr);
						const nodes = ts.isObjectLiteralExpression(value) && get_object_nodes(value);

						if (!nodes || nodes.headers || (nodes.status && nodes.status.getText() !== '200')) {
							manual_return_migration(node || GET, file.code, TASKS.PAGE_ENDPOINT);
							return;
						}

						automigration(value, file.code, dedent(nodes.body?.getText() || ''));
					});
				}

				rewrite_type(GET, file.code, 'RequestHandler', load_name);

				if (ts.isFunctionDeclaration(GET) && GET.name) {
					automigration(GET.name, file.code, 'load');
				} else if (ts.isVariableDeclaration(GET.parent) && ts.isIdentifier(GET.parent.name)) {
					automigration(GET.parent.name, file.code, 'load');
				} else {
					manual_migration(GET, file.code, 'Rename GET to load', TASKS.PAGE_ENDPOINT);
				}

				unmigrated.delete('GET');
			}
		}

		for (const method of non_get_methods) {
			const fn = get_function_node(statement, /** @type{string} */ (file.exports.map.get(method)));
			if (fn?.body) {
				rewrite_returns(fn.body, (expr, node) => {
					manual_return_migration(node || fn, file.code, TASKS.PAGE_ENDPOINT);
				});

				rewrite_type(fn, file.code, 'RequestHandler', 'Action');

				unmigrated.delete(method);
			}
		}

		if (ts.isImportDeclaration(statement) && statement.importClause) {
			const bindings = statement.importClause.namedBindings;

			if (bindings && !ts.isNamespaceImport(bindings)) {
				for (const binding of bindings.elements) {
					if (binding.name.escapedText === 'RequestHandler') {
						const types = [has_load && load_name, has_action && 'Action'].filter(Boolean);

						file.code.overwrite(binding.getStart(), binding.getEnd(), types.join(', '));
					}
				}
			}
		}
	}

	if (unmigrated.size) {
		return give_up + file.code.toString();
	}

	return file.code.toString();
}
