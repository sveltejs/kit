import path from 'path';
import { platforms } from './platforms.js';

/** @type {import('.').default} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt(builder) {
			if (!options?.fallback) {
				/** @type {string[]} */
				const dynamic_routes = [];

				// this is a bit of a hack — it allows us to know whether there are dynamic
				// (i.e. prerender = false/'auto') routes without having dedicated API
				// surface area for it
				builder.createEntries((route) => {
					dynamic_routes.push(route.id);

					return {
						id: '',
						filter: () => false,
						complete: () => {}
					};
				});

				if (dynamic_routes.length > 0) {
					const prefix = path.relative('.', builder.config.kit.files.routes);
					builder.log.error(
						`@sveltejs/adapter-static: cannot have dynamic routes unless using the 'fallback' option. See https://github.com/sveltejs/kit/tree/master/packages/adapter-static#spa-mode for more information`
					);
					builder.log.error(
						dynamic_routes.map((id) => `  - ${path.posix.join(prefix, id)}`).join('\n')
					);
					throw new Error('Encountered dynamic routes');
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
			} = options ??
			platform?.defaults(builder.config) ??
			/** @type {import('./index').AdapterOptions} */ ({});

			builder.rimraf(assets);
			builder.rimraf(pages);

			builder.writeClient(assets);
			builder.writePrerendered(pages, { fallback });

			if (precompress) {
				if (pages === assets) {
					builder.log.minor('Compressing assets and pages');
					await builder.compress(assets);
				} else {
					builder.log.minor('Compressing assets');
					await builder.compress(assets);

					builder.log.minor('Compressing pages');
					await builder.compress(pages);
				}
			}

			if (pages === assets) {
				builder.log(`Wrote site to "${pages}"`);
			} else {
				builder.log(`Wrote pages to "${pages}" and assets to "${assets}"`);
			}

			if (!options) platform?.done(builder);
		}
	};
}
