import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import path from 'node:path';
import { hash } from '../../utils/hash.js';
import { posixify } from '../../utils/filesystem.js';

const VIRTUAL_PREFIX = '\0sveltekit-test-mock:';

/**
 * Vitest plugin for testing SvelteKit remote functions.
 *
 * **Server mode** (default):
 * - Resolves virtual modules (`$app/server` and its internal dependencies)
 * - Transforms `.remote.ts/.remote.js` files to append `init_remote_functions()`
 * - Injects a setup file that establishes a request context per test,
 *   so remote functions work without `withRequestContext` wrappers
 *
 * **Component mode** (`{ mode: 'component' }`):
 * - Redirects `.remote.ts/.remote.js` imports to virtual modules that bypass
 *   the production sveltekit() plugin's transform
 * - Resolves the internal remote module to a mock runtime with reactive objects
 * - Use `mockRemote(fn).returns(data)` to control what data components receive
 *
 * @example
 * ```js
 * // Server mode (test remote function logic directly)
 * import { svelteKitTest } from '@sveltejs/kit/test/vitest';
 * export default defineConfig({ plugins: [svelteKitTest()] });
 *
 * // Component mode (test components that use remote functions)
 * import { sveltekit } from '@sveltejs/kit/vite';
 * export default defineConfig({
 *   plugins: [sveltekit(), svelteKitTest({ mode: 'component' })]
 * });
 * ```
 *
 * @param {{ mode?: 'server' | 'component' }} [options]
 * @returns {import('vite').Plugin}
 */
export function svelteKitTest(options = {}) {
	const mode = options.mode ?? 'server';
	const stubs_dir = fileURLToPath(new URL('./stubs', import.meta.url));
	const app_server = fileURLToPath(new URL('../../runtime/app/server/index.js', import.meta.url));

	const server_setup = fileURLToPath(new URL('./setup.js', import.meta.url));
	const component_setup = fileURLToPath(new URL('./setup-component.js', import.meta.url));

	// Maps virtual module hash → real file path (component mode only)
	/** @type {Map<string, string>} */
	const virtual_to_real = new Map();

	return {
		name: 'sveltekit-test',
		// Run before sveltekit() so our resolveId intercepts .remote.ts
		// imports before the production plugin sees them
		enforce: /** @type {const} */ ('pre'),

		/** @returns {import('vite').UserConfig} */
		config() {
			if (mode === 'component') {
				return {
					resolve: {
						alias: {
							// mock runtime replaces the real client-side remote functions
							'__sveltekit/remote': path.join(stubs_dir, 'remote.svelte.js')
						}
					},
					test: {
						setupFiles: [component_setup]
					}
				};
			}

			// server mode (default)
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
					setupFiles: [server_setup]
				}
			};
		},

		async resolveId(source, importer, opts) {
			if (mode !== 'component') return;
			if (!/\.remote\.(js|ts)$/.test(source)) return;

			// Resolve the real file path via Vite's normal resolution
			const resolved = await this.resolve(source, importer, { ...opts, skipSelf: true });
			if (!resolved) return;

			// Redirect to a virtual module ID that does NOT end with .remote.ts,
			// so the sveltekit() plugin's transform won't match it.
			const real_path = resolved.id;
			const virtual_hash = hash(real_path);
			virtual_to_real.set(virtual_hash, real_path);

			return VIRTUAL_PREFIX + virtual_hash;
		},

		load(id) {
			if (!id.startsWith(VIRTUAL_PREFIX)) return;

			const virtual_hash = id.slice(VIRTUAL_PREFIX.length);
			const real_path = virtual_to_real.get(virtual_hash);
			if (!real_path) return;

			// Read the original .remote.ts source and generate client stubs
			const code = readFileSync(real_path, 'utf-8');
			const file = posixify(path.relative(process.cwd(), real_path));
			const remote_hash = hash(file);

			const remote_exports = [];
			const re = /export\s+const\s+(\w+)\s*=\s*(query|command|form|prerender)(?:\.batch)?\s*[.(]/g;
			let match;
			while ((match = re.exec(code)) !== null) {
				const name = match[1];
				const type = match[2];
				const is_batch = code.slice(match.index, match.index + match[0].length).includes('.batch');
				remote_exports.push({ name, type: is_batch ? 'query_batch' : type });
			}

			if (remote_exports.length === 0) return;

			let result = `import * as __remote from '__sveltekit/remote';\n\n`;
			for (const { name, type } of remote_exports) {
				const factory = type === 'query_batch' ? 'query' : type;
				result += `export const ${name} = __remote.${factory}('${remote_hash}/${name}');\n`;
			}

			return { code: result };
		},

		transform(code, id) {
			// Component mode uses resolveId + load instead of transform
			if (mode === 'component') return;

			if (!/\.remote\.(js|ts)$/.test(id)) return;

			// Server mode: append init_remote_functions() to set __.id and __.name.
			// Mirrors the production SSR transform in exports/vite/index.js.
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
