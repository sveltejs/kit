import ts from 'typescript';
import MagicString from 'magic-string';
import {
	automigration,
	contains_only,
	dedent,
	get_prop_initializer_text,
	is_directly_in_exported_fn,
	manual_return_migration
} from '../utils.js';
import * as TASKS from '../tasks.js';

/**
 * @param {string} content
 */
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

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isReturnStatement(node) && is_directly_in_exported_fn(node, ['GET'])) {
				if (
					node.expression &&
					ts.isObjectLiteralExpression(node.expression) &&
					contains_only(node.expression, ['body'])
				) {
					automigration(
						node,
						str,
						'return ' + dedent(get_prop_initializer_text(node.expression.properties, 'body'))
					);
				} else {
					manual_return_migration(node, str, TASKS.PAGE_ENDPOINT);
				}
			} else if (
				ts.isReturnStatement(node) &&
				is_directly_in_exported_fn(node, ['PUT', 'POST', 'PATCH', 'DELETE'])
			) {
				manual_return_migration(node, str, TASKS.PAGE_ENDPOINT);
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return str.toString();
	} catch {
		return content;
	}
}
