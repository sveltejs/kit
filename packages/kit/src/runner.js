/** @import * as vite from 'vite' */
/** @import { ViteDevServer } from 'vite' */
import * as e from './messages/build-errors.js';

/**
 * @param {typeof vite} vite the vite module that created the server
 * @param {ViteDevServer} server
 */
export function get_runner({ isRunnableDevEnvironment }, server) {
	// `isRunnableDevEnvironment` does an `instanceof` check and will fail if
	// we're using different instances of Vite
	if (!isRunnableDevEnvironment(server.environments.ssr)) {
		e.vite_ssr_environment_not_runnable();
	}

	return server.environments.ssr.runner;
}
