import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Needed for PostCSS preprocessing, that is needed for legacy CSS support via `postcss-preset-env`.
	preprocess: preprocess(),

	kit: {
		adapter: adapter()
	},

	vitePlugin: {
		experimental: {
			inspector: {
				holdMode: true
			}
		}
	}
};

export default config;
