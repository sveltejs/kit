import fs from 'fs';

/**
 * @typedef {{
 *   name: string;
 *   test: () => boolean;
 *   defaults: () => {
 *     pages?: string;
 *     assets?: string;
 *     fallback?: string;
 *     precompress?: boolean;
 *   };
 *   done: (builder: import('@sveltejs/kit').Builder) => void;
 * }}
 * Platform */

/** @type {Platform[]} */
export const platforms = [
	{
		// Build Output API
		// TODO remove the ENABLE_VC_BUILD check when no longer required
		name: 'Vercel',
		test: () => !!process.env.VERCEL && !!process.env.ENABLE_VC_BUILD,
		defaults: () => ({
			pages: '.vercel/output/static',
			assets: '.vercel/output/static'
		}),
		done: (builder) => {
			/** @type {Record<string, { path: string }>} */
			const overrides = {};
			builder.prerendered.pages.forEach((page, src) => {
				overrides[page.file] = { path: src.slice(1) };
			});

			fs.writeFileSync(
				'.vercel/output/config.json',
				JSON.stringify({
					version: 3,
					routes: [
						...Array.from(builder.prerendered.redirects, ([src, redirect]) => ({
							src,
							headers: {
								Location: redirect.location
							},
							status: redirect.status
						})),
						{
							src: `/${builder.config.kit.appDir}/immutable/.+`,
							headers: {
								'cache-control': 'public, immutable, max-age=31536000'
							}
						},
						{
							handle: 'filesystem'
						}
					],
					overrides
				})
			);
		}
	},
	{
		// Legacy filesystem API
		// TODO remove once Build Output API leaves beta
		name: 'Vercel',
		test: () => !!process.env.VERCEL,
		defaults: () => ({
			pages: '.vercel_build_output/static',
			assets: '.vercel_build_output/static'
		}),
		done: (builder) => {
			if (!fs.existsSync('.vercel_build_output/config')) {
				fs.mkdirSync('.vercel_build_output/config');
			}

			fs.writeFileSync(
				'.vercel_build_output/config/routes.json',
				JSON.stringify([
					...Array.from(builder.prerendered.pages, ([src, page]) => ({
						src,
						dest: page.file
					})),
					...Array.from(builder.prerendered.redirects, ([src, redirect]) => ({
						src,
						headers: {
							Location: redirect.location
						},
						status: redirect.status
					})),
					{
						src: `/${builder.config.kit.appDir}/immutable/.+`,
						headers: {
							'cache-control': 'public, immutable, max-age=31536000'
						}
					},
					{
						handle: 'filesystem'
					}
				])
			);
		}
	}
];
