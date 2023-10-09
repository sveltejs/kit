import fs from 'node:fs';
import colors from 'kleur';
import MagicString from 'magic-string';
import ts from 'typescript';

export function migrate_config() {
	try {
		const content = fs.readFileSync('svelte.config.js', 'utf8');
		fs.writeFileSync('svelte.config.js', remove_package_from_config(content));
	} catch {
		console.log(
			colors
				.bold()
				.yellow('Could not remove package config from svelte.config.js, please remove it manually')
		);
	}
}

/**
 * @param {string} content
 */
export function remove_package_from_config(content) {
	const ast = ts.createSourceFile(
		'filename.ts',
		content,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS
	);

	const code = new MagicString(content);

	for (const statement of ast.statements) {
		if (ts.isExportAssignment(statement)) {
			if (ts.isObjectLiteralExpression(statement.expression)) {
				remove(statement.expression);
			} else if (ts.isIdentifier(statement.expression)) {
				for (const statement2 of ast.statements) {
					if (ts.isVariableStatement(statement2)) {
						for (const declaration of statement2.declarationList.declarations) {
							if (
								ts.isIdentifier(declaration.name) &&
								declaration.name.text === statement.expression.text &&
								declaration.initializer &&
								ts.isObjectLiteralExpression(declaration.initializer)
							) {
								remove(declaration.initializer);
							}
						}
					}
				}
			}
		}
	}

	return code.toString();

	/** @param {ts.ObjectLiteralExpression} expression */
	function remove(expression) {
		for (let i = 0; i < expression.properties.length; i++) {
			const property = expression.properties[i];
			if (
				ts.isPropertyAssignment(property) &&
				ts.isIdentifier(property.name) &&
				property.name.text === 'package' &&
				ts.isObjectLiteralExpression(property.initializer)
			) {
				if (expression.properties.length === 1) {
					code.overwrite(expression.getStart(), expression.getEnd(), '{}');
				} else {
					const next_property = expression.properties[i + 1];
					if (next_property) {
						code.remove(property.getStart(), next_property.getStart());
					} else {
						code.remove(property.getStart(), content.lastIndexOf('}', expression.getEnd()));
					}
				}
			}
		}
	}
}
