import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { posix, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { getPlatformProxy, unstable_readConfig } from 'wrangler';

// list from https://developers.cloudflare.com/workers/runtime-apis/nodejs/
const compatible_node_modules = [
	'assert',
	'async_hooks',
	'buffer',
	'crypto',
	'diagnostics_channel',
	'events',
	'path',
	'process',
	'stream',
	'string_decoder',
	'util'
];

/** @type {import('./index.js').default} */
export default function ({ config, platformProxy = {} } = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		async adapt(builder) {
			const { main, site, compatibility_flags } = validate_config(builder, config);

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const tmp = builder.getBuildDirectory('cloudflare-workers-tmp');

			builder.rimraf(site.bucket);
			builder.rimraf(dirname(main));

			builder.log.info('Installing worker dependencies...');
			builder.copy(`${files}/_package.json`, `${tmp}/package.json`);

			// TODO would be cool if we could make this step unnecessary somehow
			const stdout = execSync('npm install', { cwd: tmp });
			builder.log.info(stdout.toString());

			builder.log.minor('Generating worker...');
			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.copy(`${files}/entry.js`, `${tmp}/entry.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			let prerendered_entries = Array.from(builder.prerendered.pages.entries());

			if (builder.config.kit.paths.base) {
				prerendered_entries = prerendered_entries.map(([path, { file }]) => [
					path,
					{ file: `${builder.config.kit.paths.base}/${file}` }
				]);
			}

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n\n` +
					`export const prerendered = new Map(${JSON.stringify(prerendered_entries)});\n\n` +
					`export const base_path = ${JSON.stringify(builder.config.kit.paths.base)};\n`
			);

			const external = ['__STATIC_CONTENT_MANIFEST', 'cloudflare:*'];
			if (compatibility_flags && compatibility_flags.includes('nodejs_compat')) {
				external.push(...compatible_node_modules.map((id) => `node:${id}`));
			}

			try {
				const result = await esbuild.build({
					platform: 'browser',
					// https://github.com/cloudflare/workers-sdk/blob/a12b2786ce745f24475174bcec994ad691e65b0f/packages/wrangler/src/deployment-bundle/bundle.ts#L35-L36
					conditions: ['workerd', 'worker', 'browser'],
					sourcemap: 'linked',
					target: 'es2022',
					entryPoints: [`${tmp}/entry.js`],
					outfile: main,
					bundle: true,
					external,
					alias: Object.fromEntries(compatible_node_modules.map((id) => [id, `node:${id}`])),
					format: 'esm',
					loader: {
						'.wasm': 'copy',
						'.woff': 'copy',
						'.woff2': 'copy',
						'.ttf': 'copy',
						'.eot': 'copy',
						'.otf': 'copy'
					},
					logLevel: 'silent'
				});

				if (result.warnings.length > 0) {
					const formatted = await esbuild.formatMessages(result.warnings, {
						kind: 'warning',
						color: true
					});

					console.error(formatted.join('\n'));
				}
			} catch (error) {
				for (const e of error.errors) {
					for (const node of e.notes) {
						const match =
							/The package "(.+)" wasn't found on the file system but is built into node/.exec(
								node.text
							);

						if (match) {
							node.text = `Cannot use "${match[1]}" when deploying to Cloudflare.`;
						}
					}
				}

				const formatted = await esbuild.formatMessages(error.errors, {
					kind: 'error',
					color: true
				});

				console.error(formatted.join('\n'));

				throw new Error(
					`Bundling with esbuild failed with ${error.errors.length} ${
						error.errors.length === 1 ? 'error' : 'errors'
					}`
				);
			}

			builder.log.minor('Copying assets...');
			const bucket_dir = `${site.bucket}${builder.config.kit.paths.base}`;
			builder.writeClient(bucket_dir);
			builder.writePrerendered(bucket_dir);
		},

		emulate() {
			// we want to invoke `getPlatformProxy` only once, but await it only when it is accessed.
			// If we would await it here, it would hang indefinitely because the platform proxy only resolves once a request happens
			const get_emulated = async () => {
				const proxy = await getPlatformProxy(platformProxy);
				const platform = /** @type {App.Platform} */ ({
					env: proxy.env,
					context: proxy.ctx,
					caches: proxy.caches,
					cf: proxy.cf
				});
				/** @type {Record<string, any>} */
				const env = {};
				const prerender_platform = /** @type {App.Platform} */ (/** @type {unknown} */ ({ env }));
				for (const key in proxy.env) {
					Object.defineProperty(env, key, {
						get: () => {
							throw new Error(`Cannot access platform.env.${key} in a prerenderable route`);
						}
					});
				}
				return { platform, prerender_platform };
			};

			/** @type {{ platform: App.Platform, prerender_platform: App.Platform }} */
			let emulated;

			return {
				platform: async ({ prerender }) => {
					emulated ??= await get_emulated();
					return prerender ? emulated.prerender_platform : emulated.platform;
				}
			};
		},
		supports: {
			webSockets: () => true
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string} config_file
 * @returns {import('wrangler').Unstable_Config}
 */
function validate_config(builder, config_file = undefined) {
	const wrangler_config = unstable_readConfig({ config: config_file });

	if (!wrangler_config.configPath) {
		builder.log.error(
			'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
		);
		builder.log(
			`
Sample wrangler.jsonc:
{
	"name": "<your-service-name>",
	"account_id": "<your-account-id>",
	"main": "./.cloudflare/worker.js",
	"site": {
		"bucket": "./.cloudflare/public"
	},
	"build": {
		"command": "npm run build"
	},
	"compatibility_date": "2021-11-12"
}
	`.trim()
		);
		throw new Error('Missing a Wrangler configuration file');
	}

	if (!wrangler_config.site?.bucket) {
		throw new Error(
			`You must specify the \`site.bucket\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/platform/sites/configuration`
		);
	}

	if (!wrangler_config.main) {
		throw new Error(
			`You must specify the \`main\` key in ${wrangler_config.configPath}. Consult https://developers.cloudflare.com/workers/platform/sites/configuration`
		);
	}

	return wrangler_config;
}
