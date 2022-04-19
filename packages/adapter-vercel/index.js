import { writeFileSync } from 'fs';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const dir = '.vercel/output';

// rules for clean URLs and trailing slash handling,
// generated with @vercel/routing-utils
const redirects = {
	always: [
		{
			src: '^/(?:(.+)/)?index(?:\\.html)?/?$',
			headers: {
				Location: '/$1/'
			},
			status: 308
		},
		{
			src: '^/(.*)\\.html/?$',
			headers: {
				Location: '/$1/'
			},
			status: 308
		},
		{
			src: '^/\\.well-known(?:/.*)?$'
		},
		{
			src: '^/((?:[^/]+/)*[^/\\.]+)$',
			headers: {
				Location: '/$1/'
			},
			status: 308
		},
		{
			src: '^/((?:[^/]+/)*[^/]+\\.\\w+)/$',
			headers: {
				Location: '/$1'
			},
			status: 308
		}
	],
	never: [
		{
			src: '^/(?:(.+)/)?index(?:\\.html)?/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		},
		{
			src: '^/(.*)\\.html/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		},
		{
			src: '^/(.*)/$',
			headers: {
				Location: '/$1'
			},
			status: 308
		}
	],
	ignore: [
		{
			src: '^/(?:(.+)/)?index(?:\\.html)?/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		},
		{
			src: '^/(.*)\\.html/?$',
			headers: {
				Location: '/$1'
			},
			status: 308
		}
	]
};

/** @type {import('.')} **/
export default function ({ external = [] } = {}) {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('vercel-tmp');

			builder.rimraf(dir);
			builder.rimraf(tmp);

			const files = fileURLToPath(new URL('./files', import.meta.url).href);

			const dirs = {
				static: `${dir}/static`,
				lambda: `${dir}/functions/render.func`
			};

			builder.log.minor('Generating serverless function...');

			const relativePath = posix.relative(tmp, builder.getServerDirectory());

			builder.copy(files, tmp, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js'
				}
			});

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath
				})};\n`
			);

			await esbuild.build({
				entryPoints: [`${tmp}/entry.js`],
				outfile: `${dirs.lambda}/index.js`,
				target: 'node14',
				bundle: true,
				platform: 'node',
				format: 'cjs',
				external
			});

			writeFileSync(
				`${dirs.lambda}/.vc-config.json`,
				JSON.stringify({
					runtime: 'nodejs14.x',
					handler: 'index.js',
					launcherType: 'Nodejs'
				})
			);

			writeFileSync(`${dirs.lambda}/package.json`, JSON.stringify({ type: 'commonjs' }));

			builder.log.minor('Copying assets...');

			builder.writeStatic(dirs.static);
			builder.writeClient(dirs.static);
			builder.writePrerendered(dirs.static);

			builder.log.minor('Writing routes...');

			const prerendered_pages = Array.from(builder.prerendered.pages, ([src, page]) => ({
				src,
				dest: page.file
			}));

			const prerendered_redirects = Array.from(
				builder.prerendered.redirects,
				([src, redirect]) => ({
					src,
					headers: {
						Location: redirect.location
					},
					status: redirect.status
				})
			);

			writeFileSync(
				`${dir}/config.json`,
				JSON.stringify({
					version: 3,
					target: 'production',
					routes: [
						...redirects[builder.config.kit.trailingSlash],
						...prerendered_pages,
						...prerendered_redirects,
						{
							src: `/${builder.config.kit.appDir}/.+`,
							headers: {
								'cache-control': 'public, immutable, max-age=31536000'
							}
						},
						{
							handle: 'filesystem'
						},
						{
							src: '/.*',
							dest: 'render'
						}
					]
				})
			);
		}
	};
}
