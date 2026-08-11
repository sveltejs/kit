// @ts-expect-error no types here
import path from 'node:path';

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallow imports from src/exports to src/runtime',
			category: 'Possible Errors',
			recommended: true
		},
		schema: [],
		messages: {
			noExportsToRuntimeImport:
				'Imports from src/exports to src/runtime are not allowed. Move shared code outside src/runtime instead.'
		}
	},

	create(context) {
		const runtime_path = path.resolve(import.meta.dirname, '../packages/kit/src/runtime');

		/** @param {import('estree').Literal} node */
		function check(node) {
			const import_path = node.value;
			if (typeof import_path !== 'string') return;

			const is_runtime_subpath = import_path.startsWith('#app/');
			const is_relative_runtime_import =
				import_path.startsWith('.') &&
				path
					.relative(runtime_path, path.resolve(path.dirname(context.filename), import_path))
					.split(path.sep)[0] !== '..';

			if (is_runtime_subpath || is_relative_runtime_import) {
				context.report({
					node,
					messageId: 'noExportsToRuntimeImport'
				});
			}
		}

		return {
			ImportDeclaration: (node) => check(node.source),
			ExportNamedDeclaration: (node) => node.source && check(node.source),
			ExportAllDeclaration: (node) => check(node.source),
			ImportExpression: (node) => check(node.source)
		};
	}
};
