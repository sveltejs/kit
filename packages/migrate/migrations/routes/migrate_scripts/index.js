import ts from 'typescript';
import { adjust_imports, guess_indent, comment, error, dedent, parse } from '../utils.js';
import * as TASKS from '../tasks.js';

/**
 * @param {string} content
 * @param {boolean} is_error
 * @param {boolean} moved
 */
export function migrate_scripts(content, is_error, moved) {
	/** @type {string | null} */
	let module = null;

	// instance script
	const main = content.replace(
		/<script([^]*?)>([^]+?)<\/script>(\n*)/g,
		(match, attrs, content, whitespace) => {
			const indent = guess_indent(content) ?? '';

			if (moved) {
				content = adjust_imports(content);
			}

			if (/context=(['"])module\1/.test(attrs)) {
				// special case — load is no longer supported in error
				if (is_error) {
					const body = `\n${indent}${error('Replace error load function', '3293209')}\n${comment(
						content,
						indent
					)}`;

					return `<script${attrs}>${body}</script>${whitespace}`;
				}

				module = dedent(content.replace(/^\n/, ''));

				const declared = find_declarations(content);
				declared.delete('load');
				declared.delete('router');
				declared.delete('hydrate');
				declared.delete('prerender');

				if (declared.size > 0) {
					const body = `\n${indent}${error(
						'Check code was safely removed',
						TASKS.PAGE_MODULE_CTX
					)}\n${comment(content, indent)}`;

					return `<script${attrs}>${body}</script>${whitespace}`;
				}

				// nothing was declared here, we can safely remove the script
				return '';
			}

			if (!is_error && /export/.test(content)) {
				content = `\n${indent}${error('Add data prop', TASKS.PAGE_DATA_PROP)}\n${content}`;
				// Possible TODO: migrate props to data.prop, or suggest $: ({propX, propY, ...} = data);
			}

			return `<script${attrs}>${content}</script>${whitespace}`;
		}
	);

	return { module, main };
}

/** @param {string} content */
function find_declarations(content) {
	const file = parse(content);
	if (!file) return;

	const declared = new Set();

	for (const statement of file.ast.statements) {
		if (ts.isImportDeclaration(statement) && statement.importClause) {
			if (statement.importClause.name) {
				declared.add(statement.importClause.name.text);
			}

			const bindings = statement.importClause.namedBindings;

			if (bindings) {
				if (ts.isNamespaceImport(bindings)) {
					declared.add(bindings.name.text);
				} else {
					for (const binding of bindings.elements) {
						declared.add(binding.name.text);
					}
				}
			}
		} else if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					declared.add(declaration.name.text);
				} else {
					return; // bail out if it's not a simple variable
				}
			}
		} else if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
			if (ts.isIdentifier(statement.name)) {
				declared.add(statement.name.text);
			}
		}
	}

	return declared;
}
