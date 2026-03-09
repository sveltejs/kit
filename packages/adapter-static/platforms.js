import fs from 'node:fs';
import process from 'node:process';

/**
 * @typedef {{
 *   name: string;
 *   test: () => boolean;
 *   defaults: import('./index.js').AdapterOptions;
 *   done: (builder: import('@sveltejs/kit').Builder) => void;
 * }}
 * Platform */

// This function is duplicated in adapter-vercel
/** @param {import('@sveltejs/kit').Builder} builder */
function static_vercel_config(builder) {
	/** @type {any[]} */
	const prerendered_redirects = [];

	/** @type {Record<string, { path: string }>} */
	const overrides = {};

	for (const [src, redirect] of builder.prerendered.redirects) {
		prerendered_redirects.push({
			src,
			headers: {
				Location: redirect.location
			},
			status: redirect.status
		});
	}

	for (const [path, page] of builder.prerendered.pages) {
		if (path.endsWith('/') && path !== '/') {
			prerendered_redirects.push(
				{ src: path, dest: path.slice(0, -1) },
				{ src: path.slice(0, -1), status: 308, headers: { Location: path } }
			);

			overrides[page.file] = { path: path.slice(1, -1) };
		} else {
			overrides[page.file] = { path: path.slice(1) };
		}
	}

	return {
		version: 3,
		routes: [
			...prerendered_redirects,
			{
				src: `/${builder.getAppPath()}/immutable/.+`,
				headers: {
					'cache-control': 'public, immutable, max-age=31536000'
				}
			},
			{
				handle: 'filesystem'
			}
		],
		overrides
	};
}

/** @type {Platform[]} */
export const platforms = [
	{
		name: 'Vercel',
		test: () => !!process.env.VERCEL,
		defaults: {
			pages: '.vercel/output/static'
		},
		done: (builder) => {
			const config = static_vercel_config(builder);
			fs.writeFileSync('.vercel/output/config.json', JSON.stringify(config, null, '  '));
		}
	}
];
