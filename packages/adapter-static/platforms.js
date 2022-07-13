import fs from 'fs';

/**
 * @typedef {{
 *   name: string;
 *   test: () => boolean;
 *   defaults: (config: any) => import('./index').AdapterOptions; // TODO
 *   done: (builder: import('@sveltejs/kit').Builder) => void;
 * }}
 * Platform */

/** @param {import('@sveltejs/kit').Builder} builder */
function vercel_routes(builder) {
	/** @type {any[]} */
	const routes = [
		{
			src: `/${builder.config.kit.appDir}/immutable/.+`,
			headers: {
				'cache-control': 'public, immutable, max-age=31536000'
			}
		}
	];

	// explicit redirects
	for (const [src, redirect] of builder.prerendered.redirects) {
		routes.push({
			src,
			headers: {
				Location: redirect.location
			},
			status: redirect.status
		});
	}

	// prerendered pages
	for (const [src, page] of builder.prerendered.pages) {
		routes.push({
			src,
			dest: `${builder.config.kit.appDir}/prerendered/${page.file}`
		});
	}

	// implicit redirects (trailing slashes)
	for (const [src] of builder.prerendered.pages) {
		if (src !== '/') {
			routes.push({
				src: src.endsWith('/') ? src.slice(0, -1) : src + '/',
				headers: {
					location: src
				},
				status: 308
			});
		}
	}

	routes.push({
		handle: 'filesystem'
	});

	return routes;
}

/** @type {Platform[]} */
export const platforms = [
	{
		// Build Output API
		// TODO remove the ENABLE_VC_BUILD check when no longer required
		name: 'Vercel',
		test: () => !!process.env.VERCEL && !!process.env.ENABLE_VC_BUILD,
		defaults: (config) => ({
			pages: `.vercel/output/static/${config.kit.appDir}/prerendered`,
			assets: '.vercel/output/static'
		}),
		done: (builder) => {
			fs.writeFileSync(
				'.vercel/output/config.json',
				JSON.stringify({
					version: 3,
					routes: vercel_routes(builder)
				})
			);
		}
	},
	{
		// Legacy filesystem API
		// TODO remove once Build Output API leaves beta
		name: 'Vercel',
		test: () => !!process.env.VERCEL,
		defaults: (config) => ({
			pages: `.vercel_build_output/static/${config.kit.appDir}/prerendered`,
			assets: '.vercel_build_output/static'
		}),
		done: (builder) => {
			if (!fs.existsSync('.vercel_build_output/config')) {
				fs.mkdirSync('.vercel_build_output/config');
			}

			fs.writeFileSync(
				'.vercel_build_output/config/routes.json',
				JSON.stringify(vercel_routes(builder))
			);
		}
	}
];
