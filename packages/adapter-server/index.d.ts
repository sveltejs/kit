import type { Plugin } from 'vite';

/**
 * Whether a static file is a dotfile, which servers customarily do not serve.
 * Files below `.well-known` are the exception.
 */
export function isHidden(file: string): boolean;

/**
 * A Vite plugin that adds an adapter's runtime modules to the app's server build, so that they
 * are bundled together with the app's server code. Development dependencies are bundled too, and
 * the production dependencies in the app's `package.json` stay external.
 *
 * @example
 * ```js
 * vite: {
 * 	plugins: {
 * 		post: [
 * 			bundleRuntime({
 * 				name: '@example/adapter-example',
 * 				src: new URL('./src', import.meta.url),
 * 				input: { 'adapter-index': 'index.js' }
 * 			})
 * 		]
 * 	}
 * }
 * ```
 */
export function bundleRuntime(options: {
	/**
	 * The adapter's package name. The runtime modules import build-time values from `#<name>`,
	 * a module that the adapter writes next to the server directory during `adapt`, as
	 * `adapter-example.js` for `@example/adapter-example`
	 */
	name: string;
	/** The directory that contains the adapter's runtime modules */
	src: URL;
	/**
	 * Entry points of the runtime: output names and their files in `src`. The output is written
	 * next to SvelteKit's own server files, `index.js`, `env.js` and `server.js` among them, so
	 * the names need a prefix of their own
	 */
	input: Record<string, string>;
}): Plugin;
