import fs from 'node:fs';
import { Project, ts, Node } from 'ts-morph';
import { update_pkg } from '../../utils.js';

export function update_pkg_json() {
	fs.writeFileSync(
		'package.json',
		update_pkg_json_content(fs.readFileSync('package.json', 'utf8'))
	);
}

/**
 * @param {string} content
 */
export function update_pkg_json_content(content) {
	return update_pkg(content, [
		['svelte', '^5.0.0'],
		['svelte-check', '^4.0.0'],
		['svelte-preprocess', '^6.0.0'],
		['@sveltejs/enhanced-img', '^0.3.9'],
		['@sveltejs/kit', '^2.5.27'],
		['@sveltejs/vite-plugin-svelte', '^4.0.0'],
		[
			'svelte-loader',
			'^3.2.3',
			' (if you are still on webpack 4, you need to update to webpack 5)'
		],
		['rollup-plugin-svelte', '^7.2.2'],
		['prettier', '^3.1.0'],
		['prettier-plugin-svelte', '^3.2.6'],
		['eslint-plugin-svelte', '^2.45.1'],
		['svelte-eslint-parser', '^0.42.0'],
		[
			'eslint-plugin-svelte3',
			'^4.0.0',
			' (this package is deprecated, use eslint-plugin-svelte instead. More info: https://svelte.dev/docs/svelte/v4-migration-guide#new-eslint-package)'
		],
		[
			'typescript',
			'^5.5.0',
			' (this might introduce new type errors due to breaking changes within TypeScript)'
		],
		['vite', '^5.4.4']
	]);
}

/**
 * @param {string} code
 */
export function transform_module_code(code) {
	const project = new Project({ useInMemoryFileSystem: true });
	const source = project.createSourceFile('svelte.ts', code);
	update_component_instantiation(source);
	return source.getFullText();
}

/**
 * @param {string} code
 * @param {(source: string, options: { filename?: string }) => { code: string }} transform_code
 * @param {{ filename?: string }} options
 */
export function transform_svelte_code(code, transform_code, options) {
	return transform_code(code, options).code;
}

/**
 * new Component(...) -> mount(Component, ...)
 * @param {import('ts-morph').SourceFile} source
 */
function update_component_instantiation(source) {
	const imports = source
		.getImportDeclarations()
		.filter((i) => i.getModuleSpecifierValue().endsWith('.svelte'))
		.flatMap((i) => i.getDefaultImport() || []);

	for (const defaultImport of imports) {
		const identifiers = find_identifiers(source, defaultImport.getText());

		for (const id of identifiers) {
			const parent = id.getParent();

			if (Node.isNewExpression(parent)) {
				const args = parent.getArguments();

				if (args.length === 1) {
					const method =
						Node.isObjectLiteralExpression(args[0]) && !!args[0].getProperty('hydrate')
							? 'hydrate'
							: 'mount';

					if (method === 'hydrate') {
						/** @type {import('ts-morph').ObjectLiteralExpression} */ (args[0])
							.getProperty('hydrate')
							?.remove();
					}

					if (source.getImportDeclaration('svelte')) {
						source.getImportDeclaration('svelte')?.addNamedImport(method);
					} else {
						source.addImportDeclaration({
							moduleSpecifier: 'svelte',
							namedImports: [method]
						});
					}

					const declaration = parent
						.getParentIfKind(ts.SyntaxKind.VariableDeclaration)
						?.getNameNode();
					if (Node.isIdentifier(declaration)) {
						const usages = declaration.findReferencesAsNodes();
						for (const usage of usages) {
							const parent = usage.getParent();
							if (Node.isPropertyAccessExpression(parent) && parent.getName() === '$destroy') {
								const call_expr = parent.getParentIfKind(ts.SyntaxKind.CallExpression);
								if (call_expr) {
									call_expr.replaceWithText(`unmount(${usage.getText()})`);
									source.getImportDeclaration('svelte')?.addNamedImport('unmount');
								}
							}
						}
					}

					parent.replaceWithText(`${method}(${id.getText()}, ${args[0].getText()})`);
				}
			}
		}
	}
}

/**
 * @param {import('ts-morph').SourceFile} source
 * @param {string} name
 */
function find_identifiers(source, name) {
	return source.getDescendantsOfKind(ts.SyntaxKind.Identifier).filter((i) => i.getText() === name);
}
