import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { assert, test } from 'vitest';

const package_dir = fileURLToPath(new URL('../../..', import.meta.url));

/** @type {{ exports: Record<string, string | { import?: string }> }} */
const pkg = JSON.parse(fs.readFileSync(path.join(package_dir, 'package.json'), 'utf-8'));

/**
 * Resolve an import specifier to a source file, for relative imports and `@sveltejs/kit`
 * self-imports (via the package's `exports` map). Returns `undefined` for anything else
 * (bare dependencies, `node:` builtins) — those aren't followed.
 * @param {string} source
 * @param {string} importer
 * @returns {string | undefined}
 */
function resolve_import(source, importer) {
	if (source.startsWith('.')) {
		return path.resolve(path.dirname(importer), source);
	}

	if (source === '@sveltejs/kit' || source.startsWith('@sveltejs/kit/')) {
		const key = source === '@sveltejs/kit' ? '.' : `.${source.slice('@sveltejs/kit'.length)}`;
		const exported = pkg.exports[key];
		const target = typeof exported === 'string' ? exported : exported?.import;
		if (!target) throw new Error(`could not resolve self-import "${source}"`);
		return path.resolve(package_dir, target);
	}
}

/**
 * Collect every static `import`/`export ... from` edge reachable from `entry`,
 * following relative imports and `@sveltejs/kit/*` self-imports.
 * @param {string} entry
 */
function import_graph(entry) {
	const seen = new Set();
	/** @type {Array<{ file: string, source: string }>} */
	const edges = [];

	/** @param {string} file */
	function walk(file) {
		if (seen.has(file)) return;
		seen.add(file);

		const ast = parse(fs.readFileSync(file, 'utf-8'), {
			ecmaVersion: 'latest',
			sourceType: 'module'
		});

		for (const node of ast.body) {
			// Only `import ... from`, `export ... from` and `export * from` statements carry a
			// module specifier (`source`); skip everything else.
			if (
				node.type !== 'ImportDeclaration' &&
				node.type !== 'ExportNamedDeclaration' &&
				node.type !== 'ExportAllDeclaration'
			) {
				continue;
			}

			const source = node.source?.value;
			if (typeof source !== 'string') continue;

			edges.push({ file, source });

			const resolved = resolve_import(source, file);
			if (resolved?.endsWith('.js')) walk(resolved);
		}
	}

	walk(entry);
	return edges;
}

// `$app/env/private` / `$app/env/public` validate environment variables at server startup via this
// module, so it must not pull `vite` into the production server bundle. Vite is a build-time-only
// dependency, and importing it at runtime breaks deployments that compile/bundle the server without
// `node_modules` (e.g. `bun build --compile`) and any production runtime where Vite isn't installed.
test('@sveltejs/kit/internal/env does not import vite', () => {
	const graph = import_graph(fileURLToPath(new URL('./env.js', import.meta.url)));

	assert.equal(
		graph.some(({ source }) => source === 'vite' || source.startsWith('vite/')),
		false,
		'internal/env transitively imports vite'
	);
	assert.equal(
		graph.some(({ file }) => file.includes(`${path.sep}exports${path.sep}vite${path.sep}`)),
		false,
		'internal/env transitively imports a build-time module under exports/vite/'
	);
});
