import fs from 'node:fs';
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
		['vitest', '^1.0.0'],
		['typescript', '^5.0.0'], // should already be done by Svelte 4 migration, but who knows
		[
			'@sveltejs/vite-plugin-svelte',
			'^3.0.0',
			' (vite-plugin-svelte is a peer dependency of SvelteKit now)',
			'devDependencies'
		]
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

	let updated = content
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

	content = updated;
	updated = content.replace('"moduleResolution": "node"', '"moduleResolution": "bundler"');
	if (updated !== content) {
		log_migration(
			'Updated `moduleResolution` to `bundler`' +
				' in tsconfig.json: https://kit.svelte.dev/docs/v2-migration-guide#updated-dependency-requirements'
		);
	}

	return updated;
}

export function update_svelte_config() {
	fs.writeFileSync(
		'svelte.config.js',
		update_svelte_config_content(fs.readFileSync('svelte.config.js', 'utf8'))
	);
}

/**
 * @param {string} code
 */
export function update_svelte_config_content(code) {
	const regex = /\s*dangerZone:\s*{[^}]*},?/g;
	return code.replace(regex, '');
}

/**
 * @param {string} code
 */
export function transform_code(code) {
	const project = new Project({ useInMemoryFileSystem: true });
	const source = project.createSourceFile('svelte.ts', code);
	remove_throws(source);
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
