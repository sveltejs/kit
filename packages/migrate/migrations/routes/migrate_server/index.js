import ts from 'typescript';
import {
	automigration,
	uppercase_migration,
	error,
	get_function_node,
	get_object_nodes,
	is_new,
	is_string_like,
	manual_return_migration,
	parse,
	rewrite_returns,
	unwrap
} from '../utils.js';
import * as TASKS from '../tasks.js';
import { dedent, guess_indent, indent_at_line } from '../../../utils.js';

const give_up = `${error('Update +server.js', TASKS.STANDALONE_ENDPOINT)}\n\n`;

/**
 * @param {string} content
 * @returns {string}
 */
export function migrate_server(content) {
	const file = parse(content);
	if (!file) return give_up + content;

	const indent = guess_indent(content);

	const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) =>
		file.exports.map.has(name)
	);

	// If user didn't do the uppercase verbs migration yet, do it here on the fly.
	const uppercased = uppercase_migration(methods, file);
	if (!uppercased) {
		return give_up + content;
	} else if (uppercased !== content) {
		return migrate_server(uppercased);
	}

	const unmigrated = new Set(methods);

	/** @type {Map<string, string>} */
	const imports = new Map();

	for (const statement of file.ast.statements) {
		for (const method of methods) {
			const fn = get_function_node(statement, /** @type{string} */ (file.exports.map.get(method)));
			if (fn?.body) {
				rewrite_returns(fn.body, (expr, node) => {
					// leave `() => new Response(...)` alone
					if (is_new(expr, 'Response')) return;

					const value = unwrap(expr);
					const nodes = ts.isObjectLiteralExpression(value) && get_object_nodes(value);

					if (nodes) {
						const body_is_object_literal = nodes.body && ts.isObjectLiteralExpression(nodes.body);

						if (body_is_object_literal || (nodes.body && ts.isIdentifier(nodes.body))) {
							let result;

							let name = 'json';
							let i = 1;
							while (content.includes(name)) name = `json$${i++}`;

							imports.set('json', name);

							const body = dedent(nodes.body.getText());

							if (nodes.headers || (nodes.status && nodes.status.getText() !== '200')) {
								const start = indent_at_line(content, expr.pos);
								const properties = [];

								if (nodes.status && nodes.status.getText() !== '200') {
									properties.push(`status: ${nodes.status.getText()}`);
								}

								if (nodes.headers) {
									properties.push(`headers: ${nodes.headers.getText()}`);
								}

								const ws = `\n${start}`;
								const init = `{${ws}${indent}${properties.join(`,${ws}${indent}`)}${ws}}`;

								result = `${name}(${body}, ${init})`;
							} else {
								result = `${name}(${body})`;
							}

							if (body_is_object_literal) {
								automigration(expr, file.code, result);
							} else {
								manual_return_migration(
									node || fn,
									file.code,
									TASKS.STANDALONE_ENDPOINT,
									`return ${result};`
								);
							}

							return;
						}

						let safe_headers = !nodes.headers || !ts.isObjectLiteralExpression(nodes.headers);
						if (nodes.headers && ts.isObjectLiteralExpression(nodes.headers)) {
							// if `headers` is an object literal, and it either doesn't contain
							// `set-cookie` or `set-cookie` is a string, then the headers
							// are safe to use in a `Response`
							const set_cookie_value = nodes.headers.properties.find((prop) => {
								return (
									ts.isPropertyAssignment(prop) &&
									ts.isStringLiteral(prop.name) &&
									/set-cookie/i.test(prop.name.text)
								);
							});

							if (!set_cookie_value || is_string_like(set_cookie_value)) {
								safe_headers = true;
							}
						}

						const safe_body =
							!nodes.body ||
							is_string_like(nodes.body) ||
							(ts.isCallExpression(nodes.body) &&
								nodes.body.expression.getText() === 'JSON.stringify');

						if (safe_headers) {
							const status = nodes.status ? nodes.status.getText() : '200';
							const headers = nodes.headers?.getText();
							const body = dedent(nodes.body?.getText() || 'undefined');

							const multiline = /\n/.test(headers);

							const init = [
								status !== '200' && `status: ${status}`,
								headers && `headers: ${headers}`
							].filter(Boolean);

							const indent = indent_at_line(content, expr.getStart());
							const end_whitespace = multiline ? `\n${indent}` : ' ';
							const join_whitespace = multiline ? end_whitespace + guess_indent(content) : ' ';

							const response =
								init.length > 0
									? `new Response(${body}, {${join_whitespace}${init.join(
											`,${join_whitespace}`
									  )}${end_whitespace}})`
									: `new Response(${body})`;

							if (safe_body) {
								automigration(expr, file.code, response);
							} else {
								manual_return_migration(
									node || fn,
									file.code,
									TASKS.STANDALONE_ENDPOINT,
									`return ${response};`
								);
							}

							return;
						}
					}

					manual_return_migration(node || fn, file.code, TASKS.STANDALONE_ENDPOINT);
				});

				unmigrated.delete(method);
			}
		}
	}

	if (imports.size) {
		const has_imports = file.ast.statements.some((statement) => ts.isImportDeclaration(statement));
		const specifiers = Array.from(imports).map(([name, local]) =>
			name === local ? name : `${name} as ${local}`
		);
		const declaration = `import { ${specifiers.join(', ')} } from '@sveltejs/kit';`;
		file.code.prependLeft(0, declaration + (has_imports ? '\n' : '\n\n'));
	}

	if (unmigrated.size) {
		return give_up + file.code.toString();
	}

	return file.code.toString();
}
