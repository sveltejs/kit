/** @import * as vite from 'vite' */
/** @import { ViteDevServer } from 'vite' */

/**
 * @param {typeof vite} vite_mod the vite module that created the server
 * @param {ViteDevServer} server
 */
export function get_runner({ isRunnableDevEnvironment }, server) {
	// `isRunnableDevEnvironment` does an `instanceof` check and will fail if
	// we're using different instances of Vite
	if (!isRunnableDevEnvironment(server.environments.ssr)) {
		throw new Error('The configured Vite SSR environment must be a RunnableDevEnvironment');
	}

	return server.environments.ssr.runner;
}
