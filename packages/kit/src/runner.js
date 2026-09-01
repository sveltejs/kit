/** @import * as vite_types from 'vite' */

/**
 * @param {typeof vite_types} vite the vite module that created the server
 * @param {vite_types.ViteDevServer} server
 */
export function get_runner(vite, server) {
	// `isRunnableDevEnvironment` does an `instanceof` check and will fail if
	// we're using different instances of Vite
	if (!vite.isRunnableDevEnvironment(server.environments.ssr)) {
		throw new Error('The configured Vite SSR environment must be a RunnableDevEnvironment');
	}

	return server.environments.ssr.runner;
}
