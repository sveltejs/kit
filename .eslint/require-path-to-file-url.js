/**
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'require dynamic imports of computed file paths to go through pathToFileURL',
			category: 'Possible Errors',
			recommended: true
		},
		schema: [],
		messages: {
			requirePathToFileURL:
				'Dynamic import() of a computed path must be wrapped in pathToFileURL(...).href — on Windows, absolute paths parse as URLs with the drive letter as protocol and fail to import. See https://github.com/sveltejs/kit/issues/16620'
		}
	},

	create(context) {
		/**
		 * Returns true if the expression is safe to pass to `import()`:
		 * a static specifier, a relative computed specifier, or a value
		 * wrapped in `pathToFileURL`/`new URL`
		 * @param {import('estree').Node} node
		 * @param {number} depth
		 * @returns {boolean}
		 */
		function is_safe(node, depth = 0) {
			if (node.type === 'Literal') {
				return true;
			}

			if (node.type === 'TemplateLiteral') {
				if (node.expressions.length === 0) return true;

				// a computed specifier with a static relative prefix resolves
				// relative to the importing module — no drive letters involved
				const prefix = node.quasis[0].value.cooked ?? '';
				return prefix.startsWith('./') || prefix.startsWith('../');
			}

			if (node.type === 'CallExpression' || node.type === 'NewExpression') {
				const callee = node.callee;
				return (
					(callee.type === 'Identifier' && callee.name === 'pathToFileURL') ||
					(callee.type === 'Identifier' && callee.name === 'URL')
				);
			}

			// `pathToFileURL(...).href` and `new URL(...).href`
			if (node.type === 'MemberExpression') {
				return (
					node.property.type === 'Identifier' &&
					node.property.name === 'href' &&
					is_safe(node.object, depth)
				);
			}

			// resolve an identifier one hop to its declaration
			if (node.type === 'Identifier' && depth === 0) {
				const variable = context.sourceCode
					.getScope(node)
					.references.find((ref) => ref.identifier === node)?.resolved;

				const def = variable?.defs[0];

				if (variable?.defs.length === 1 && def?.type === 'Variable' && def.node.init) {
					return is_safe(def.node.init, depth + 1);
				}
			}

			return false;
		}

		return {
			ImportExpression(node) {
				if (!is_safe(node.source)) {
					context.report({ node: node.source, messageId: 'requirePathToFileURL' });
				}
			}
		};
	}
};
