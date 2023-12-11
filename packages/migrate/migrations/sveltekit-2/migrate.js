import fs from 'node:fs';
import ts from 'typescript';
import { Project, Node } from 'ts-morph';
import { log_migration, log_on_ts_modification, update_pkg } from '../../utils.js';

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
		// All other bumps are done as part of the Svelte 4 migration
		['@sveltejs/kit', '^2.0.0'],
		['vite', '^5.0.0'],
		[
			'@sveltejs/vite-plugin-svelte',
			'^3.0.0',
			' (vite-plugin-svelte is a peer dependency of SvelteKit now)',
			'devDependencies'
		]
		// TODO bump vitest? others?
	]);
}

export function update_tsconfig() {
	fs.writeFileSync(
		'tsconfig.json',
		update_tsconfig_content(fs.readFileSync('tsconfig.json', 'utf8'))
	);
}

/** @param {string} content */
export function update_tsconfig_content(content) {
	if (!content.includes('"extends"')) {
		// Don't touch the tsconfig if people opted out of our default config
		return content;
	}

	const updated = content
		.split('\n')
		.filter(
			(line) => !line.includes('importsNotUsedAsValues') && !line.includes('preserveValueImports')
		)
		.join('\n');

	if (updated !== content) {
		log_migration(
			'Removed deprecated `importsNotUsedAsValues` and `preserveValueImports`' +
				' from tsconfig.json: https://kit.svelte.dev/docs/v2-migration-guide#updated-dependency-requirements'
		);
	}

	return updated;
}

/**
 * @param {string} code
 */
export function transform_code(code) {
	const project = new Project({ useInMemoryFileSystem: true });
	const source = project.createSourceFile('svelte.ts', code);
	remove_throws(source);
	add_cookie_path_comments(source);
	return source.getFullText();
}

/**
 * `throw redirect(..)` -> `redirect(..)`
 * @param {import('ts-morph').SourceFile} source
 */
function remove_throws(source) {
	const logger = log_on_ts_modification(
		source,
		'Removed `throw` from redirect/error functions: https://kit.svelte.dev/docs/v2-migration-guide#redirect-and-error-are-no-longer-thrown-by-you'
	);

	/** @param {string} id */
	function remove_throw(id) {
		const imports = get_imports(source, '@sveltejs/kit', id);
		for (const namedImport of imports) {
			for (const id of namedImport.getNameNode().findReferencesAsNodes()) {
				const call_expression = id.getParent();
				const throw_stmt = call_expression?.getParent();
				if (Node.isCallExpression(call_expression) && Node.isThrowStatement(throw_stmt)) {
					throw_stmt.replaceWithText(call_expression.getText() + ';');
				}
			}
		}
	}

	remove_throw('redirect');
	remove_throw('error');

	logger();
}

/**
 * `cookies.set(a, b, {...})` — add comment if path is missing
 * @param {import('ts-morph').SourceFile} source
 */
function add_cookie_path_comments(source) {
	const logger = log_on_ts_modification(
		source,
		'Added @migration task to `cookies` method calls: https://kit.svelte.dev/docs/migrating-to-sveltekit-2#path-is-required-when-setting-cookies'
	);

	source.forEachDescendant((node) => {
		if (!Node.isExpressionStatement(node)) return;

		const expression = node.getChildAtIndex(0);
		if (!Node.isCallExpression(expression)) return;

		const callee = expression.getChildAtIndex(0).getText();
		if (callee !== 'cookies.set' && callee !== 'cookies.delete' && callee !== 'cookies.serialize') {
			return;
		}

		const args = expression.compilerNode.arguments;

		const index = callee === 'cookies.delete' ? 1 : 2;
		const options = args[index];

		let has_path = false;
		if (options) {
			if (ts.isObjectLiteralExpression(options)) {
				if (options.properties.some((p) => p.name?.getText() === 'path')) {
					has_path = true;
				}
			}
		}

		if (!has_path) {
			// TODO somehow prepend `node` with a comment:
			// // @migration cookies: path is required
		}
	});

	logger();
}

/**
 * @param {import('ts-morph').SourceFile} source
 * @param {string} from
 * @param {string} name
 */
function get_imports(source, from, name) {
	return source
		.getImportDeclarations()
		.filter((i) => i.getModuleSpecifierValue() === from)
		.flatMap((i) => i.getNamedImports())
		.filter((i) => i.getName() === name);
}
