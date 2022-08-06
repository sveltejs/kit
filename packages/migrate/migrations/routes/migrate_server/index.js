import ts from 'typescript';
import {
	automigration,
	dedent,
	error,
	get_function_node,
	get_object_nodes,
	guess_indent,
	indent_at_line,
	is_new,
	is_string_like,
	manual_return_migration,
	parse,
	rewrite_returns
} from '../utils.js';
import * as TASKS from '../tasks.js';

const give_up = `${error('Update +page.server.js', TASKS.STANDALONE_ENDPOINT)}\n\n`;

/** @param {string} content */
export function migrate_server(content) {
	const file = parse(content);
	if (!file) return give_up + content;

	const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((name) =>
		file.exports.map.has(name)
	);

	const unmigrated = new Set(methods);

	for (const statement of file.ast.statements) {
		for (const method of methods) {
			const fn = get_function_node(statement, /** @type{string} */ (file.exports.map.get(method)));
			if (fn?.body) {
				rewrite_returns(fn.body, (expr, node) => {
					// leave `() => new Response(...)` alone
					if (is_new(expr, 'Response')) return;

					const nodes = ts.isObjectLiteralExpression(expr) && get_object_nodes(expr);

					if (nodes) {
						const body_is_object_literal = nodes.body && ts.isObjectLiteralExpression(nodes.body);

						let safe_headers = !nodes.headers;
						if (nodes.headers) {
							if (ts.isObjectLiteralExpression(nodes.headers)) {
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
							} else {
								// `headers: new Headers(...)` is also safe, as long as we
								// don't need to augment it with `content-type`
								safe_headers = is_new(nodes.headers, 'Headers') && !body_is_object_literal;
							}
						}

						const safe_body =
							!nodes.body ||
							is_string_like(nodes.body) ||
							body_is_object_literal ||
							(ts.isCallExpression(nodes.body) &&
								nodes.body.expression.getText() === 'JSON.stringify');

						if (safe_headers) {
							let status = nodes.status ? nodes.status.getText() : '200';
							let headers = nodes.headers?.getText();
							let body = dedent(nodes.body?.getText() || 'undefined');

							const multiline = /\n/.test(headers);

							if (body_is_object_literal || (nodes.body && ts.isIdentifier(nodes.body))) {
								// `return { body: {...} }` is safe to convert to a JSON response,
								// but we probably need to add a `content-type` header
								body = `JSON.stringify(${body})`;
								const header = `'content-type': 'application/json; charset=utf-8'`;
								if (
									nodes.headers &&
									ts.isObjectLiteralExpression(nodes.headers) &&
									nodes.headers.properties.length > 0
								) {
									const join = multiline
										? `,\n${indent_at_line(content, nodes.headers.properties[0].getStart())}`
										: `, `;
									headers = headers.replace(/[{\s]/, header + join);
								} else {
									headers = `{ ${header} }`;
								}
							}

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

	if (unmigrated.size) {
		return give_up + file.code.toString();
	}

	return file.code.toString();
}
