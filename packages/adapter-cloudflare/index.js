/** @import { WorkerConfig } from '@cloudflare/vite-plugin' */
/** @import { ResolvedConfig } from 'vite' */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRequest } from '@sveltejs/kit/node';
import { plugin_config } from './config.js';
import { plugin_platform } from './platform.js';
import { validate_worker_settings, append_headers } from './utils.js';

const files = fileURLToPath(new URL('./files', import.meta.url));

/** @type {typeof import('./index.js').default} */
export default function (options = {}) {
	// Add a random query so we can reliably string-replace the stub
	const stub_import =
		import.meta.resolve('./src/virtual-cloudflare-workers.js') + '?' + crypto.randomUUID();

	/** @type {ResolvedConfig} */
	let vite_config;
	/** @type {WorkerConfig} */
	let wrangler_config;

	return {
		name: '@sveltejs/adapter-cloudflare',
		async adapt(builder) {
			if (fs.existsSync(`${builder.config.files.assets}/_headers`)) {
				throw new Error(
					`The _headers file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			if (fs.existsSync(`${builder.config.files.assets}/_redirects`)) {
				throw new Error(
					`The _redirects file should be placed in the project root rather than the ${builder.config.files.assets} directory`
				);
			}

			validate_worker_settings(wrangler_config);

			const dest = builder.getBuildDirectory('cloudflare');

			fs.rmSync(dest, { force: true, recursive: true });

			const assets = `${dest}/client`;
			fs.mkdirSync(assets, { recursive: true });

			const worker_dir = `${dest}/worker`;
			const worker_dest = `${worker_dir}/index.js`;
			const server_dir = `${worker_dir}/server`;
			builder.writeServer(server_dir);
			replace_stub(server_dir, stub_import);
			fs.rmSync(`${server_dir}/wrangler.json`);
			if (fs.existsSync(`${server_dir}/.dev.vars`)) {
				fs.renameSync(`${server_dir}/.dev.vars`, `${worker_dir}/.dev.vars`);
			}

			// client assets and prerendered pages
			const assets_dest = `${assets}${builder.config.paths.base}`;
			fs.mkdirSync(assets_dest, { recursive: true });
			if (wrangler_config.assets?.not_found_handling === '404-page') {
				// generate plaintext 404.html first which can then be overridden by prerendering, if the user defined such a page.
				// This file is served when a request fails to match an asset.
				const fallback = path.join(assets_dest, '404.html');
				if (options.fallback === 'spa') {
					await builder.generateFallback(fallback);
				} else {
					fs.writeFileSync(fallback, 'Not Found');
				}
			}
			builder.writeClient(assets_dest);
			builder.writePrerendered(assets_dest);
			if (wrangler_config.assets?.not_found_handling === 'single-page-application') {
				await builder.generateFallback(path.join(assets_dest, 'index.html'));
			}

			// worker
			const worker_dest_dir = path.dirname(worker_dest);
			builder.generateServerInstance(`${worker_dir}/server.js`, { serverDirectory: server_dir });
			builder.copy(`${files}/worker.js`, worker_dest, {
				replace: {
					// the paths returned by the Wrangler config might be Windows paths,
					// so we need to convert them to POSIX paths or else the backslashes
					// will be interpreted as escape characters and create an incorrect import path.
					// We also need to ensure the relative imports start with ./ since Wrangler
					// errors if a relative import looks like a package import
					SERVER: `./${posixify(path.relative(worker_dest_dir, worker_dir))}/server.js`,
					BASE_PATH: JSON.stringify(builder.config.paths.base),
					APP_PATH: JSON.stringify(builder.getAppPath()),
					MANIFEST_ASSETS: `new Set(${JSON.stringify(builder.manifest.assets.map((a) => a.path))})`,
					PRERENDERED: `new Set(${JSON.stringify(builder.prerendered.paths)})`,
					ASSETS_BINDING: wrangler_config.assets?.binding ?? 'ASSETS'
				}
			});
			if (builder.hasServerInstrumentationFile()) {
				const initializer = builder.createInstrumentationInitializer({
					outputDirectory: worker_dest_dir,
					serverDirectory: server_dir,
					environment: `import { env } from 'cloudflare:workers';\nexport default env;\n`
				});
				builder.instrument({
					entrypoint: worker_dest,
					instrumentation: `${server_dir}/instrumentation.server.js`,
					initializer,
					module: {
						generateText: ({ instrumentation, start, initializer }) =>
							`import './${initializer}';\nimport './${instrumentation}';\nexport { default } from './${start}';\n`
					}
				});
			}

			// _headers
			const headers_src = '_headers';
			const headers_dest = `${assets}/_headers`;
			/** @type {string | undefined} */
			let headers;
			if (fs.existsSync(headers_src)) {
				headers = fs.readFileSync(headers_src, 'utf-8');
			}
			fs.writeFileSync(headers_dest, generate_headers(builder.getAppPath(), headers));

			// _redirects
			const redirects_src = '_redirects';
			const redirects_dest = `${assets}/_redirects`;
			if (fs.existsSync(redirects_src)) {
				fs.copyFileSync(redirects_src, redirects_dest);
			}
			if (builder.prerendered.redirects.size > 0) {
				fs.writeFileSync(redirects_dest, generate_redirects(builder.prerendered.redirects), {
					flag: 'a'
				});
			}

			fs.writeFileSync(`${assets}/.assetsignore`, generate_assetsignore(), { flag: 'a' });

			// Point the Cloudflare deployment config at the final Worker and assets.
			/** @type {WorkerConfig} */
			const output_config = JSON.parse(
				fs.readFileSync(`${builder.getServerDirectory()}/wrangler.json`, 'utf8')
			);
			output_config.main = path.basename(worker_dest);
			/** @type {NonNullable<WorkerConfig['assets']>} */ (output_config.assets).directory =
				posixify(path.relative(worker_dir, assets));
			fs.writeFileSync(`${worker_dir}/wrangler.json`, JSON.stringify(output_config, null, 2));

			// point Wrangler to the adapter output's deployment config
			const deploy_config_path = path.join(vite_config.root, '.wrangler/deploy/config.json');
			/** @type {WorkerConfig} */
			const deploy_config = JSON.parse(fs.readFileSync(deploy_config_path, 'utf8'));
			deploy_config.configPath = posixify(
				path.relative(path.dirname(deploy_config_path), path.resolve(worker_dir, 'wrangler.json'))
			);
			fs.writeFileSync(deploy_config_path, JSON.stringify(deploy_config, null, 2));
		},
		supports: {
			read: () => true,
			instrumentation: () => true
		},
		vite: {
			getRequest(options) {
				const request = getRequest(options);
				/** @type {import('@cloudflare/workers-types').Request} */ (
					/** @type {unknown} */ (request)
				).cf = globalThis.__sveltekit_cloudflare_platform?.cf;
				return request;
			},
			plugins: [
				{
					name: 'vite-plugin-sveltekit-adapter-cloudflare-resolved-config',
					configResolved(config) {
						vite_config = config;
					}
				},
				...plugin_config(options.config, (config) => (wrangler_config = config)),
				plugin_platform(
					{
						configPath: options.config,
						...options.platformProxy
					},
					stub_import,
					() => wrangler_config?.targetEnvironment
				)
			]
		}
	};
}

/**
 * @param {string} app_dir
 * @param {string | undefined} content existing `_headers` file content
 * @returns {string}
 */
function generate_headers(app_dir, content = '') {
	content = append_headers(
		`/${app_dir}/*`,
		['X-Robots-Tag: noindex', 'Cache-Control: no-cache'],
		content
	);

	content = append_headers(
		`/${app_dir}/immutable/*`,
		['! Cache-Control', 'Cache-Control: public, immutable, max-age=31536000'],
		content
	);

	return content;
}

/**
 * @param {Map<string, { status: number; location: string }>} redirects
 * @returns {string}
 */
function generate_redirects(redirects) {
	const rules = Array.from(
		redirects.entries(),
		([path, redirect]) => `${path} ${redirect.location} ${redirect.status}`
	).join('\n');

	return `
# === START AUTOGENERATED SVELTE PRERENDERED REDIRECTS ===
${rules}
# === END AUTOGENERATED SVELTE PRERENDERED REDIRECTS ===
`.trimEnd();
}

/**
 * @returns {string}
 */
function generate_assetsignore() {
	// this comes from https://github.com/cloudflare/workers-sdk/blob/main/packages/create-cloudflare/templates-experimental/svelte/templates/static/.assetsignore
	return `
_worker.js
_routes.json
_headers
_redirects
`.trimEnd();
}

/** @param {string} str */
function posixify(str) {
	return str.replace(/\\/g, '/');
}

/**
 * @param {string} directory
 * @param {string} stub_import
 */
function replace_stub(directory, stub_import) {
	// Pad outside the string literal so that existing source-map columns stay valid.
	const padding = ' '.repeat(stub_import.length - 'cloudflare:workers'.length);
	// recurse, find stub_import, replace with "cloudflare:workers"
	const files = fs.readdirSync(directory);
	for (const file of files) {
		const file_path = path.join(directory, file);
		if (fs.statSync(file_path).isDirectory()) {
			replace_stub(file_path, stub_import);
		} else if (file.endsWith('.js')) {
			let contents = fs.readFileSync(file_path, 'utf8');
			if (contents.includes(stub_import)) {
				for (const quote of ['"', "'"]) {
					contents = contents.replaceAll(
						`${quote}${stub_import}${quote}`,
						`${quote}cloudflare:workers${quote}${padding}`
					);
				}
				fs.writeFileSync(file_path, contents);
			}
		}
	}
}
