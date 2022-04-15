import { existsSync, readFileSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { execSync } from 'child_process';
import esbuild from 'esbuild';
import toml from '@iarna/toml';
import { fileURLToPath } from 'url';

/** @type {import('.')} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',

		async adapt(builder) {
			const { site, build } = validate_config(builder);

			// @ts-ignore
			const { bucket } = site;

			// @ts-ignore
			const entrypoint = site['entry-point'] || 'workers-site';

			// @ts-ignore
			const main_path = build.upload.main;

			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const tmp = builder.getBuildDirectory('cloudflare-workers-tmp');

			builder.rimraf(bucket);
			builder.rimraf(entrypoint);

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

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n\nexport const prerendered = new Map(${JSON.stringify(
					Array.from(builder.prerendered.pages.entries())
				)});\n`
			);

			await esbuild.build({
				target: 'es2020',
				platform: 'browser',
				...options,
				entryPoints: [`${tmp}/entry.js`],
				outfile: `${entrypoint}/${main_path}`,
				bundle: true,
				external: ['__STATIC_CONTENT_MANIFEST', ...(options?.external || [])],
				format: 'esm'
			});

			writeFileSync(
				`${entrypoint}/package.json`,
				JSON.stringify({ main: main_path, type: 'module' })
			);

			builder.log.minor('Copying assets...');
			builder.writeClient(bucket);
			builder.writeStatic(bucket);
			builder.writePrerendered(bucket);
		}
	};
}

/** @param {import('@sveltejs/kit').Builder} builder */
function validate_config(builder) {
	if (existsSync('wrangler.toml')) {
		let wrangler_config;

		try {
			wrangler_config = toml.parse(readFileSync('wrangler.toml', 'utf-8'));
		} catch (err) {
			err.message = `Error parsing wrangler.toml: ${err.message}`;
			throw err;
		}

		// @ts-ignore
		if (!wrangler_config.site || !wrangler_config.site.bucket) {
			throw new Error(
				'You must specify site.bucket in wrangler.toml. Consult https://developers.cloudflare.com/workers/platform/sites/configuration'
			);
		}

		// @ts-ignore
		if (!wrangler_config.build || !wrangler_config.build.upload) {
			throw new Error(
				'You must specify build.upload options in wrangler.toml. Consult https://github.com/sveltejs/kit/tree/master/packages/adapter-cloudflare-workers'
			);
		}

		// @ts-ignore
		if (wrangler_config.build.upload.format !== 'modules') {
			throw new Error('build.upload.format in wrangler.toml must be "modules"');
		}

		// @ts-ignore
		const main_file = wrangler_config.build?.upload?.main;
		const main_file_ext = main_file?.split('.').slice(-1)[0];
		if (main_file_ext && main_file_ext !== 'mjs') {
			// @ts-ignore
			const upload_rules = wrangler_config.build?.upload?.rules;
			// @ts-ignore
			const matching_rule = upload_rules?.find(({ globs }) =>
				// @ts-ignore
				globs.find((glob) => glob.endsWith(`*.${main_file_ext}`))
			);
			if (!matching_rule) {
				throw new Error(
					'To support a build.upload.main value not ending in .mjs, an upload rule must be added to build.upload.rules. Consult https://developers.cloudflare.com/workers/cli-wrangler/configuration/#build'
				);
			}
		}

		return wrangler_config;
	}

	builder.log.error(
		'Consult https://developers.cloudflare.com/workers/platform/sites/configuration on how to setup your site'
	);

	builder.log(
		`
		Sample wrangler.toml:

		name = "<your-site-name>"
		type = "javascript"
		account_id = "<your-account-id>"
		workers_dev = true
		route = ""
		zone_id = ""

		[build]
    command = ""

		[build.upload]
		format = "modules"
		main = "./worker.mjs"

		[site]
		bucket = "./.cloudflare/assets"
		entry-point = "./.cloudflare/worker"`
			.replace(/^\t+/gm, '')
			.trim()
	);

	throw new Error('Missing a wrangler.toml file');
}
