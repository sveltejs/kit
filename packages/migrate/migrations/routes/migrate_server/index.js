import ts from 'typescript';
import MagicString from 'magic-string';
import {
	automigration,
	contains_only,
	get_prop,
	get_prop_initializer_text,
	is_directly_in_exported_fn,
	is_string_like,
	manual_return_migration,
	remove_outer_braces
} from '../utils.js';
import * as TASKS from '../tasks.js';

/**
 * @param {string} content
 *  */
export function migrate_server(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);
		const str = new MagicString(content);

		/** @param {ts.Node} node */
		function walk(node) {
			if (
				ts.isReturnStatement(node) &&
				is_directly_in_exported_fn(node, ['GET', 'PUT', 'POST', 'PATH', 'DELETE'])
			) {
				if (
					node.expression &&
					ts.isObjectLiteralExpression(node.expression) &&
					contains_only(node.expression, ['body', 'status', 'headers'], true)
				) {
					const body = get_prop(node.expression.properties, 'body');
					const headers = get_prop(node.expression.properties, 'headers');
					const status = get_prop(node.expression.properties, 'status');

					const headers_has_multiple_cookies = /['"]set-cookie['"]:\s*\[/.test(
						headers?.getText()?.toLowerCase()
					);
					const is_safe_transformation =
						(!body ||
							(!ts.isShorthandPropertyAssignment(body) &&
								ts.isObjectLiteralExpression(body.initializer))) &&
						(!headers ||
							((!headers.getText().toLowerCase().includes('content-type') ||
								headers.getText().includes('application/json')) &&
								!headers_has_multiple_cookies));

					const headers_str =
						body &&
						(!ts.isPropertyAssignment(body) || !is_string_like(body.initializer)) &&
						(!headers || !headers.getText().toLowerCase().includes('content-type'))
							? `headers: { 'content-type': 'application/json; charset=utf-8'${
									headers
										? ', ' +
										  (ts.isPropertyAssignment(headers)
												? remove_outer_braces(
														get_prop_initializer_text(node.expression.properties, 'headers')
												  )
												: '...headers')
										: ''
							  } }`
							: headers
							? headers.getText()
							: undefined;

					const body_str = get_prop_initializer_text(node.expression.properties, 'body');
					const response_body = body
						? (!ts.isPropertyAssignment(body) ||
								!is_string_like(body.initializer) ||
								(headers && headers.getText().includes('application/json'))) &&
						  (!headers ||
								!headers.getText().toLowerCase().includes('content-type') ||
								headers.getText().includes('application/json')) &&
						  !body_str.startsWith('JSON.stringify')
							? `JSON.stringify(${body_str})`
							: body_str
						: 'undefined';

					const response_init =
						headers_str || status
							? // prettier-ignore
							  ', ' +
						(headers_has_multiple_cookies ? '\n// set-cookie with multiple values needs a different conversion, see the link at the top for more info\n' : '') +
						`{ ${headers_str ? `${headers_str}${status ? ', ' : ''}` : ''}${status ? status.getText() : ''} }`
							: '';

					if (is_safe_transformation) {
						automigration(node, str, `return new Response(${response_body}${response_init});`);
					} else {
						manual_return_migration(
							node,
							str,
							TASKS.STANDALONE_ENDPOINT,
							`return new Response(${response_body}${response_init});`
						);
					}
				} else {
					manual_return_migration(node, str, TASKS.STANDALONE_ENDPOINT);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return str.toString();
	} catch {
		return content;
	}
}
