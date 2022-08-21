import { platforms } from './platforms.js';

/** @type {import('.').default} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-static',

		async adapt(builder) {
			if (!options?.fallback && !builder.config.kit.prerender.default) {
				throw Error(
					'adapter-static requires `config.kit.prerender.default` to be `true` unless you set the `fallback: true` option to create a single-page app. See https://github.com/sveltejs/kit/tree/master/packages/adapter-static#spa-mode for more information'
				);
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
