import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		adapter: adapter(),
		i18n: {
			defaultLocale: 'en',
			locales: ['en', 'de']
		}
	}
};

export default config;
