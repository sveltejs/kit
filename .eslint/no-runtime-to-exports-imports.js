// @ts-expect-error no types here
import path from 'node:path';

/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallow relative imports from src/runtime to src/exports',
			category: 'Possible Errors',
			recommended: true
		},
		schema: [],
		messages: {
			noRuntimeToExportsImport:
				'Relative imports from src/runtime to src/exports are not allowed because they can cause Vite to resolve the same module both via regular Node and internal Vite. Use internal import maps or `@sveltejs/kit/internal` instead.'
		}
	},

	create(context) {
		const filename = context.filename;

		// Only apply this rule to files in packages/kit/src/runtime
		const in_runtime = filename.includes(path.join('packages', 'kit', 'src', 'runtime'));

		if (!in_runtime) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				const import_path = node.source.value;

				// Check if this is a relative import
				if (typeof import_path === 'string' && import_path.startsWith('.')) {
					// Resolve the import path relative to the current file
					const current_dir = path.dirname(filename);
					const resolved_path = path.resolve(current_dir, import_path);

					// Check if the resolved path points to src/exports
					const exports_path = path.join('packages', 'kit', 'src', 'exports');

					if (resolved_path.includes(exports_path)) {
						context.report({
							node: node.source,
							messageId: 'noRuntimeToExportsImport'
						});
					}
				}
			}
		};
	}
};
