import { walk } from 'zimmerframe';

/**
 * @param {import('acorn').ExportSpecifier | import('acorn').ExportAllDeclaration} node
 * @returns {string}
 */
export function get_exported_name(node) {
	return node.exported?.type === 'Identifier'
		? node.exported.name
		: /** @type {string} */ (node.exported?.value);
}

/**
 * @param {import('acorn').Program} source
 * @param {string} variable_name
 * @returns {boolean}
 */
export function is_reassigned(source, variable_name) {
	let reassigned = false;

	for (const global_scope_node of source.body) {
    walk(
      /** @type {import('acorn').Node} */ (global_scope_node),
      {},
      {
        VariableDeclarator: (node, { next, stop }) => {
          const declarator = /** @type {import('acorn').VariableDeclarator} */ (node);
          if (get_references(declarator.id).includes(variable_name)) {
            stop();
          }
          next();
        },
        AssignmentExpression: (node, { next, stop }) => {
          const assignment = /** @type {import('acorn').AssignmentExpression} */ (node);
          if (get_references(assignment.left).includes(variable_name)) {
            reassigned = true;
            stop();
          }
          next();
        }
      }
    );

    if (reassigned) {
      return true;
    }
	}

	return reassigned;
}

/**
 * Retrieve all references from a pattern used in an assignment.
 * @param {import('acorn').Pattern} node
 * @returns {string[]}
 */
export function get_references(node) {
	switch (node.type) {
		case 'Identifier':
			return [node.name];
		case 'ObjectPattern':
			return node.properties.flatMap((property) => {
				if (property.type === 'RestElement') {
					return get_references(property);
				}
				return get_references(property.value);
			});
		case 'ArrayPattern':
			return node.elements.flatMap((element) => {
				if (!element) {
					return [];
				}
				if (element.type === 'RestElement') {
					return get_references(element);
				}
				return get_references(element);
			});
		case 'RestElement':
			return get_references(node.argument);
		case 'AssignmentPattern':
			return get_references(node.left);
    // we don't care about MemberExpression because our page options are not object references
		default:
			return [];
	}
}
