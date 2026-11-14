import * as path from 'node:path';
import process from 'node:process';
import { loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').ViteDevServer} */
let vite_dev_server;

/**
 * Renders requests in another Vite environment, like an adapter
 * for a platform whose runtime is not Node
 * @type {import('vite').Plugin}
 */
const other_environment = {
	name: 'test-other-environment',
	config: () => ({
		environments: {
			other: {
				consumer: 'server',
				define: {
					__TEST_ENVIRONMENT__: JSON.stringify('other')
				},
				resolve: {
					noExternal: ['@sveltejs/kit']
				}
			}
		}
	}),
	configureServer(server) {
		vite_dev_server = server;
	}
};

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	define: {
		__TEST_ENVIRONMENT__: JSON.stringify('ssr')
	},
	optimizeDeps: {
		// for CI, we need to explicitly prebundle deps, since
		// the reload confuses Playwright
		include: ['cookie']
	},
	plugins: [
		other_environment,
		sveltekit({
			adapter: {
				name: 'test-adapter',
				adapt: () => {},
				dev: {
					respond: async (request, { getClientAddress, resolve }) => {
						const { pathname } = new URL(request.url);

						if (pathname === '/adapter-respond') {
							return new Response('rendered by the adapter');
						}

						if (pathname.startsWith('/other-environment')) {
							const environment = /** @type {import('vite').RunnableDevEnvironment} */ (
								vite_dev_server.environments.other
							);

							/** @type {typeof import('@sveltejs/kit/adapter/dev')} */
							const { server } = await environment.runner.import('@sveltejs/kit/adapter/dev');

							await server.init({
								env: loadEnv(vite_dev_server.config.mode, process.cwd(), '')
							});
							return server.respond(request, { getClientAddress });
						}

						return resolve(request);
					}
				}
			},
			experimental: { remoteFunctions: true }
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;
