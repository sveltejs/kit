import path from 'node:path';
import { platforms } from './platforms.js';
import { get_options_message } from './utils.js';

/** @type {import('./index.js').default} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-static',
		async adapt(builder) {
			if (!options?.fallback && builder.config.kit.router?.type !== 'hash') {
				const dynamic_routes = builder.routes.filter((route) => route.prerender !== true);
				if (dynamic_routes.length > 0 && options?.strict !== false) {
					const prefix = path.relative('.', builder.config.kit.files.routes);
					const has_param_routes = builder.routes.some((route) => route.id.includes('['));

					builder.log.error(
						`\n@sveltejs/adapter-static: all routes must be fully prerenderable, but found the following routes that are dynamic:
${dynamic_routes.map((route) => `  - ${path.posix.join(prefix, route.id)}`).join('\n')}\n`
					);

					builder.log(
						get_options_message(
							has_param_routes,
							JSON.stringify(builder.config.kit.prerender.entries) !== '["*"]'
						)
					);

					const error = new Error('Encountered dynamic routes');
					error.stack = '';
					throw error;
				}
			}

			const platform = platforms.find((platform) => platform.test());

			if (platform) {
				if (options) {
					builder.log.warn(
						`Detected ${platform.name}. Please remove adapter-static options to enable zero-config mode`
					);
				} else {
					builder.log.info(`Detected ${platform.name}, using zero-config mode`);
				}
			}

			const {
				pages = 'build',
				assets = pages,
				fallback,
				precompress
			} = options ?? platform?.defaults ?? /** @type {import('./index.js').AdapterOptions} */ ({});

			builder.rimraf(assets);
			builder.rimraf(pages);

			builder.generateEnvModule();
			builder.writeClient(assets);
			builder.writePrerendered(pages);

			if (fallback) {
				await builder.generateFallback(path.join(pages, fallback));
			}

			if (precompress) {
				builder.log.minor('Compressing assets and pages');
				if (pages === assets) {
					await builder.compress(assets);
				} else {
					await Promise.all([builder.compress(assets), builder.compress(pages)]);
				}
			}

			if (pages === assets) {
				builder.log(`Wrote site to "${pages}"`);
			} else {
				builder.log(`Wrote pages to "${pages}" and assets to "${assets}"`);
			}

			if (!options) platform?.done(builder);
		},
		vite: {
			plugins: [
				{
					name: 'vite-plugin-sveltekit-adapter-static',
					configEnvironment(name) {
						if (name === 'ssr') {
							return {
								define: {
									__SVELTEKIT_ADAPTER_STATIC_FALLBACK__: options?.fallback ? 'true' : 'false'
								}
							};
						}
					},
					applyToEnvironment(environment) {
						return environment.name === 'ssr';
					},
					resolveId: {
						filter: {
							id: /^sveltekit:server-entry$/
						},
						handler() {
							return this.resolve(import.meta.resolve('./src/dev.js'));
						}
					}
				}
			]
		}
	};
}
