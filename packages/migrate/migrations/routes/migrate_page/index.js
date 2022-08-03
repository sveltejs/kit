import ts from 'typescript';
import MagicString from 'magic-string';
import {
	automigration,
	contains_only,
	dedent,
	error,
	get_prop_initializer_text,
	is_directly_in_exported_fn,
	manual_return_migration
} from '../utils.js';
import * as TASKS from '../tasks.js';

/** @param {string} content */
export function migrate_page(content) {
	let imports = new Set();
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
			if (ts.isReturnStatement(node) && is_directly_in_exported_fn(node, ['load'])) {
				if (node.expression && ts.isObjectLiteralExpression(node.expression)) {
					if (contains_only(node.expression, ['props'])) {
						automigration(
							node,
							str,
							'return ' + dedent(get_prop_initializer_text(node.expression.properties, 'props'))
						);
					} else if (
						contains_only(node.expression, ['redirect', 'status']) &&
						((Number(get_prop_initializer_text(node.expression.properties, 'status')) > 300 &&
							Number(get_prop_initializer_text(node.expression.properties, 'status')) < 310) ||
							contains_only(node.expression, ['redirect']))
					) {
						automigration(
							node,
							str,
							'throw redirect(' +
								get_prop_initializer_text(node.expression.properties, 'status') +
								(get_prop_initializer_text(node.expression.properties, 'redirect') === 'undefined'
									? ''
									: ', ' + get_prop_initializer_text(node.expression.properties, 'redirect')) +
								');'
						);
						imports.add('redirect');
					} else if (
						contains_only(node.expression, ['error', 'status']) &&
						(Number(get_prop_initializer_text(node.expression.properties, 'status')) > 399 ||
							contains_only(node.expression, ['error']))
					) {
						automigration(
							node,
							str,
							'throw error(' +
								get_prop_initializer_text(node.expression.properties, 'status') +
								(get_prop_initializer_text(node.expression.properties, 'error') === 'undefined'
									? ''
									: ', ' + get_prop_initializer_text(node.expression.properties, 'error')) +
								');'
						);
						imports.add('error');
					}
				} else {
					manual_return_migration(node, str, TASKS.PAGE_LOAD);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		const import_str =
			imports.size > 0 ? `import { ${[...imports.keys()].join(', ')} } from '@sveltejs/kit';` : '';

		return import_str + '\n' + str.toString();
	} catch {
		return `${error('Update load function', TASKS.PAGE_LOAD)}\n\n${content}`;
	}
}
