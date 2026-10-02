/** @import { ViteDevServer } from 'vite' */
import * as vite from 'vite';

/**
 * @param {ViteDevServer} server
 */
export function get_runner(server) {
	if (!vite.isRunnableDevEnvironment(server.environments.ssr)) {
		throw new Error('The configured Vite SSR environment must be a RunnableDevEnvironment');
	}

	return server.environments.ssr.runner;
}
