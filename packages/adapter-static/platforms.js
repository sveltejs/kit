import fs from 'node:fs';
import process from 'node:process';

/**
 * @typedef {{
 *   name: string;
 *   test: () => boolean;
 *   defaults: import('./index.js').AdapterOptions;
 *   done: (builder: import('./internal.js').Builder2_0_0) => void;
 * }}
 * Platform */

// This function is duplicated in adapter-vercel
/**
 * Escapes a pathname so that it can be matched literally by a Vercel route `src` regex
 * @param {string} pathname
 */
function escape_src(pathname) {
	// hex escapes rather than backslash escapes, since Vercel only appends the `$` anchor
	// if `src` doesn't already end with `$`, and it replaces `\/` with `/`
	return pathname.replace(
		/[.*+?^${}()|[\]\\]/g,
		(char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`
	);
}

// This function is duplicated in adapter-vercel
/** @param {import('./internal.js').Builder2_0_0} builder */
function static_vercel_config(builder) {
	/** @type {any[]} */
	const prerendered_redirects = [];

	/** @type {Record<string, { path: string }>} */
	const overrides = {};

	for (const [path, redirect] of builder.prerendered.redirects) {
		prerendered_redirects.push({
			src: escape_src(path),
			headers: {
				Location: redirect.location
			},
			status: redirect.status
		});
	}

	for (const [path, page] of builder.prerendered.pages) {
		if (path.endsWith('/') && path !== '/') {
			prerendered_redirects.push(
				{ src: escape_src(path), dest: path.slice(0, -1) },
				{ src: escape_src(path.slice(0, -1)), status: 308, headers: { Location: path } }
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
