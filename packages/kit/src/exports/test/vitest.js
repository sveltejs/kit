import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hash } from '../../utils/hash.js';
import { posixify } from '../../utils/filesystem.js';

/**
 * Vitest plugin for testing SvelteKit remote functions.
 *
 * - Resolves virtual modules (`$app/server` and its internal dependencies)
 * - Transforms `.remote.ts/.remote.js` files to append `init_remote_functions()`
 * - Injects a setup file that establishes a request context per test,
 *   so remote functions work without `withRequestContext` wrappers
 *
 * @example
 * ```js
 * // vitest.config.ts
 * import { svelteKitTest } from '@sveltejs/kit/test/vitest';
 * export default defineConfig({ plugins: [svelteKitTest()] });
 * ```
 *
 * @returns {import('vite').Plugin}
 */
export function svelteKitTest() {
	const stubs_dir = fileURLToPath(new URL('./stubs', import.meta.url));
	const app_server = fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url));
	const setup_file = fileURLToPath(new URL('./setup.js', import.meta.url));

	return {
		name: 'sveltekit-test',

		/** @returns {import('vite').UserConfig} */
		config() {
			return {
				resolve: {
					alias: {
						// resolve virtual modules for $app/server and its transitive deps
						'$app/server': app_server,
						'$app/paths/internal/server': path.join(stubs_dir, 'paths.js'),
						'$app/paths': path.join(stubs_dir, 'paths.js'),
						'__sveltekit/environment': path.join(stubs_dir, 'environment.js'),
						'__sveltekit/server': path.join(stubs_dir, 'server.js')
					}
				},
				test: {
					// inject auto-context setup: establishes a default request store
					// per test via als.enterWith(), so remote functions work without
					// explicit withRequestContext wrappers
					setupFiles: [setup_file]
				}
			};
		},

		// Appends init_remote_functions() to .remote.ts/.js files, setting
		// __.id and __.name on each export. Without this, remote functions
		// still execute but error messages lack function names.
		// Mirrors the production SSR transform in exports/vite/index.js.
		transform(code, id) {
			if (!/\.remote\.(js|ts)$/.test(id)) return;

			const file = posixify(path.relative(process.cwd(), id));
			const remote_hash = hash(file);

			const init_code =
				'\n\n' +
				`import * as $$_self_$$ from './${path.basename(id)}';\n` +
				`import { init_remote_functions as $$_init_$$ } from '@sveltejs/kit/internal';\n` +
				'\n' +
				`$$_init_$$($$_self_$$, ${JSON.stringify(file)}, ${JSON.stringify(remote_hash)});\n` +
				'\n' +
				`for (const [name, fn] of Object.entries($$_self_$$)) {\n` +
				`\tfn.__.id = ${JSON.stringify(remote_hash)} + '/' + name;\n` +
				`\tfn.__.name = name;\n` +
				`}\n`;

			return code + init_code;
		}
	};
}
