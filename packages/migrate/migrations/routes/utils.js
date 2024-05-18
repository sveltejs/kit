import ts from 'typescript';
import MagicString from 'magic-string';
import { comment, indent_at_line } from '../../utils.js';

/**
 * @param {string} description
 * @param {string} [comment_id]
 */
export function task(description, comment_id) {
	return (
		`@migration task: ${description}` +
		(comment_id
			? ` (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-${comment_id})`
			: '')
	);
}

/**
 * @param {string} description
 * @param {string} comment_id
 */
export function error(description, comment_id) {
	return `throw new Error(${JSON.stringify(task(description, comment_id))});`;
}

/** @param {string} content */
export function adjust_imports(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		/** @param {number} pos */
		function adjust(pos) {
			// TypeScript AST is a clusterfuck, we need to step forward to find
			// where the node _actually_ starts
			while (content[pos] !== '.') pos += 1;

			// replace ../ with ../../ and ./ with ../
			code.prependLeft(pos, content[pos + 1] === '.' ? '../' : '.');
		}

		/** @param {ts.Node} node */
		function walk(node) {
			if (ts.isImportDeclaration(node)) {
				const text = /** @type {ts.StringLiteral} */ (node.moduleSpecifier).text;
				if (text[0] === '.') adjust(node.moduleSpecifier.pos);
			}

			if (ts.isCallExpression(node) && node.expression.getText() === 'import') {
				const arg = node.arguments[0];

				if (ts.isStringLiteral(arg)) {
					if (arg.text[0] === '.') adjust(arg.pos);
				} else if (ts.isTemplateLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) {
					if (arg.head.text[0] === '.') adjust(arg.head.pos);
				}
			}

			node.forEachChild(walk);
		}

		ast.forEachChild(walk);

		return code.toString();
	} catch {
		// this is enough of an edge case that it's probably fine to
		// just leave the code as we found it
		return content;
	}
}

/**
 *
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} comment_nr
 * @param {string} [suggestion]
 */
export function manual_return_migration(node, str, comment_nr, suggestion) {
	manual_migration(node, str, 'Migrate this return statement', comment_nr, suggestion);
}

/**
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} message
 * @param {string} comment_nr
 * @param {string} [suggestion]
 */
export function manual_migration(node, str, message, comment_nr, suggestion) {
	// handle case where this is called on a (arrow) function
	if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		node = node.parent.parent.parent;
	}

	const indent = indent_at_line(str.original, node.getStart());

	let appended = '';

	if (suggestion) {
		appended = `\n${indent}// Suggestion (check for correctness before using):\n${indent}// ${comment(
			suggestion,
			indent
		)}`;
	}

	str.prependLeft(node.getStart(), error(message, comment_nr) + appended + `\n${indent}`);
}

/**
 *
 * @param {ts.Node} node
 * @param {MagicString} str
 * @param {string} migration
 */
export function automigration(node, str, migration) {
	str.overwrite(node.getStart(), node.getEnd(), migration);
}

/**
 * @param {ts.ObjectLiteralExpression} node
 */
export function get_object_nodes(node) {
	/** @type {Record<string, ts.Node>} */
	const obj = {};

	for (const property of node.properties) {
		if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
			obj[property.name.text] = property.initializer;
		} else if (ts.isShorthandPropertyAssignment(property)) {
			obj[property.name.text] = property.name;
		} else {
			return null; // object contains funky stuff like computed properties/accessors — bail
		}
	}

	return obj;
}

/**
 * @param {ts.Node} node
 */
export function is_string_like(node) {
	return (
		ts.isStringLiteral(node) ||
		ts.isTemplateExpression(node) ||
		ts.isNoSubstitutionTemplateLiteral(node)
	);
}

/** @param {ts.SourceFile} node */
export function get_exports(node) {
	/** @type {Map<string, string>} */
	const map = new Map();

	let complex = false;

	for (const statement of node.statements) {
		if (
			ts.isExportDeclaration(statement) &&
			statement.exportClause &&
			ts.isNamedExports(statement.exportClause)
		) {
			// export { x }, export { x as y }
			for (const specifier of statement.exportClause.elements) {
				map.set(specifier.name.text, specifier.propertyName?.text || specifier.name.text);
			}
		} else if (
			ts.isFunctionDeclaration(statement) &&
			statement.name &&
			ts.getModifiers(statement)?.[0]?.kind === ts.SyntaxKind.ExportKeyword
		) {
			// export function x ...
			map.set(statement.name.text, statement.name.text);
		} else if (
			ts.isVariableStatement(statement) &&
			ts.getModifiers(statement)?.[0]?.kind === ts.SyntaxKind.ExportKeyword
		) {
			// export const x = ..., y = ...
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					map.set(declaration.name.text, declaration.name.text);
				} else {
					// might need to bail out on encountering this edge case,
					// because this stuff can get pretty intense
					complex = true;
				}
			}
		}
	}

	return { map, complex };
}

/**
 * @param {ts.Node} statement
 * @param {string[]} names
 * @returns {ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | undefined}
 */
export function get_function_node(statement, ...names) {
	if (
		ts.isFunctionDeclaration(statement) &&
		statement.name &&
		names.includes(statement.name.text)
	) {
		// export function x ...
		return statement;
	}

	if (ts.isVariableStatement(statement)) {
		for (const declaration of statement.declarationList.declarations) {
			if (
				ts.isIdentifier(declaration.name) &&
				names.includes(declaration.name.text) &&
				declaration.initializer &&
				(ts.isArrowFunction(declaration.initializer) ||
					ts.isFunctionExpression(declaration.initializer))
			) {
				// export const x = ...
				return declaration.initializer;
			}
		}
	}
}

/**
 * Utility for rewriting return statements.
 * If `node` is `undefined`, it means it's a concise arrow function body (`() => ({}))`.
 * Lone `return;` statements are left untouched.
 * @param {ts.Block | ts.ConciseBody} block
 * @param {(expression: ts.Expression, node: ts.ReturnStatement | undefined) => void} callback
 */
export function rewrite_returns(block, callback) {
	if (ts.isBlock(block)) {
		/** @param {ts.Node} node */
		function walk(node) {
			if (
				ts.isArrowFunction(node) ||
				ts.isFunctionExpression(node) ||
				ts.isFunctionDeclaration(node)
			) {
				// don't cross this boundary
				return;
			}

			if (ts.isReturnStatement(node) && node.expression) {
				callback(node.expression, node);
				return;
			}

			node.forEachChild(walk);
		}

		block.forEachChild(walk);
	} else {
		callback(block, undefined);
	}
}

/** @param {ts.Node} node */
export function unwrap(node) {
	if (ts.isParenthesizedExpression(node)) {
		return node.expression;
	}

	return node;
}

/**
 * @param {ts.Node} node
 * @param {string} name
 * @returns {node is ts.isNewExpression}
 */
export function is_new(node, name) {
	return (
		ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name
	);
}

/** @param {string} content */
export function parse(content) {
	try {
		const ast = ts.createSourceFile(
			'filename.ts',
			content,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TS
		);

		const code = new MagicString(content);

		return {
			ast,
			code,
			exports: get_exports(ast)
		};
	} catch {
		return null;
	}
}

/**
 * @param {ts.Node} node
 * @param {MagicString} code
 * @param {string} old_type
 * @param {string} new_type
 */
export function rewrite_type(node, code, old_type, new_type) {
	// @ts-ignore
	const jsDoc = node.jsDoc || node.parent?.parent?.parent?.jsDoc;
	if (jsDoc) {
		// @ts-ignore
		for (const comment of jsDoc) {
			const str = comment.getText();
			const index = str.indexOf(old_type);

			if (index !== -1) {
				code.overwrite(comment.pos + index, comment.pos + index + old_type.length, new_type);
			}
		}
	}

	// @ts-ignore
	const type = node.type || node.parent.type; // handle both fn and var declarations

	if (type?.typeName?.escapedText.startsWith(old_type)) {
		const start = type.getStart();
		code.overwrite(start, start + old_type.length, new_type);
	}
}

/**
 * Does the HTTP verbs uppercase migration if it didn't happen yet. If a string
 * is returned, the migration was done or wasn't needed. If undefined is returned,
 * the migration is needed but couldn't be done.
 *
 * @param {string[]} methods
 * @param {NonNullable<ReturnType<typeof parse>>} file
 */
export function uppercase_migration(methods, file) {
	const old_methods = new Set(
		['get', 'post', 'put', 'patch', 'del'].filter((name) => file.exports.map.has(name))
	);

	if (old_methods.size && !methods.length) {
		for (const statement of file.ast.statements) {
			for (const method of old_methods) {
				const fn = get_function_node(
					statement,
					/** @type{string} */ (file.exports.map.get(method))
				);
				if (!fn?.name) {
					continue;
				}
				file.code.overwrite(
					fn.name.getStart(),
					fn.name.getEnd(),
					method === 'del' ? 'DELETE' : method.toUpperCase()
				);
				old_methods.delete(method);
			}
		}
	}

	return old_methods.size ? undefined : file.code.toString();
}
