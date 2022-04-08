import { existsSync, readFileSync, writeFileSync } from 'fs';
import { posix } from 'path';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import toml from '@iarna/toml';
import { fileURLToPath } from 'url';

/** @type {import('.')} */
export default function (options = {}) {
	return {
		name: '@sveltejs/adapter-cloudflare-workers',
		async adapt(builder) {
			validate_config(builder);

			// @ts-ignore
			const files = fileURLToPath(new URL('./files', import.meta.url).href);
			const dest = builder.getBuildDirectory('cloudflare');
			const bucket = builder.getBuildDirectory('cloudflare-bucket');
			const tmp = builder.getBuildDirectory('cloudflare-tmp');

			builder.rimraf(dest);
			builder.rimraf(bucket);
			builder.rimraf(tmp);

			builder.mkdirp(tmp);

			builder.writeStatic(bucket);
			builder.writeClient(bucket);
			builder.writePrerendered(bucket);

			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.log.info('Installing worker dependencies...');
			builder.copy(`${files}/_package.json`, `${tmp}/package.json`);

			// TODO would be cool if we could make this step unnecessary somehow
			const stdout = execSync('npm install', { cwd: tmp });
			builder.log.info(stdout.toString());

			builder.log.minor('Generating worker...');

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n\nexport const prerendered = new Map(${JSON.stringify(
					Array.from(builder.prerendered.pages.entries())
				)});\n`
			);

			builder.copy(`${files}/worker.js`, `${tmp}/_worker.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			const external = ['__STATIC_CONTENT_MANIFEST'];

			if (options.external) {
				external.push(...options.external);
			}

			await esbuild.build({
				target: 'es2020',
				platform: 'browser',
				...options,
				entryPoints: [`${tmp}/_worker.js`],
				external,
				outfile: `${dest}/_worker.mjs`,
				allowOverwrite: true,
				format: 'esm',
				bundle: true
			});
		}
	};
}

/** @param {import('@sveltejs/kit').Builder} builder */
function validate_config(builder) {
	if (!existsSync('wrangler.toml')) {
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

			compatibility_date = "2022-02-09"

			[build]
			# Assume it's already been built. You can make this "npm run build" to ensure a build before publishing
			command = ""

			# All values below here are required by adapter-cloudflare-workers and should not change
			[build.upload]
			format = "modules"
			dir = "./.svelte-kit/cloudflare"
			main = "./_worker.mjs"

			[site]
			bucket = "./.svelte-kit/cloudflare-bucket"`
				.replace(/^\t+/gm, '')
				.trim()
		);

		throw new Error('Missing a wrangler.toml file');
	}

	let wrangler_config;

	try {
		wrangler_config = toml.parse(readFileSync('wrangler.toml', 'utf-8'));
	} catch (err) {
		err.message = `Error parsing wrangler.toml: ${err.message}`;
		throw err;
	}

	// @ts-ignore
	if (!wrangler_config.site || wrangler_config.site.bucket !== './.svelte-kit/cloudflare-bucket') {
		throw new Error(
			'You must specify site.bucket in wrangler.toml, and it must equal "./.svelte-kit/cloudflare-bucket"'
		);
	}

	// @ts-ignore
	if (
		// @ts-ignore
		!wrangler_config.build ||
		// @ts-ignore
		!wrangler_config.build.upload ||
		// @ts-ignore
		wrangler_config.build.upload.format !== 'modules'
	) {
		throw new Error(
			'You must specify build.upload.format in wrangler.toml, and it must equal "modules"'
		);
	}

	if (
		// @ts-ignore
		!wrangler_config.build ||
		// @ts-ignore
		!wrangler_config.build.upload ||
		// @ts-ignore
		wrangler_config.build.upload.dir !== './.svelte-kit/cloudflare'
	) {
		throw new Error(
			'You must specify build.upload.dir in wrangler.toml, and it must equal "./.svelte-kit/cloudflare"'
		);
	}

	if (
		// @ts-ignore
		!wrangler_config.build ||
		// @ts-ignore
		!wrangler_config.build.upload ||
		// @ts-ignore
		wrangler_config.build.upload.main !== './_worker.mjs'
	) {
		throw new Error(
			'You must specify build.upload.main in wrangler.toml, and it must equal "./_worker.mjs"'
		);
	}
}
