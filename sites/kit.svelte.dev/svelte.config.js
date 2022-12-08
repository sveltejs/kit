import adapter from '@sveltejs/adapter-auto';
import importAssets from 'svelte-preprocess-import-assets';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		importAssets({
			sources: (defaultSources) => {
				return [
					...defaultSources,
					{
						tag: 'Image',
						srcAttributes: ['src']
					}
				]
			}
		})
	],
	kit: {
		adapter: adapter(),

		alias: {
			'@sveltejs/site-kit': '../site-kit/src/lib'
		}
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
