import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nodeFileTrace } from '@vercel/nft';
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

const files = fileURLToPath(new URL('./files', import.meta.url).href);

/** @type {import('.').default} **/
export default function ({ external = [], edge, split } = {}) {
	return {
		name: '@sveltejs/adapter-vercel',

		async adapt(builder) {
			if (process.env.ENABLE_VC_BUILD) {
				await v3(builder, external, edge, split);
			} else {
				if (edge || split) {
					throw new Error('`edge` and `split` options can only be used with ENABLE_VC_BUILD');
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
	const node_version = get_node_version();

	const dir = '.vercel_build_output';

	const tmp = builder.getBuildDirectory('vercel-tmp');

	builder.rimraf(dir);
	builder.rimraf(tmp);

	const dirs = {
		static: `${dir}/static`,
		lambda: `${dir}/functions/node/render`
	};

	builder.log.minor('Generating serverless function...');

	const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

	builder.copy(`${files}/serverless.js`, `${tmp}/serverless.js`, {
		replace: {
			SERVER: `${relativePath}/index.js`,
			MANIFEST: './manifest.js'
		}
	});

	fs.writeFileSync(
		`${tmp}/manifest.js`,
		`export const manifest = ${builder.generateManifest({
			relativePath
		})};\n`
	);

	await esbuild.build({
		entryPoints: [`${tmp}/serverless.js`],
		outfile: `${dirs.lambda}/index.js`,
		target: `node${node_version.full}`,
		bundle: true,
		platform: 'node',
		external,
		format: 'cjs'
	});

	fs.writeFileSync(`${dirs.lambda}/package.json`, JSON.stringify({ type: 'commonjs' }));

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

	fs.writeFileSync(
		`${dir}/config/routes.json`,
		JSON.stringify([
			...redirects[builder.config.kit.trailingSlash],
			...prerendered_pages,
			...prerendered_redirects,
			{
				src: `/${builder.config.kit.appDir}/immutable/.+`,
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
	const node_version = get_node_version();

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
		const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

		builder.copy(`${files}/serverless.js`, `${tmp}/index.js`, {
			replace: {
				SERVER: `${relativePath}/index.js`,
				MANIFEST: './manifest.js'
			}
		});

		write(
			`${tmp}/manifest.js`,
			`export const manifest = ${generate_manifest({ relativePath })};\n`
		);

		await create_function_bundle(
			`${tmp}/index.js`,
			`${dirs.functions}/${name}.func`,
			`nodejs${node_version.major}.x`
		);

		routes.push({ src: pattern, dest: `/${name}` });
	}

	/**
	 * @param {string} name
	 * @param {string} pattern
	 * @param {(options: { relativePath: string }) => string} generate_manifest
	 */
	async function generate_edge_function(name, pattern, generate_manifest) {
		const tmp = builder.getBuildDirectory(`vercel-tmp/${name}`);
		const relativePath = path.posix.relative(tmp, builder.getServerDirectory());

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
			target: 'es2020', // TODO verify what the edge runtime supports
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

		routes.push({ src: pattern, dest: `/${name}` });
	}

	const generate_function = edge ? generate_edge_function : generate_serverless_function;

	if (split) {
		await builder.createEntries((route) => {
			return {
				id: route.pattern.toString(), // TODO is `id` necessary?
				filter: (other) => route.pattern.toString() === other.pattern.toString(),
				complete: async (entry) => {
					let sliced_pattern = route.pattern
						.toString()
						// remove leading / and trailing $/
						.slice(1, -2)
						// replace escaped \/ with /
						.replace(/\\\//g, '/');

					// replace the root route "^/" with "^/?"
					if (sliced_pattern === '^/') {
						sliced_pattern = '^/?';
					}

					const src = `${sliced_pattern}(?:/__data.json)?$`; // TODO adding /__data.json is a temporary workaround — those endpoints should be treated as distinct routes

					await generate_function(route.id || 'index', src, entry.generateManifest);
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
		fs.mkdirSync(path.dirname(file), { recursive: true });
	} catch {
		// do nothing
	}

	fs.writeFileSync(file, data);
}

function get_node_version() {
	const full = process.version.slice(1); // 'v16.5.0' --> '16.5.0'
	const major = parseInt(full.split('.')[0]); // '16.5.0' --> 16

	if (major < 16) {
		throw new Error(
			`SvelteKit only supports Node.js version 16 or greater (currently using v${full}). Consult the documentation: https://vercel.com/docs/runtimes#official-runtimes/node-js/node-js-version`
		);
	}

	return { major, full };
}

/**
 * @param {string} entry
 * @param {string} dir
 * @param {string} runtime
 */
async function create_function_bundle(entry, dir, runtime) {
	let base = entry;
	while (base !== (base = path.dirname(base)));

	const traced = await nodeFileTrace([entry], { base });

	traced.warnings.forEach((error) => {
		// pending https://github.com/vercel/nft/issues/284
		if (error.message.startsWith('Failed to resolve dependency node:')) return;
		console.error(error);
	});

	// find common ancestor directory
	let common_parts;

	for (const file of traced.fileList) {
		if (common_parts) {
			const parts = file.split(path.sep);

			for (let i = 0; i < common_parts.length; i += 1) {
				if (parts[i] !== common_parts[i]) {
					common_parts = common_parts.slice(0, i);
					break;
				}
			}
		} else {
			common_parts = path.dirname(file).split(path.sep);
		}
	}

	const ancestor = base + common_parts.join(path.sep);

	for (const file of traced.fileList) {
		const source = base + file;
		const dest = path.join(dir, path.relative(ancestor, source));

		const stats = fs.statSync(source);
		const is_dir = stats.isDirectory();

		const realpath = fs.realpathSync(source);

		try {
			fs.mkdirSync(path.dirname(dest), { recursive: true });
		} catch {
			// do nothing
		}

		if (source !== realpath) {
			const realdest = path.join(dir, path.relative(ancestor, realpath));
			fs.symlinkSync(path.relative(path.dirname(dest), realdest), dest, is_dir ? 'dir' : 'file');
		} else if (!is_dir) {
			fs.copyFileSync(source, dest);
		}
	}

	write(
		`${dir}/.vc-config.json`,
		JSON.stringify({
			runtime,
			handler: path.relative(base + ancestor, entry),
			launcherType: 'Nodejs'
		})
	);

	write(`${dir}/package.json`, JSON.stringify({ type: 'module' }));
}
