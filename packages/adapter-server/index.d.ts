import type { AdapterViteConfig } from '@sveltejs/kit';

/**
 * Whether a static file is a dotfile, which servers customarily do not serve.
 * Files below `.well-known` are the exception.
 */
export function isHidden(file: string): boolean;

/**
 * Adds an adapter's runtime modules to the app's server build, so that they are bundled together
 * with the app's server code. Development dependencies are bundled too, and the production
 * dependencies in the app's `package.json` stay external.
 *
 * @example
 * ```js
 * vite: bundleRuntime({
 * 	name: 'adapter-example',
 * 	handoff: '#adapter-example',
 * 	src: new URL('./src', import.meta.url),
 * 	input: { index: 'index.js' }
 * })
 * ```
 */
export function bundleRuntime(options: {
	/**
	 * Names the module that hands build-time values to the runtime. The adapter writes
	 * `<name>.js` next to the server directory during `adapt`
	 */
	name: string;
	/** The specifier that the runtime modules import `<name>.js` with */
	handoff: string;
	/** The directory that contains the adapter's runtime modules */
	src: URL;
	/** Entry points of the runtime: output names and their files in `src` */
	input: Record<string, string>;
}): AdapterViteConfig;
