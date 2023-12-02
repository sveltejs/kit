import ts from 'typescript';
import {
	automigration,
	error,
	get_function_node,
	get_object_nodes,
	is_new,
	is_string_like,
	manual_migration,
	manual_return_migration,
	parse,
	rewrite_returns,
	rewrite_type,
	unwrap
} from '../utils.js';
import * as TASKS from '../tasks.js';
import { dedent } from '../../../utils.js';

const give_up = `${error('Update load function', TASKS.PAGE_LOAD)}\n\n`;

/**
 * @param {string} content
 * @param {string} filename
 */
export function migrate_page(content, filename) {
	// early out if we can tell there's no load function
	// without parsing the file
	if (!/load/.test(content)) return content;

	const file = parse(content);
	if (!file) return give_up + content;

	const name = file.exports.map.get('load');

	if (!name && !file.exports.complex) {
		// there's no load function here, so there's nothing to do
		return content;
	}

	const match = /__layout(?:-([^.@]+))?/.exec(filename);
	const load_name = match?.[1] ? `LayoutLoad.${match[1]}` : match ? 'LayoutLoad' : 'PageLoad';

	for (const statement of file.ast.statements) {
		const fn = name ? get_function_node(statement, name) : undefined;
		if (fn?.body) {
			check_fn_param(fn, file.code);

			/** @type {Set<string>} */
			const imports = new Set();

			rewrite_type(fn, file.code, 'Load', load_name);

			rewrite_returns(fn.body, (expr, node) => {
				const value = unwrap(expr);
				const nodes = ts.isObjectLiteralExpression(value) && get_object_nodes(value);

				if (nodes) {
					const keys = Object.keys(nodes).sort().join(' ');

					if (keys === '') {
						return; // nothing to do
					}

					if (
						keys === 'props' ||
						((keys === 'status' || keys === 'props status') &&
							Number(nodes.status.getText()) === 200)
					) {
						automigration(value, file.code, dedent(nodes.props?.getText() || ''));
						return;
					}

					// check for existence of `node`, otherwise it's an arrow function
					// with an implicit body, which we bail out on
					if (node) {
						const status = nodes.status && Number(nodes.status.getText());

						// logic based on https://github.com/sveltejs/kit/blob/67e2342149847d267eb0c50809a1f93f41fa529b/packages/kit/src/runtime/load.js
						if (keys === 'redirect status' && status > 300 && status < 400) {
							automigration(
								node,
								file.code,
								`throw redirect(${status}, ${nodes.redirect.getText()});`
							);
							imports.add('redirect');
							return;
						}

						if (nodes.error) {
							const message = is_string_like(nodes.error)
								? nodes.error.getText()
								: is_new(nodes.error, 'Error')
								? /** @type {string | undefined} */ (nodes.error.arguments[0]?.getText())
								: false;

							if (message !== false) {
								automigration(
									node,
									file.code,
									`throw error(${status || 500}${message ? `, ${message}` : ''});`
								);
								imports.add('error');
								return;
							}
						} else if (status >= 400) {
							automigration(node, file.code, `throw error(${status});`);
							imports.add('error');
							return;
						}
					}
				}

				manual_return_migration(node || fn, file.code, TASKS.PAGE_LOAD);
			});

			if (imports.size) {
				const has_imports = file.ast.statements.some((statement) =>
					ts.isImportDeclaration(statement)
				);
				const declaration = `import { ${[...imports.keys()].join(', ')} } from '@sveltejs/kit';`;

				return declaration + (has_imports ? '\n' : '\n\n') + file.code.toString();
			}

			return file.code.toString();
		}

		if (ts.isImportDeclaration(statement) && statement.importClause) {
			const bindings = statement.importClause.namedBindings;

			if (bindings && !ts.isNamespaceImport(bindings)) {
				for (const binding of bindings.elements) {
					if (binding.name.escapedText === 'Load') {
						file.code.overwrite(binding.getStart(), binding.getEnd(), load_name);
					}
				}
			}
		}
	}

	// we failed to rewrite the load function, so we inject
	// an error at the top of the file
	return give_up + content;
}

/**
 * Check the load function parameter, and either adjust
 * the property names, or add an error
 * @param {ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction} fn
 * @param {import('magic-string').default} str
 */
function check_fn_param(fn, str) {
	const param = fn.parameters[0];
	if (!param) {
		return;
	}
	if (ts.isObjectBindingPattern(param.name)) {
		for (const binding of param.name.elements) {
			if (
				!ts.isIdentifier(binding.name) ||
				(binding.propertyName && !ts.isIdentifier(binding.propertyName))
			) {
				bail(true);
				return;
			}
			const name = binding.propertyName
				? /** @type {ts.Identifier} */ (binding.propertyName).text
				: binding.name.text;
			if (['stuff', 'status', 'error'].includes(name)) {
				bail();
				return;
			}
			if (name === 'props') {
				if (binding.propertyName) {
					bail();
					return;
				} else {
					str.overwrite(binding.name.getStart(), binding.name.getEnd(), 'data: props');
				}
			}
		}
	} else {
		// load(param) { .. } -> bail, we won't check what is used in the function body
		bail(true);
	}

	function bail(check = false) {
		manual_migration(
			fn,
			str,
			(check ? 'Check if you need to migrate' : 'Migrate') + ' the load function input',
			TASKS.PAGE_LOAD
		);
	}
}
