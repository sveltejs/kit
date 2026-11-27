import { createReadStream, existsSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import sirv from 'sirv';
import { platforms } from './platforms.js';

/** @type {typeof import('./index.js').default} */
export default function (options) {
	return {
		name: '@sveltejs/adapter-static',
		vite: ({ config }) => ({
			plugins: [preview(options, config.paths.base)]
		}),
		async adapt(builder) {
			if (!options?.fallback && builder.config.router?.type !== 'hash') {
				const dynamic_routes = builder.routes.filter((route) => route.prerender !== true);
				if (dynamic_routes.length > 0 && options?.strict !== false) {
					const prefix = path.relative('.', builder.config.files.routes);
					const has_param_routes = builder.routes.some((route) => route.id.includes('['));

					builder.log.error(
						`\n@sveltejs/adapter-static: all routes must be fully prerenderable, but found the following routes that are dynamic:
${dynamic_routes.map((route) => `  - ${path.posix.join(prefix, route.id)}`).join('\n')}\n`
					);

					const options = [
						'set the `fallback` option — see https://svelte.dev/docs/kit/single-page-apps#usage for more info.',
						'add `export const prerender = true` to your root `+layout.js/.ts` or `+layout.server.js/.ts` file. This will try to prerender all pages.',
						'add `export const prerender = true` to any `+server.js/ts` files that are not fetched by page `load` functions.'
					];

					if (has_param_routes || JSON.stringify(builder.config.prerender.entries) !== '["*"]') {
						let option = 'adjust the `prerender.entries` config option';
						if (has_param_routes)
							option += ' (routes with parameters are not part of entry points by default)';
						options.push(option);
					}

					options.push(
						"pass `strict: false` to `adapter-static` to ignore this error. Only do this if you are sure you don't need the routes in question in your final app, as they will be unavailable. See https://github.com/sveltejs/kit/tree/main/packages/adapter-static#strict for more info."
					);

					builder.log(
						`You have the following options:${options.map((o) => `\n  - ${o}`).join('')}\n`
					);

					builder.log(
						`If this doesn't help, you may need to use a different adapter. @sveltejs/adapter-static can only be used for sites that don't need a server for dynamic rendering, and can run on just a static file server.\n`
					);

					builder.log(`See https://svelte.dev/docs/kit/page-options#prerender for more details\n`);

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
 * makes vite preview serve the build output like a static host instead of rendering on the server
 * @param {import('./index.js').AdapterOptions | undefined} options
 * @param {string} base
 * @returns {import('vite').Plugin}
 */
function preview(options, base) {
	return {
		name: 'vite-plugin-sveltekit-adapter-static',
		configurePreviewServer(server) {
			const {
				pages = 'build',
				assets = pages,
				fallback,
				precompress
			} = options ??
			platforms.find((platform) => platform.test())?.defaults ??
			/** @type {import('./index.js').AdapterOptions} */ ({});

			/** @type {Map<string, import('sirv').RequestHandler>} */
			const dirs = new Map();

			for (const dir of new Set([assets, pages])) {
				if (!existsSync(dir)) {
					const error = new Error(
						`@sveltejs/adapter-static: \`${dir}\` does not exist. Run \`vite build\` before \`vite preview\``
					);
					error.stack = '';
					throw error;
				}

				// sirv picks precompressed files and handles conditional and range requests
				const serve = sirv(dir, {
					dev: true,
					etag: true,
					extensions: [],
					brotli: precompress,
					gzip: precompress
				});

				dirs.set(path.resolve(dir), serve);
			}

			/** @type {Array<[file: string, status: number]>} */
			const not_found_pages = [['404.html', 404]];
			if (fallback) not_found_pages.unshift([fallback, fallback === '404.html' ? 404 : 200]);

			/** @param {string} file a decoded path relative to the output directories */
			const find = (file) => {
				for (const [dir, serve] of dirs) {
					const resolved = path.join(dir, file);

					// decoding can introduce path separators on windows, so check containment after joining
					if (
						resolved.startsWith(dir + path.sep) &&
						statSync(resolved, { throwIfNoEntry: false })?.isFile()
					) {
						return { file: resolved, serve };
					}
				}
			};

			/** @param {import('node:http').ServerResponse} res */
			const not_found = (res) => {
				for (const [file, status] of not_found_pages) {
					const match = find(file);
					if (match) {
						res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
						createReadStream(match.file).pipe(res);
						return;
					}
				}

				res.writeHead(404).end('Not Found');
			};

			// runs after vite middleware such as preview.proxy, but before sveltekit renders the request
			return () => {
				server.middlewares.use((req, res) => {
					if (req.method !== 'GET' && req.method !== 'HEAD') {
						res.writeHead(405, { allow: 'GET, HEAD' }).end('Method Not Allowed');
						return;
					}

					// vite may have removed the base from req.url
					const { pathname, search } = new URL(
						req.originalUrl ?? req.url ?? '/',
						'http://localhost'
					);

					if (pathname !== base && !pathname.startsWith(base + '/')) {
						res.writeHead(404).end('Not Found');
						return;
					}

					const encoded = pathname.slice(base.length);

					/** @type {string} */
					let decoded;
					try {
						decoded = decodeURI(encoded);
					} catch {
						return not_found(res);
					}

					for (const suffix of encoded.endsWith('/') ? ['index.html'] : ['', '.html']) {
						const match = find(decoded + suffix);
						if (match) {
							req.url = encoded + suffix;
							return match.serve(req, res, () => not_found(res));
						}
					}

					// static hosts redirect a directory to add the trailing slash
					if (!encoded.endsWith('/') && find(decoded + '/index.html')) {
						res.writeHead(308, { location: `${base}${encoded}/${search}` }).end();
						return;
					}

					not_found(res);
				});
			};
		}
	};
}
