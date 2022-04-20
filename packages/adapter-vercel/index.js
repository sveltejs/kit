import { mkdirSync, writeFileSync } from 'fs';
import { dirname, posix } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

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
export default function ({ external = [], edge, split } = {}) {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			if (process.env.ENABLE_VC_BUILD) {
				await v3(builder, external, edge, split);
			} else {
				if (edge || split) {
					throw new Error('edge and split options can only be used with ENABLE_VC_BUILD');
				}

				await v1(builder, external);
			}
		}
	};
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string[]} external
 */
async function v1(builder, external) {
	const dir = '.vercel_build_output';

	const tmp = builder.getBuildDirectory('vercel-tmp');

	builder.rimraf(dir);
	builder.rimraf(tmp);

	const files = fileURLToPath(new URL('./files', import.meta.url).href);

	const dirs = {
		static: `${dir}/static`,
		lambda: `${dir}/functions/node/render`
	};

	builder.log.minor('Generating serverless function...');

	const relativePath = posix.relative(tmp, builder.getServerDirectory());

	builder.copy(`${files}/serverless.js`, `${tmp}/serverless.js`, {
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
		entryPoints: [`${tmp}/serverless.js`],
		outfile: `${dirs.lambda}/index.js`,
		target: 'node14',
		bundle: true,
		platform: 'node',
		external
	});

	writeFileSync(`${dirs.lambda}/package.json`, JSON.stringify({ type: 'commonjs' }));

	builder.log.minor('Copying assets...');

	builder.writeStatic(dirs.static);
	builder.writeClient(dirs.static);
	builder.writePrerendered(dirs.static);

	builder.log.minor('Writing routes...');

	builder.mkdirp(`${dir}/config`);

	const prerendered_pages = Array.from(builder.prerendered.pages, ([src, page]) => ({
		src,
		dest: page.file
	}));

	const prerendered_redirects = Array.from(builder.prerendered.redirects, ([src, redirect]) => ({
		src,
		headers: {
			Location: redirect.location
		},
		status: redirect.status
	}));

	writeFileSync(
		`${dir}/config/routes.json`,
		JSON.stringify([
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
				dest: '.vercel/functions/render'
			}
		])
	);
}

/**
 * @param {import('@sveltejs/kit').Builder} builder
 * @param {string[]} external
 * @param {boolean} edge
 * @param {boolean} split
 */
async function v3(builder, external, edge, split) {
	const dir = '.vercel/output';

	const tmp = builder.getBuildDirectory('vercel-tmp');

	builder.rimraf(dir);
	builder.rimraf(tmp);

	const files = fileURLToPath(new URL('./files', import.meta.url).href);

	const dirs = {
		static: `${dir}/static`,
		functions: `${dir}/functions`
	};

	const prerendered_redirects = Array.from(builder.prerendered.redirects, ([src, redirect]) => ({
		src,
		headers: {
			Location: redirect.location
		},
		status: redirect.status
	}));

	/** @type {any[]} */
	const routes = [
		...redirects[builder.config.kit.trailingSlash],
		...prerendered_redirects,
		{
			src: `/${builder.config.kit.appDir}/.+`,
			headers: {
				'cache-control': 'public, immutable, max-age=31536000'
			}
		},
		{
			handle: 'filesystem'
		}
	];

	builder.log.minor('Generating serverless function...');

	/**
	 * @param {string} name
	 * @param {string} pattern
	 * @param {(options: { relativePath: string }) => string} generate_manifest
	 */
	async function generate_serverless_function(name, pattern, generate_manifest) {
		const tmp = builder.getBuildDirectory(`vercel-tmp/${name}`);
		const relativePath = posix.relative(tmp, builder.getServerDirectory());

		builder.copy(`${files}/serverless.js`, `${tmp}/serverless.js`, {
			replace: {
				SERVER: `${relativePath}/index.js`,
				MANIFEST: './manifest.js'
			}
		});

		write(
			`${tmp}/manifest.js`,
			`export const manifest = ${generate_manifest({ relativePath })};\n`
		);

		await esbuild.build({
			entryPoints: [`${tmp}/serverless.js`],
			outfile: `${dirs.functions}/${name}.func/index.js`,
			target: 'node14',
			bundle: true,
			platform: 'node',
			format: 'cjs',
			external
		});

		write(
			`${dirs.functions}/${name}.func/.vc-config.json`,
			JSON.stringify({
				runtime: 'nodejs14.x',
				handler: 'index.js',
				launcherType: 'Nodejs'
			})
		);

		write(`${dirs.functions}/${name}.func/package.json`, JSON.stringify({ type: 'commonjs' }));

		routes.push({ src: pattern, dest: `/${name}` });
	}

	/**
	 * @param {string} name
	 * @param {string} pattern
	 * @param {(options: { relativePath: string }) => string} generate_manifest
	 */
	async function generate_edge_function(name, pattern, generate_manifest) {
		const tmp = builder.getBuildDirectory(`vercel-tmp/${name}`);
		const relativePath = posix.relative(tmp, builder.getServerDirectory());

		builder.copy(`${files}/edge.js`, `${tmp}/edge.js`, {
			replace: {
				SERVER: `${relativePath}/index.js`,
				MANIFEST: './manifest.js'
			}
		});

		write(
			`${tmp}/manifest.js`,
			`export const manifest = ${generate_manifest({ relativePath })};\n`
		);

		await esbuild.build({
			entryPoints: [`${tmp}/edge.js`],
			outfile: `${dirs.functions}/${name}.func/index.js`,
			target: 'node14',
			bundle: true,
			platform: 'node',
			format: 'esm',
			external
		});

		write(
			`${dirs.functions}/${name}.func/.vc-config.json`,
			JSON.stringify({
				runtime: 'edge',
				entrypoint: 'index.js'
				// TODO expose envVarsInUse
			})
		);

		routes.push({ src: pattern, middlewarePath: name });
	}

	const generate_function = edge ? generate_edge_function : generate_serverless_function;

	if (split) {
		await builder.createEntries((route) => {
			return {
				id: route.pattern.toString(), // TODO is `id` necessary?
				filter: (other) => route.pattern.toString() === other.pattern.toString(),
				complete: async (entry) => {
					const src = `${route.pattern
						.toString()
						.slice(1, -2) // remove leading / and trailing $/
						.replace(/\\\//g, '/')}(?:/__data.json)?$`; // TODO adding /__data.json is a temporary workaround — those endpoints should be treated as distinct routes

					await generate_function(route.id, src, entry.generateManifest);
				}
			};
		});
	} else {
		await generate_function('render', '/.*', builder.generateManifest);
	}

	builder.log.minor('Copying assets...');

	builder.writeStatic(dirs.static);
	builder.writeClient(dirs.static);
	builder.writePrerendered(dirs.static);

	builder.log.minor('Writing routes...');

	/** @type {Record<string, { path: string }>} */
	const overrides = {};
	builder.prerendered.pages.forEach((page, src) => {
		overrides[page.file] = { path: src.slice(1) };
	});

	write(
		`${dir}/config.json`,
		JSON.stringify({
			version: 3,
			routes,
			overrides
		})
	);
}

/**
 * @param {string} file
 * @param {string} data
 */
function write(file, data) {
	try {
		mkdirSync(dirname(file), { recursive: true });
	} catch {
		// do nothing
	}

	writeFileSync(file, data);
}
