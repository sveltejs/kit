import { resolve } from 'node:path';
import process from 'node:process';

/**
 * @typedef {{ rest: boolean, dynamic: boolean, content: string }} RouteSegment
 */

/**
 * @typedef {{
 *   build?: { publish?: string }
 *   functions?: { node_bundler?: 'zisi' | 'esbuild' }
 * }} NetlifyConfig
 */

/**
 * @param {RouteSegment[]} a
 * @param {RouteSegment[]} b
 * @returns {boolean}
 */
export function matches(a, b) {
	if (a[0] && b[0]) {
		if (b[0].rest) {
			if (b.length === 1) return true;

			const next_b = b.slice(1);

			for (let i = 0; i < a.length; i += 1) {
				if (matches(a.slice(i), next_b)) return true;
			}

			return false;
		}

		if (!b[0].dynamic) {
			if (!a[0].dynamic && a[0].content !== b[0].content) return false;
		}

		if (a.length === 1 && b.length === 1) return true;
		return matches(a.slice(1), b.slice(1));
	} else if (a[0]) {
		return a.length === 1 && a[0].rest;
	} else {
		return b.length === 1 && b[0].rest;
	}
}

/**
 * @param {NetlifyConfig | null} netlify_config
 * @param {import('@sveltejs/kit').Builder} builder
 * @returns {string | undefined}
 */
export function get_publish_directory(netlify_config, builder) {
	if (netlify_config) {
		if (!netlify_config.build?.publish) {
			builder.log.minor('No publish directory specified in netlify.toml, using default');
			return;
		}

		if (resolve(netlify_config.build.publish) === process.cwd()) {
			throw new Error(
				'The publish directory cannot be set to the site root. Please change it to another value such as "build" in netlify.toml.'
			);
		}
		return netlify_config.build.publish;
	}

	builder.log.warn(
		'No netlify.toml found. Using default publish directory. Consult https://svelte.dev/docs/kit/adapter-netlify#usage for more details'
	);
}
