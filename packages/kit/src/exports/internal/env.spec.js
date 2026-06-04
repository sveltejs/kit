import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { assert, test } from 'vitest';

/**
 * Collect every static `import`/`export ... from` edge reachable from `entry`,
 * following relative imports only.
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

			if (source.startsWith('.') && file.endsWith('.js')) {
				walk(path.resolve(path.dirname(file), source));
			}
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
