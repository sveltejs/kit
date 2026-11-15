import { rmSync } from 'node:fs';
import path from 'node:path';
import { platforms } from './platforms.js';

/** @type {typeof import('./index.js').default} */
export default function (options) {
	/** @param {import('@sveltejs/kit').Builder['config']} config */
	const must_prerender_all = (config) =>
		!options?.fallback && config.router?.type !== 'hash' && options?.strict !== false;

	return {
		name: '@sveltejs/adapter-static',
		dev: ({ config }) => ({
			async respond(request, { resolve }) {
				const response = await resolve(request);

				const prerender = response.headers.get('x-sveltekit-prerender');
				const route_id = response.headers.get('x-sveltekit-routeid');

				if (
					prerender !== null &&
					prerender !== 'true' &&
					route_id !== null &&
					must_prerender_all(config)
				) {
					const id = decodeURI(route_id);
					const { message, help } = dynamic_routes_error(config, [id], id.includes('['));

					const error = new Error([message, ...help].join('\n'));
					error.stack = '';
					throw error;
				}

				return response;
			}
		}),
		async adapt(builder) {
			if (must_prerender_all(builder.config)) {
				const dynamic_routes = builder.routes.filter((route) => route.prerender !== true);
				if (dynamic_routes.length > 0) {
					const { message, help } = dynamic_routes_error(
						builder.config,
						dynamic_routes.map((route) => route.id),
						builder.routes.some((route) => route.id.includes('['))
					);

					builder.log.error(`\n${message}`);

					for (const line of help) {
						builder.log(line);
					}

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

			rmSync(assets, { force: true, recursive: true });
			rmSync(pages, { force: true, recursive: true });

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
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder['config']} config
 * @param {string[]} route_ids
 * @param {boolean} has_param_routes
 */
function dynamic_routes_error(config, route_ids, has_param_routes) {
	const prefix = path.relative('.', config.files.routes);

	const options = [
		'set the `fallback` option — see https://svelte.dev/docs/kit/single-page-apps#usage for more info.',
		'add `export const prerender = true` to your root `+layout.js/.ts` or `+layout.server.js/.ts` file. This will try to prerender all pages.',
		'add `export const prerender = true` to any `+server.js/ts` files that are not fetched by page `load` functions.'
	];

	if (has_param_routes || JSON.stringify(config.prerender.entries) !== '["*"]') {
		let option = 'adjust the `prerender.entries` config option';
		if (has_param_routes)
			option += ' (routes with parameters are not part of entry points by default)';
		options.push(option);
	}

	options.push(
		"pass `strict: false` to `adapter-static` to ignore this error. Only do this if you are sure you don't need the routes in question in your final app, as they will be unavailable. See https://github.com/sveltejs/kit/tree/main/packages/adapter-static#strict for more info."
	);

	return {
		message: `@sveltejs/adapter-static: all routes must be fully prerenderable, but found the following routes that are dynamic:
${route_ids.map((id) => `  - ${path.posix.join(prefix, id)}`).join('\n')}\n`,
		help: [
			`You have the following options:${options.map((o) => `\n  - ${o}`).join('')}\n`,
			`If this doesn't help, you may need to use a different adapter. @sveltejs/adapter-static can only be used for sites that don't need a server for dynamic rendering, and can run on just a static file server.\n`,
			`See https://svelte.dev/docs/kit/page-options#prerender for more details\n`
		]
	};
}
